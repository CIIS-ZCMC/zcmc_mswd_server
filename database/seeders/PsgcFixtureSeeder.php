<?php

namespace Database\Seeders;

use App\Models\PsgcArea;
use Illuminate\Database\Seeder;

/**
 * A handful of PSGC areas for tests, instead of the full 45,000-row load:
 * - an independent city with no province (Zamboanga City);
 * - a municipality in a province (Aurora, Zamboanga del Sur);
 * - a Manila district (Tondo I/II) under the City of Manila, which itself has
 *   no barangays.
 */
class PsgcFixtureSeeder extends Seeder
{
    public const REGION_IX = '0900000000';

    public const ZAMBOANGA_DEL_SUR = '0907300000';

    public const ZAMBOANGA_CITY = '0931700000';

    public const ARENA_BLANCO = '0931700001';

    public const AYALA = '0931700002';

    public const BALIWASAN = '0931700004';

    public const AURORA = '0907302000';

    public const AURORA_POBLACION = '0907302001';

    public const NCR = '1300000000';

    public const CITY_OF_MANILA = '1380600000';

    public const TONDO = '1380601000';

    public const TONDO_BARANGAY_1 = '1380601001';

    public function run(): void
    {
        $areas = [
            [self::REGION_IX, 'region', null, 'Region IX (Zamboanga Peninsula)', null, null, null],
            [self::ZAMBOANGA_DEL_SUR, 'province', null, 'Zamboanga del Sur', self::REGION_IX, null, null],
            [self::ZAMBOANGA_CITY, 'city', 'City', 'City of Zamboanga', self::REGION_IX, null, null],
            [self::ARENA_BLANCO, 'barangay', null, 'Arena Blanco', self::REGION_IX, null, self::ZAMBOANGA_CITY],
            [self::AYALA, 'barangay', null, 'Ayala', self::REGION_IX, null, self::ZAMBOANGA_CITY],
            [self::BALIWASAN, 'barangay', null, 'Baliwasan', self::REGION_IX, null, self::ZAMBOANGA_CITY],
            [self::AURORA, 'city', 'Mun', 'Aurora', self::REGION_IX, self::ZAMBOANGA_DEL_SUR, null],
            [self::AURORA_POBLACION, 'barangay', null, 'Poblacion', self::REGION_IX, self::ZAMBOANGA_DEL_SUR, self::AURORA],
            [self::NCR, 'region', null, 'National Capital Region (NCR)', null, null, null],
            [self::CITY_OF_MANILA, 'city', 'City', 'City of Manila', self::NCR, null, null],
            [self::TONDO, 'city', 'SubMun', 'Tondo I/II', self::NCR, null, self::CITY_OF_MANILA],
            [self::TONDO_BARANGAY_1, 'barangay', null, 'Barangay 1', self::NCR, null, self::TONDO],
        ];

        foreach ($areas as [$code, $level, $kind, $name, $region, $province, $city]) {
            PsgcArea::updateOrCreate(['code' => $code], [
                'level' => $level,
                'kind' => $kind,
                'name' => $name,
                'region_code' => $region,
                'province_code' => $province,
                'city_code' => $city,
            ]);
        }
    }
}
