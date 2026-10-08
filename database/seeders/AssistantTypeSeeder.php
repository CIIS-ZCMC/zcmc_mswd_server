<?php

namespace Database\Seeders;

use App\Models\AssistantType;
use Illuminate\Database\Seeder;

class AssistantTypeSeeder extends Seeder
{
    /** Types of Assistance, code => [name, category]. */
    public const TYPES = [
        'medicines' => ['Medicines', 'medical'],
        'hospital_bills' => ['Hospital Bills', 'medical'],
        'laboratory' => ['Laboratory', 'medical'],
        'xray_ultrasound_diagnostics' => ['X-ray/Ultrasound/2D Echo/CT Scan/MRI', 'medical'],
        'supplies' => ['Supplies', 'medical'],
        'hemodialysis' => ['Hemodialysis', 'medical'],
        'rehab' => ['Rehab', 'medical'],
        'ecg' => ['ECG', 'medical'],
    ];

    public function run(): void
    {
        foreach (self::TYPES as $code => [$name, $category]) {
            // withTrashed: a deleted type keeps its code, so never re-create it.
            AssistantType::withTrashed()->firstOrCreate(
                ['code' => $code],
                ['name' => $name, 'category' => $category],
            );
        }
    }
}
