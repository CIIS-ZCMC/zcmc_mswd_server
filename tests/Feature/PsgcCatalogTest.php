<?php

use App\Models\PsgcArea;
use App\Services\PsgcCatalogService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->file = tempnam(sys_get_temp_dir(), 'psgc').'.json.gz';
});

afterEach(function () {
    @unlink($this->file);
});

function fakePsgcCloud(): void
{
    config(['services.psgc.base_url' => 'https://psgc.test/api']);

    Http::fake([
        'psgc.test/api/regions' => Http::response([
            ['name' => 'Region IX (Zamboanga Peninsula)', 'code' => '0900000000'],
            ['name' => 'National Capital Region (NCR)', 'code' => '1300000000'],
        ]),
        'psgc.test/api/regions/0900000000/provinces' => Http::response([
            ['name' => 'Zamboanga del Sur', 'code' => '0907300000'],
        ]),
        'psgc.test/api/regions/1300000000/provinces' => Http::response([]),
        'psgc.test/api/regions/0900000000/cities-municipalities' => Http::response([
            ['name' => 'Aurora', 'code' => '0907302000', 'type' => 'Mun', 'zip_code' => '7015', 'district' => '2nd'],
            ['name' => 'City of Zamboanga', 'code' => '0931700000', 'type' => 'City', 'zip_code' => '', 'district' => '1st'],
        ]),
        'psgc.test/api/regions/1300000000/cities-municipalities' => Http::response([
            ['name' => 'City of Manila', 'code' => '1380600000', 'type' => 'City', 'zip_code' => '', 'district' => 'Lone'],
            ['name' => 'Tondo I/II', 'code' => '1380601000', 'type' => 'SubMun', 'zip_code' => '', 'district' => '1st'],
        ]),
        'psgc.test/api/cities-municipalities/0907302000/barangays' => Http::response([
            ['name' => 'Poblacion', 'code' => '0907302001', 'status' => '1000'],
        ]),
        'psgc.test/api/cities-municipalities/0931700000/barangays' => Http::response([
            ['name' => 'Arena Blanco', 'code' => '0931700001', 'status' => '13671'],
            ['name' => 'Ayala ', 'code' => '0931700002', 'status' => '26658'],
        ]),
        'psgc.test/api/cities-municipalities/1380600000/barangays' => Http::response([]),
        'psgc.test/api/cities-municipalities/1380601000/barangays' => Http::response([
            ['name' => 'Barangay 1', 'code' => '1380601001', 'status' => '2995'],
        ]),
    ]);
}

it('crawls PSGC Cloud and works out each city\'s province', function () {
    fakePsgcCloud();

    $rows = collect(app(PsgcCatalogService::class)->fetch(delayMs: 0))
        ->map(fn ($row) => array_combine(PsgcCatalogService::COLUMNS, $row))
        ->keyBy('code');

    expect($rows)->toHaveCount(11)
        // A municipality belongs to the province its code starts with.
        ->and($rows['0907302000'])->toMatchArray(['level' => 'city', 'kind' => 'Mun', 'province_code' => '0907300000', 'zip_code' => '7015'])
        // An independent city has no province.
        ->and($rows['0931700000'])->toMatchArray(['province_code' => null, 'zip_code' => null])
        // A Manila district points at the City of Manila.
        ->and($rows['1380601000'])->toMatchArray(['kind' => 'SubMun', 'city_code' => '1380600000', 'province_code' => null])
        // Barangays carry their city, province and region, with names trimmed.
        ->and($rows['0907302001'])->toMatchArray(['level' => 'barangay', 'city_code' => '0907302000', 'province_code' => '0907300000', 'region_code' => '0900000000'])
        ->and($rows['0931700002']['name'])->toBe('Ayala');
});

it('writes the data file and loads it, retiring areas no longer listed', function () {
    fakePsgcCloud();
    $psgc = app(PsgcCatalogService::class);
    $rows = $psgc->fetch(delayMs: 0);
    $psgc->write($rows, $this->file);

    PsgcArea::create(['code' => '0999999001', 'level' => 'barangay', 'name' => 'Gone']);

    expect($psgc->load($this->file))->toBe(['loaded' => 11, 'retired' => 1])
        ->and(PsgcArea::active()->count())->toBe(11)
        ->and(PsgcArea::find('0999999001')->retired_at)->not->toBeNull();

    // Loading again changes nothing and brings nothing back.
    expect($psgc->load($this->file))->toBe(['loaded' => 11, 'retired' => 0]);
});

it('loads through the console command, and says so when the file is missing', function () {
    fakePsgcCloud();
    $psgc = app(PsgcCatalogService::class);
    $psgc->write($psgc->fetch(delayMs: 0), $this->file);

    $this->artisan('psgc:load', ['--file' => $this->file])
        ->expectsOutputToContain('Loaded 11 PSGC areas')
        ->assertSuccessful();

    $this->artisan('psgc:load', ['--file' => $this->file.'.missing'])
        ->expectsOutputToContain('No PSGC data file')
        ->assertFailed();
});
