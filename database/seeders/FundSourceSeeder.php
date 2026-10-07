<?php

namespace Database\Seeders;

use App\Models\FundSource;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Schema;

class FundSourceSeeder extends Seeder
{
    /**
     * Fund sources, code => name. The first eight are the UIS §V values assessments
     * already store in `fund_source`; the rest came from the former Assistance Sources
     * that guarantee breakdown lines name.
     */
    public const SOURCES = [
        'mswd' => 'MSWD',
        'maip' => 'MAIP',
        'malasakit' => 'Malasakit',
        'pcso' => 'PCSO',
        'lgu_dswd' => 'LGU-DSWD',
        'ngo' => 'NGO',
        'philhealth' => 'PhilHealth',
        'personal' => 'Personal',
        'city_mayor' => 'City Mayor Assistance',
        'city_council' => 'City Council Assistance',
        'congressional' => 'Congressional Assistance',
        'senatorial' => 'Senatorial Assistance',
        'governor' => 'Governor Assistance',
        'others' => 'Others',
    ];

    /** The UIS §V values that predate the merge. */
    private const UIS_CODES = ['mswd', 'maip', 'malasakit', 'pcso', 'lgu_dswd', 'ngo', 'philhealth', 'personal'];

    /** Sources whose breakdown lines must say what they are. */
    public const REQUIRES_SPECIFY = ['others'];

    public function run(): void
    {
        // The create-table migration runs this before `requires_specify` exists.
        $hasSpecify = Schema::hasColumn('fund_sources', 'requires_specify');
        $order = 0;

        foreach (self::SOURCES as $code => $name) {
            $order++;

            // The former Assistance Sources arrive with the merge migration, once the
            // column exists, so "Others" is created with its flag set.
            if (! $hasSpecify && ! in_array($code, self::UIS_CODES, true)) {
                continue;
            }

            $attributes = ['name' => $name, 'sort_order' => $order];

            if ($hasSpecify) {
                $attributes['requires_specify'] = in_array($code, self::REQUIRES_SPECIFY, true);
            }

            // withTrashed: a deleted row keeps its code (unique), so never re-create it.
            FundSource::withTrashed()->firstOrCreate(['code' => $code], $attributes);
        }
    }
}
