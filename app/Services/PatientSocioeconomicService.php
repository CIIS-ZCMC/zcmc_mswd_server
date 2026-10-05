<?php

namespace App\Services;

use App\Models\Patient;
use App\Models\PatientSocioeconomicProfile;
use App\Support\FamilyIncome;

/**
 * Read model behind the patient-page List of Expenses tab: the patient's current
 * record (the newest dated one), a short history for the trend, and the live family
 * income the form pre-fills with.
 *
 * The module is patient-level and independent of cases, assessments and the UIS —
 * nothing here reads them (docs/PATIENT_SOCIOECONOMIC_PLAN.md).
 */
class PatientSocioeconomicService
{
    /** Records listed in `history` (the current one included). */
    public const HISTORY_LIMIT = 10;

    /**
     * @return array{current: array<string, mixed>|null, live_income: array<string, mixed>, history: list<array<string, mixed>>}
     */
    public function overview(Patient $patient): array
    {
        $records = $patient->socioeconomicProfiles()
            ->with('recordedBy:id,employee_name')
            ->orderByDesc('recorded_on')->orderByDesc('id')
            ->limit(self::HISTORY_LIMIT)
            ->get();

        $current = $records->first();
        $live = FamilyIncome::snapshot($patient);

        return [
            'current' => $current === null ? null : $this->present($current, $live),
            'live_income' => $live,
            'history' => $records->map(fn (PatientSocioeconomicProfile $r) => [
                'id' => $r->id,
                'recorded_on' => $r->recorded_on?->toDateString(),
                'house_tenure' => $r->house_tenure,
                'total' => $r->total(),
                'total_family_income' => $this->money($r->total_family_income),
                'balance' => $this->balance($r),
            ])->values()->all(),
        ];
    }

    /**
     * One record in full — the shape of `current`, and of every show/store/update response.
     * `$live` is the patient's family income today (FamilyIncome::snapshot); when given,
     * `income.income_changed` says whether the record's snapshot has drifted from it.
     *
     * @param  array<string, mixed>|null  $live
     * @return array<string, mixed>
     */
    public function present(PatientSocioeconomicProfile $profile, ?array $live = null): array
    {
        $profile->loadMissing('recordedBy:id,employee_name');

        $expenses = [];
        foreach (PatientSocioeconomicProfile::EXPENSE_ITEMS as $item) {
            $expenses[$item] = $this->money($profile->{$item});
        }
        $expenses['others_specify'] = $profile->others_specify;

        $total = $profile->total();
        $income = $this->money($profile->total_family_income);
        $members = $profile->income_members ?? [];

        return [
            'id' => $profile->id,
            'patient_id' => $profile->patient_id,
            'recorded_on' => $profile->recorded_on?->toDateString(),
            'recorded_by' => $profile->recordedBy === null ? null : [
                'id' => $profile->recordedBy->id,
                'name' => $profile->recordedBy->employee_name,
            ],
            'remarks' => $profile->remarks,
            'house' => [
                'tenure' => $profile->house_tenure,
                'rent_amount' => $profile->house_tenure === 'rented' ? $this->money($profile->house_rent_amount) : null,
            ],
            'light_source' => $profile->light_source ?? [],
            'water_source' => $profile->water_source ?? [],
            'expenses' => $expenses,
            'total' => $total,
            'income' => [
                'patient_income' => $this->money($profile->patient_income),
                'family_members' => array_values($members),
                'family_members_total' => round(array_sum(array_column($members, 'monthly_income')), 2),
                'other_sources' => array_values($profile->other_income_sources ?? []),
                'other_sources_total' => $profile->otherIncomeTotal(),
                'total_family_income' => $income,
                'balance' => $this->balance($profile),
                'expense_to_income_ratio' => $income !== null && $income > 0 ? round($total / $income, 2) : null,
                'income_changed' => $live !== null && $this->incomeChanged($profile, $live),
            ],
            'created_at' => $profile->created_at,
            'updated_at' => $profile->updated_at,
        ];
    }

    private function balance(PatientSocioeconomicProfile $profile): ?float
    {
        return $profile->total_family_income === null
            ? null
            : round((float) $profile->total_family_income - $profile->total(), 2);
    }

    /**
     * Whether the patient's or a family member's income differs from the snapshot taken
     * with the record. A record from before the income columns existed has no snapshot
     * and is never reported as changed.
     *
     * @param  array<string, mixed>  $live
     */
    private function incomeChanged(PatientSocioeconomicProfile $profile, array $live): bool
    {
        if ($profile->patient_income === null && $profile->income_members === null) {
            return false;
        }

        $normalise = fn (array $members) => array_map(fn ($m) => [
            (string) ($m['name'] ?? ''),
            $m['relationship'] ?? null,
            round((float) ($m['monthly_income'] ?? 0), 2),
        ], array_values($members));

        return $this->money($profile->patient_income) !== $live['patient_income']
            || $normalise($profile->income_members ?? []) !== $normalise($live['family_members']);
    }

    private function money(mixed $value): ?float
    {
        return $value === null ? null : round((float) $value, 2);
    }
}
