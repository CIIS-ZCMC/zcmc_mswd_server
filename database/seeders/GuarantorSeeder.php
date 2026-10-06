<?php

namespace Database\Seeders;

use App\Models\Guarantor;
use Illuminate\Database\Seeder;

class GuarantorSeeder extends Seeder
{
    public function run(): void
    {
        // The guarantors table has no code column, so the name is the natural key.
        foreach (['MAIFIP', 'PCSO', 'DSWD'] as $name) {
            Guarantor::firstOrCreate(['name' => $name]);
        }
    }
}
