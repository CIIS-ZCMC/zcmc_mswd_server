<?php

namespace App\Services;

use App\Models\PsgcArea;
use Closure;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;

/**
 * Keeps `psgc_areas` in step with the Philippine Standard Geographic Code.
 *
 * - load(): reads database/data/psgc.json.gz into the table. No internet;
 *   run on every deploy.
 * - fetch(): crawls PSGC Cloud and returns the rows for that file. Run by
 *   hand (`psgc:sync`) when PSA publishes an update.
 *
 * docs/PSGC_ADDRESS_PLAN.md.
 */
class PsgcCatalogService
{
    /** Column order of a row in the data file. */
    public const COLUMNS = ['code', 'level', 'kind', 'name', 'region_code', 'province_code', 'city_code', 'zip_code'];

    public static function defaultPath(): string
    {
        return database_path('data/psgc.json.gz');
    }

    /**
     * Upsert every area in the file. Areas no longer in it are retired, not
     * deleted, so addresses that use them keep their names.
     *
     * @return array{loaded: int, retired: int}
     */
    public function load(?string $path = null): array
    {
        $rows = $this->read($path ?? self::defaultPath());
        $now = Carbon::now();

        // Active areas the file no longer lists. Compared by code, not by
        // timestamp, so a reload in the same second still retires exactly these.
        $stale = array_values(array_diff(
            PsgcArea::query()->whereNull('retired_at')->pluck('code')->all(),
            array_column($rows, 0),
        ));

        DB::transaction(function () use ($rows, $now, $stale) {
            foreach (array_chunk($rows, 500) as $chunk) {
                PsgcArea::upsert(
                    array_map(fn (array $row) => [
                        ...array_combine(self::COLUMNS, $row),
                        'retired_at' => null,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ], $chunk),
                    ['code'],
                    [...array_diff(self::COLUMNS, ['code']), 'retired_at', 'updated_at'],
                );
            }

            foreach (array_chunk($stale, 500) as $codes) {
                PsgcArea::query()->whereIn('code', $codes)->update(['retired_at' => $now, 'updated_at' => $now]);
            }
        });

        return ['loaded' => count($rows), 'retired' => count($stale)];
    }

    /**
     * Crawl PSGC Cloud: regions, then each region's provinces and cities, then
     * each city's barangays (about 1,700 calls, paced under PSGC Cloud's 120 a
     * minute, so roughly 15 minutes). PSGC Cloud gives no province
     * for a city, so it is the city code's first five digits + "00000" when
     * that is a province; otherwise the city is independent. A Manila district
     * (SubMun) points the same way at the City of Manila.
     *
     * @param  (Closure(string): void)|null  $progress  told each step, for the console
     * @return list<list<string|null>>
     */
    public function fetch(?Closure $progress = null, int $delayMs = 550): array
    {
        $progress ??= fn () => null;
        $rows = [];
        $cities = [];

        foreach ($this->get('regions') as $region) {
            $regionCode = (string) $region['code'];
            $rows[] = [$regionCode, PsgcArea::REGION, null, trim($region['name']), null, null, null, null];

            $provinceCodes = [];
            foreach ($this->get("regions/{$regionCode}/provinces") as $province) {
                $provinceCodes[(string) $province['code']] = true;
                $rows[] = [(string) $province['code'], PsgcArea::PROVINCE, null, trim($province['name']), $regionCode, null, null, null];
            }

            $regionCities = $this->get("regions/{$regionCode}/cities-municipalities");
            $cityCodes = array_fill_keys(array_map(fn ($c) => (string) $c['code'], $regionCities), true);

            foreach ($regionCities as $city) {
                $code = (string) $city['code'];
                $parent = substr($code, 0, 5).'00000';
                $provinceCode = isset($provinceCodes[$parent]) ? $parent : null;
                $kind = $city['type'] ?? null;
                $parentCity = $kind === 'SubMun' && isset($cityCodes[$parent]) ? $parent : null;
                $zip = trim((string) ($city['zip_code'] ?? '')) ?: null;

                $rows[] = [$code, PsgcArea::CITY, $kind, trim($city['name']), $regionCode, $provinceCode, $parentCity, $zip];
                $cities[] = [$code, $regionCode, $provinceCode, trim($city['name'])];
            }

            $progress("Region {$region['name']}: ".count($regionCities).' cities and municipalities');
        }

        foreach ($cities as [$cityCode, $regionCode, $provinceCode, $cityName]) {
            foreach ($this->get("cities-municipalities/{$cityCode}/barangays") as $barangay) {
                $rows[] = [(string) $barangay['code'], PsgcArea::BARANGAY, null, trim($barangay['name']), $regionCode, $provinceCode, $cityCode, null];
            }

            $progress("Barangays of {$cityName}");

            if ($delayMs > 0) {
                usleep($delayMs * 1000);
            }
        }

        return $rows;
    }

    /**
     * @param  list<list<string|null>>  $rows
     */
    public function write(array $rows, ?string $path = null): void
    {
        $path ??= self::defaultPath();

        if (! is_dir(dirname($path))) {
            mkdir(dirname($path), 0755, true);
        }

        $json = json_encode([
            'source' => config('services.psgc.base_url'),
            'fetched_at' => Carbon::now()->toIso8601String(),
            'columns' => self::COLUMNS,
            'rows' => $rows,
        ], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);

        file_put_contents($path, gzencode($json, 9));
    }

    /**
     * @return list<list<string|null>>
     */
    private function read(string $path): array
    {
        if (! is_file($path)) {
            throw new RuntimeException("No PSGC data file at {$path}. Run `php artisan psgc:sync` where the internet is reachable.");
        }

        $raw = file_get_contents($path);
        $json = str_ends_with($path, '.gz') ? gzdecode((string) $raw) : $raw;
        $data = json_decode((string) $json, true);

        if (! is_array($data) || ($data['columns'] ?? null) !== self::COLUMNS || ! is_array($data['rows'] ?? null)) {
            throw new RuntimeException("{$path} is not a PSGC data file.");
        }

        return $data['rows'];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function get(string $path): array
    {
        $response = $this->http()->get($path)->throw();
        $body = $response->json();

        if (! is_array($body)) {
            throw new RuntimeException("PSGC Cloud did not return a list for {$path}.");
        }

        return array_values($body);
    }

    private function http(): PendingRequest
    {
        return Http::baseUrl(rtrim((string) config('services.psgc.base_url'), '/'))
            ->acceptJson()
            ->timeout((int) config('services.psgc.timeout', 30))
            // PSGC Cloud allows 120 requests a minute. On a 429, wait as long
            // as it asks (or a minute) before trying again.
            ->retry(5, function (int $attempt, Throwable $e): int {
                if ($e instanceof RequestException && $e->response->status() === 429) {
                    $after = (int) $e->response->header('Retry-After');

                    return ($after > 0 ? $after : 60) * 1000;
                }

                return 1000 * $attempt;
            });
    }
}
