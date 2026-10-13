<?php

namespace Database\Seeders;

use App\Models\Signatory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Schema;

class SignatorySeeder extends Seeder
{
    /**
     * The officers in office when each printable was added. A role is seeded only
     * when it has nobody yet, so a Library edit is never overwritten.
     */
    public function run(): void
    {
        $this->seedRole('allied_health_chief', [
            'name' => 'DR. JAIME KRISTOFFER T. PUNZALAN, MPH',
            'title' => "OIC Designate - Chief of Allied Health\nProfessional Services",
        ]);

        // The column arrives in a later migration than the table.
        if (Schema::hasColumn('signatories', 'license_no')) {
            $this->seedRole('mswd_head', [
                'name' => 'CRISELDA A. PALOMO, RSW',
                'title' => 'Head of the Medical Social Work Department',
                'license_no' => '0010989',
            ]);
        }
    }

    /** @param array<string, string> $attributes */
    private function seedRole(string $role, array $attributes): void
    {
        if (Signatory::withTrashed()->where('role', $role)->exists()) {
            return;
        }

        Signatory::create([...$attributes, 'role' => $role, 'is_active' => true]);
    }
}
