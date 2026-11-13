<?php

namespace App\Support;

use App\Models\PsgcArea;
use App\Rules\PsgcBarangayInCity;
use Illuminate\Validation\Rule;
use InvalidArgumentException;

/**
 * An address picked from the Philippine Standard Geographic Code: a free-text
 * line (house, street, purok) plus a PSGC city or municipality and one of its
 * barangays. The region and province come from the city.
 *
 * Every structured address sits beside a composed string column that PDFs and
 * screens keep reading. For a composed column `{base}` the columns are
 * `{base}_line`, `{base}_region_code`, `{base}_province_code`,
 * `{base}_city_code` and `{base}_barangay_code`. Clients send `{base}_line`,
 * `{base}_city_code` and `{base}_barangay_code`; the server fills in the rest
 * and writes `{base}`. docs/PSGC_ADDRESS_PLAN.md.
 */
final class PsgcAddress
{
    private function __construct(
        public readonly ?string $line,
        public readonly PsgcArea $city,
        public readonly PsgcArea $barangay,
    ) {}

    /**
     * @throws InvalidArgumentException when the city or barangay is unknown, or
     *                                  the barangay is not in the city
     */
    public static function resolve(?string $line, string $cityCode, string $barangayCode): self
    {
        $city = PsgcArea::query()
            ->with(['province', 'city'])
            ->where('level', PsgcArea::CITY)
            ->find($cityCode);

        $barangay = PsgcArea::query()
            ->where('level', PsgcArea::BARANGAY)
            ->find($barangayCode);

        if (! $city || ! $barangay || $barangay->city_code !== $city->code) {
            throw new InvalidArgumentException("{$barangayCode} is not a barangay of PSGC city {$cityCode}.");
        }

        $line = trim((string) $line);

        return new self($line === '' ? null : $line, $city, $barangay);
    }

    /**
     * The patient's older loose residence columns, which the PDFs and the
     * registry search still read: `address` is the line.
     *
     * @return array<string, string|null>
     */
    public function residenceColumns(): array
    {
        return [
            'address' => $this->line,
            'barangay' => $this->barangay->name,
            'municipality' => $this->city->cityLabel(),
            'province' => $this->provinceName(),
        ];
    }

    /** The province's name; null for an independent city or NCR. */
    public function provinceName(): ?string
    {
        return $this->city->province?->name;
    }

    /**
     * "Purok 2, Tetuan, City of Zamboanga" or
     * "123 Rizal St., Poblacion, Aurora, Zamboanga del Sur".
     */
    public function display(): string
    {
        return collect([$this->line, $this->barangay->name, $this->city->cityLabel(), $this->provinceName()])
            ->filter()
            ->join(', ');
    }

    /**
     * The columns to write for this address under `{base}`, the composed
     * string included.
     *
     * @return array<string, string|null>
     */
    public function columns(string $base): array
    {
        return [
            $base => $this->display(),
            "{$base}_line" => $this->line,
            "{$base}_region_code" => $this->city->region_code,
            "{$base}_province_code" => $this->city->province_code,
            "{$base}_city_code" => $this->city->code,
            "{$base}_barangay_code" => $this->barangay->code,
        ];
    }

    /**
     * Columns that clear the address under `{base}`, composed string included.
     *
     * @return array<string, null>
     */
    public static function emptyColumns(string $base): array
    {
        return array_fill_keys(
            [$base, "{$base}_line", "{$base}_region_code", "{$base}_province_code", "{$base}_city_code", "{$base}_barangay_code"],
            null,
        );
    }

    /**
     * Validation rules for the three fields a client sends. Once any of them
     * is given, the city and barangay are both needed; sending all three as
     * null clears the address.
     *
     * @param  bool|string  $required  true for always, or a rule such as "required_with:watcher"
     * @param  string  $prefix  for nested input, e.g. "watcher." (keys become "watcher.address_city_code")
     * @return array<string, array<mixed>>
     */
    public static function rules(string $base, bool|string $required = false, string $prefix = ''): array
    {
        $line = "{$prefix}{$base}_line";
        $city = "{$prefix}{$base}_city_code";
        $barangay = "{$prefix}{$base}_barangay_code";
        $always = is_string($required) ? $required : ($required ? 'required' : null);

        return [
            $line => ['nullable', 'string', 'max:255'],
            $city => [
                $always ?? "required_with:{$line},{$barangay}",
                'nullable',
                'string',
                Rule::exists('psgc_areas', 'code')->where('level', PsgcArea::CITY),
            ],
            $barangay => [
                $always ?? "required_with:{$city}",
                'nullable',
                'string',
                new PsgcBarangayInCity($city),
            ],
        ];
    }

    /**
     * Whether validated input sends this address at all. An update that does
     * not send it leaves it alone.
     *
     * @param  array<string, mixed>  $input
     */
    public static function touches(array $input, string $base): bool
    {
        return (bool) array_intersect(
            ["{$base}_line", "{$base}_city_code", "{$base}_barangay_code"],
            array_keys($input),
        );
    }

    /**
     * The address in validated input, or null when it is being cleared (no
     * city or barangay).
     *
     * @param  array<string, mixed>  $input
     */
    public static function fromInput(array $input, string $base): ?self
    {
        $cityCode = $input["{$base}_city_code"] ?? null;
        $barangayCode = $input["{$base}_barangay_code"] ?? null;

        if (blank($cityCode) || blank($barangayCode)) {
            return null;
        }

        return self::resolve($input["{$base}_line"] ?? null, (string) $cityCode, (string) $barangayCode);
    }

    /**
     * The columns to write from validated input, or [] when the input does not
     * touch this address (so an update leaves it alone).
     *
     * @param  array<string, mixed>  $input  validated input, at the level the keys sit
     * @return array<string, string|null>
     */
    public static function columnsFrom(array $input, string $base): array
    {
        if (! self::touches($input, $base)) {
            return [];
        }

        return self::fromInput($input, $base)?->columns($base) ?? self::emptyColumns($base);
    }

    /**
     * The structured parts as an API resource shows them, beside the composed
     * string. Labels come from the pickers' own lookups.
     *
     * @return array<string, string|null>
     */
    public static function resourceFields(object $model, string $base): array
    {
        return collect(['line', 'region_code', 'province_code', 'city_code', 'barangay_code'])
            ->mapWithKeys(fn (string $part) => ["{$base}_{$part}" => $model->{"{$base}_{$part}"}])
            ->all();
    }

    /**
     * Every column name of a structured address under `{base}`, for $fillable.
     *
     * @return list<string>
     */
    public static function columnNames(string $base): array
    {
        return array_keys(self::emptyColumns($base));
    }

    /**
     * A place that only names a city or municipality (place of birth):
     * `{base}_city_code` plus the composed "City, Province" in `{base}`.
     *
     * @param  array<string, mixed>  $input
     * @return array<string, string|null>
     */
    public static function cityColumnsFrom(array $input, string $base): array
    {
        $key = "{$base}_city_code";

        if (! array_key_exists($key, $input)) {
            return [];
        }

        if (blank($input[$key])) {
            return [$base => null, $key => null];
        }

        $city = PsgcArea::query()->with(['province', 'city'])->where('level', PsgcArea::CITY)->findOrFail($input[$key]);

        return [
            $base => collect([$city->cityLabel(), $city->province?->name])->filter()->join(', '),
            $key => $city->code,
        ];
    }

    /**
     * @return array<string, array<mixed>>
     */
    public static function cityRules(string $base): array
    {
        return [
            "{$base}_city_code" => ['nullable', 'string', Rule::exists('psgc_areas', 'code')->where('level', PsgcArea::CITY)],
        ];
    }
}
