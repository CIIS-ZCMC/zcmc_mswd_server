<?php

namespace Database\Seeders;

use App\Models\FundSource;
use Illuminate\Database\Seeder;

class FundSourceSeeder extends Seeder
{
    /**
     * UIS §V fund sources, code => name. The codes are the values assessments already
     * store in `fund_source`, so existing records stay valid.
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
    ];

    public function run(): void
    {
        $order = 0;

        foreach (self::SOURCES as $code => $name) {
            FundSource::firstOrCreate(
                ['code' => $code],
                ['name' => $name, 'sort_order' => ++$order],
            );
        }
    }
}
