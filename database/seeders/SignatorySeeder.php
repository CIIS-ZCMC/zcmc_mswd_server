<?php

namespace Database\Seeders;

use App\Models\Signatory;
use Illuminate\Database\Seeder;

class SignatorySeeder extends Seeder
{
    /**
     * The officer in office when the Acknowledgement Slip was added. Seeded only
     * when the role has nobody yet, so a Library edit is never overwritten.
     */
    public function run(): void
    {
        if (Signatory::withTrashed()->where('role', 'allied_health_chief')->exists()) {
            return;
        }

        Signatory::create([
            'name' => 'DR. JAIME KRISTOFFER T. PUNZALAN, MPH',
            'title' => "OIC Designate - Chief of Allied Health\nProfessional Services",
            'role' => 'allied_health_chief',
            'is_active' => true,
        ]);
    }
}
