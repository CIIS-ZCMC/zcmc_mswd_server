<?php

namespace Database\Seeders;

use App\Models\TurnaroundTarget;
use Illuminate\Database\Seeder;

class TurnaroundTargetSeeder extends Seeder
{
    /**
     * Seed the Citizen's Charter placeholder turnaround time targets.
     * Existing stages retain whatever minutes MSWD configured.
     */
    public function run(): void
    {
        foreach (TurnaroundTarget::DEFAULT_TARGETS as $stage => $minutes) {
            TurnaroundTarget::firstOrCreate(
                ['stage' => $stage],
                ['minutes' => $minutes, 'is_active' => true]
            );
        }
    }
}
