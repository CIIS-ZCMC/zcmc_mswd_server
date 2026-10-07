<?php

namespace Database\Seeders;

use App\Models\ModeOfAssistance;
use Illuminate\Database\Seeder;

class ModeOfAssistanceSeeder extends Seeder
{
    /**
     * UIS §V modes of assistance, code => name. The codes are the values assessments
     * already store in `recommendation_mode`, so existing records stay valid.
     */
    public const MODES = [
        'financial_assistance' => 'Financial Assistance',
        'medical_assistance' => 'Medical Assistance',
        'counseling' => 'Counseling',
        'referral' => 'Referral',
        'hospital_discount' => 'Hospital Discount',
        'other' => 'Other',
    ];

    public function run(): void
    {
        $order = 0;

        foreach (self::MODES as $code => $name) {
            ModeOfAssistance::firstOrCreate(
                ['code' => $code],
                ['name' => $name, 'sort_order' => ++$order],
            );
        }
    }
}
