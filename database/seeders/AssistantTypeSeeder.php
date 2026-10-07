<?php

namespace Database\Seeders;

use App\Models\AssistantType;
use Illuminate\Database\Seeder;

class AssistantTypeSeeder extends Seeder
{
    /** Types of Assistance, code => [name, category]. */
    public const TYPES = [
        'medicines' => ['Medicines', 'medical'],
        'hospital_bill' => ['Hospital Bill', 'medical'],
        'laboratory_diagnostics' => ['Laboratory / Diagnostics', 'medical'],
        'medical_supplies_devices' => ['Medical Supplies / Devices', 'medical'],
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
