<?php

namespace App\Services;

use App\Models\Assessment;
use App\Models\Patient;
use App\Support\UisExpenseSlots;

/**
 * Read model behind the patient-page Socio-Economic tab: the patient's household,
 * the newest intake assessment's income / living conditions / expense list, and a
 * short history of earlier intake assessments for the trend.
 *
 * "Intake assessment" is the same row the UIS uses (social_case_status IS NULL); a
 * case promoted to the SCSR no longer contributes. Nothing here writes.
 */
class PatientSocioeconomicService
{
    /** Earlier assessments listed in `history` (the current one included). */
    public const HISTORY_LIMIT = 10;

    /**
     * @return array<string, mixed>
     */
    public function build(Patient $patient): array
    {
        $members = $patient->familyMembers()->orderBy('id')->get();
        $householdSize = $members->count() + 1;

        $assessments = Assessment::query()
            ->whereNull('social_case_status')
            ->whereHas('case', fn ($query) => $query->where('patient_id', $patient->id))
            ->with('case:id,case_code,date_opened')
            ->withSum('expenses', 'amount')
            ->latest()->latest('id')
            ->limit(self::HISTORY_LIMIT)
            ->get();

        $current = $assessments->first();

        return [
            'patient' => [
                'occupation' => $patient->occupation,
                'monthly_income' => $this->money($patient->monthly_income),
                'educational_attainment' => $patient->educational_attainment,
                'civil_status' => $patient->civil_status,
            ],
            'household' => [
                'size' => $householdSize,
                'members_count' => $members->count(),
                'earners_count' => $members->filter(fn ($m) => (float) $m->monthly_income > 0)->count()
                    + ((float) $patient->monthly_income > 0 ? 1 : 0),
                'members_income_total' => round((float) $members->sum('monthly_income'), 2),
                'members' => $members->map(fn ($m) => [
                    'id' => $m->id,
                    'name' => $m->name,
                    'relationship' => $m->relationship,
                    'age' => $m->age,
                    'occupation' => $m->occupation,
                    'monthly_income' => $this->money($m->monthly_income),
                    'educational_attainment' => $m->educational_attainment,
                    'is_living_with_patient' => (bool) $m->is_living_with_patient,
                ])->values()->all(),
            ],
            'current' => $current === null ? null : $this->current($current, $householdSize),
            'history' => $assessments->map(fn (Assessment $a) => [
                'assessment_id' => $a->id,
                'case_id' => $a->case_id,
                'case_code' => $a->case?->case_code,
                'assessed_at' => $a->created_at,
                'total_family_income' => $this->money($a->total_family_income),
                'net_per_capita_income' => $this->money($a->net_per_capita_income),
                'classification' => $a->classification,
                'expenses_total' => round((float) $a->expenses_sum_amount, 2),
                'house_tenure' => $a->house_tenure,
            ])->values()->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function current(Assessment $assessment, int $householdSize): array
    {
        $assessment->load('expenses');

        $income = (float) $assessment->total_family_income;
        $expensesTotal = round((float) $assessment->expenses->sum('amount'), 2);

        // The classification divides (income - expenses) by the household at the
        // time of the last assessment/expense write; family edits do not recalculate
        // it, so compare against today's household to flag a drifted figure.
        $expected = round(max(0, $income - $expensesTotal) / $householdSize, 2);
        $stale = abs((float) $assessment->net_per_capita_income - $expected) > 0.005;

        return [
            'case' => [
                'id' => $assessment->case_id,
                'case_code' => $assessment->case?->case_code,
                'date_opened' => $assessment->case?->date_opened,
            ],
            'assessment_id' => $assessment->id,
            'assessed_at' => $assessment->created_at,
            'income' => [
                'total_family_income' => $this->money($assessment->total_family_income),
                'net_per_capita_income' => $this->money($assessment->net_per_capita_income),
                'other_income_sources' => $assessment->other_income_sources ?? [],
            ],
            'classification' => [
                'calculated' => $assessment->calculated_classification,
                'final' => $assessment->classification,
                'discount_rate' => $this->money($assessment->calculated_discount_rate),
                'has_override' => $assessment->hasOverride(),
                'stale' => $stale,
            ],
            'living' => [
                'housing_type' => $assessment->housing_type,
                'house_tenure' => $assessment->house_tenure,
                'light_source' => $assessment->light_source ?? [],
                'water_source' => $assessment->water_source ?? [],
                'utilities_access' => $assessment->utilities_access,
            ],
            'problems' => [
                'categories' => $assessment->problem_categories ?? [],
                'specify' => $assessment->problem_specify,
                'presenting' => $assessment->presenting_problem,
            ],
            'expenses' => [
                'lines' => $assessment->expenses->map(fn ($e) => [
                    'id' => $e->id,
                    'expense_type' => $e->expense_type,
                    'amount' => $this->money($e->amount),
                ])->values()->all(),
                'slots' => UisExpenseSlots::slots($assessment->expenses),
                'total' => $expensesTotal,
                'expense_to_income_ratio' => $income > 0 ? round($expensesTotal / $income, 2) : null,
            ],
        ];
    }

    private function money(mixed $value): ?float
    {
        return $value === null ? null : round((float) $value, 2);
    }
}
