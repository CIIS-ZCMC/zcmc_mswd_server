<?php

namespace App\Actions;

use App\Models\CaseModel;
use App\Models\MswdClassificationMatrix;

class CalculateMswdClassificationAction
{
    /**
     * @return array{
     *     net_per_capita_income: float,
     *     calculated_classification: string,
     *     calculated_discount_rate: float,
     *     max_assistance_cap: float|null
     * }
     */
    public function execute(
        ?float $totalFamilyIncome,
        float $expensesSum,
        ?CaseModel $case = null,
        int $familyMemberCount = 1
    ): array {
        $income = max(0, $totalFamilyIncome ?? 0.0);
        $expenses = max(0, $expensesSum);

        if ($case !== null) {
            $memberCount = $case->patient?->familyMembers()->count() ?? 0;
            // Household size includes patient + family members (or minimum 1)
            $householdSize = max(1, $memberCount + 1);
        } else {
            $householdSize = max(1, $familyMemberCount);
        }

        $netIncome = max(0, $income - $expenses);
        $netPerCapitaIncome = round($netIncome / $householdSize, 2);

        $matrices = MswdClassificationMatrix::whereNull('deleted_at')->get();

        $matched = null;
        foreach ($matrices as $matrix) {
            $min = $matrix->min_per_capita_income !== null ? (float) $matrix->min_per_capita_income : null;
            $max = $matrix->max_per_capita_income !== null ? (float) $matrix->max_per_capita_income : null;

            if ($min !== null && $max !== null) {
                if ($netPerCapitaIncome >= $min && $netPerCapitaIncome <= $max) {
                    $matched = $matrix;
                    break;
                }
            } elseif ($min !== null && $max === null) {
                if ($netPerCapitaIncome >= $min) {
                    $matched = $matrix;
                    break;
                }
            } elseif ($min === null && $max !== null) {
                if ($netPerCapitaIncome <= $max) {
                    $matched = $matrix;
                    break;
                }
            }
        }

        // Fallback if matrix is not yet seeded or outside ranges
        if ($matched === null) {
            $code = $netPerCapitaIncome > 10000 ? 'A' : ($netPerCapitaIncome > 7000 ? 'B' : ($netPerCapitaIncome > 5000 ? 'C1' : ($netPerCapitaIncome > 3000 ? 'C2' : 'C3')));
            $discountRate = match ($code) {
                'A' => 0.00,
                'B' => 25.00,
                'C1' => 50.00,
                'C2' => 75.00,
                default => 100.00,
            };

            return [
                'net_per_capita_income' => $netPerCapitaIncome,
                'calculated_classification' => $code,
                'calculated_discount_rate' => $discountRate,
                'max_assistance_cap' => null,
            ];
        }

        return [
            'net_per_capita_income' => $netPerCapitaIncome,
            'calculated_classification' => $matched->code,
            'calculated_discount_rate' => (float) $matched->discount_percentage,
            'max_assistance_cap' => $matched->max_assistance_cap !== null ? (float) $matched->max_assistance_cap : null,
        ];
    }
}

