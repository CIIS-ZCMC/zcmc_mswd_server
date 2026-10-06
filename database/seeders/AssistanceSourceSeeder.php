<?php

namespace Database\Seeders;

use App\Models\AssistanceSource;
use Illuminate\Database\Seeder;

class AssistanceSourceSeeder extends Seeder
{
    public function run(): void
    {
        $sources = [
            'city_mayor' => ['City Mayor Assistance', false],
            'city_council' => ['City Council Assistance', false],
            'congressional' => ['Congressional Assistance', false],
            'senatorial' => ['Senatorial Assistance', false],
            'governor' => ['Governor Assistance', false],
            'others' => ['Others', true],
        ];

        foreach ($sources as $code => [$name, $requiresSpecify]) {
            AssistanceSource::firstOrCreate(
                ['code' => $code],
                ['name' => $name, 'requires_specify' => $requiresSpecify],
            );
        }
    }
}
