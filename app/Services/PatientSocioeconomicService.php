<?php

namespace App\Services;

use App\Models\Patient;
use App\Models\PatientSocioeconomicProfile;
use App\Support\UisExpenseSlots;

/**
 * Read model behind the patient-page Socio-Economic tab: the patient's live
 * household, their current profile (the newest dated record) with its expense list,
 * and a short history for the trend.
 *
 * The module is patient-level and independent of cases, assessments and the UIS —
 * nothing here reads them (docs/PATIENT_SOCIOECONOMIC_PLAN.md).
 */
class PatientSocioeconomicService
{
    /** Records listed in `history` (the current one included). */
    public const HISTORY_LIMIT = 10;

    /**
     * @return array<string, mixed>
     */
    public function overview(Patient $patient): array
    {
        $members = $patient->familyMembers()->orderBy('id')->get();
        $householdSize = $members->count() + 1;

        $records = $patient->socioeconomicProfiles()
            ->with('recordedBy:id,displayName')
            ->withSum('expenses', 'amount')
            ->orderByDesc('recorded_on')->orderByDesc('id')
            ->limit(self::HISTORY_LIMIT)
            ->get();

        $current = $records->first();
        $current?->load('expenses');

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
            'current' => $current === null ? null : $this->present($current, $householdSize),
            'history' => $records->map(fn (PatientSocioeconomicProfile $r) => [
                'id' => $r->id,
                'recorded_on' => $r->recorded_on?->toDateString(),
                'total_family_income' => $this->money($r->total_family_income),
                'net_per_capita_income' => $this->money($r->net_per_capita_income),
                'expenses_total' => round((float) $r->expenses_sum_amount, 2),
                'household_size' => $r->household_size,
                'house_tenure' => $r->house_tenure,
            ])->values()->all(),
        ];
    }

    /**
     * One record in full. `$liveHouseholdSize` is today's family members + 1; when
     * given, `household_changed` says whether the record's snapshot is out of date.
     *
     * @return array<string, mixed>
     */
    public function present(PatientSocioeconomicProfile $profile, ?int $liveHouseholdSize = null): array
    {
        $profile->loadMissing(['expenses', 'recordedBy:id,displayName']);

        $income = $profile->total_family_income;
        $total = round((float) $profile->expenses->sum('amount'), 2);

        return [
            'id' => $profile->id,
            'patient_id' => $profile->patient_id,
            'recorded_on' => $profile->recorded_on?->toDateString(),
            'recorded_by' => $profile->recordedBy === null ? null : [
                'id' => $profile->recordedBy->id,
                'name' => $profile->recordedBy->displayName,
            ],
            'income' => [
                'total_family_income' => $this->money($income),
                'net_per_capita_income' => $this->money($profile->net_per_capita_income),
                'other_income_sources' => $profile->other_income_sources ?? [],
            ],
            'living' => [
                'housing_type' => $profile->housing_type,
                'house_tenure' => $profile->house_tenure,
                'light_source' => $profile->light_source ?? [],
                'water_source' => $profile->water_source ?? [],
                'utilities_access' => $profile->utilities_access,
            ],
            'remarks' => $profile->remarks,
            'household_size' => $profile->household_size,
            'household_changed' => $liveHouseholdSize !== null && $liveHouseholdSize !== $profile->household_size,
            'expenses' => [
                'lines' => $profile->expenses->map(fn ($e) => [
                    'id' => $e->id,
                    'expense_type' => $e->expense_type,
                    'amount' => $this->money($e->amount),
                ])->values()->all(),
                'slots' => UisExpenseSlots::slots($profile->expenses),
                'total' => $total,
                'expense_to_income_ratio' => (float) $income > 0 ? round($total / (float) $income, 2) : null,
            ],
            'created_at' => $profile->created_at,
            'updated_at' => $profile->updated_at,
        ];
    }

    private function money(mixed $value): ?float
    {
        return $value === null ? null : round((float) $value, 2);
    }
}
