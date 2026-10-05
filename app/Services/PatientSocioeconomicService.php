<?php

namespace App\Services;

use App\Models\Patient;
use App\Models\PatientSocioeconomicProfile;

/**
 * Read model behind the patient-page List of Expenses tab: the patient's current
 * record (the newest dated one) and a short history for the trend.
 *
 * The module is patient-level and independent of cases, assessments and the UIS —
 * nothing here reads them (docs/PATIENT_SOCIOECONOMIC_PLAN.md).
 */
class PatientSocioeconomicService
{
    /** Records listed in `history` (the current one included). */
    public const HISTORY_LIMIT = 10;

    /**
     * @return array{current: array<string, mixed>|null, history: list<array<string, mixed>>}
     */
    public function overview(Patient $patient): array
    {
        $records = $patient->socioeconomicProfiles()
            ->with('recordedBy:id,displayName')
            ->orderByDesc('recorded_on')->orderByDesc('id')
            ->limit(self::HISTORY_LIMIT)
            ->get();

        $current = $records->first();

        return [
            'current' => $current === null ? null : $this->present($current),
            'history' => $records->map(fn (PatientSocioeconomicProfile $r) => [
                'id' => $r->id,
                'recorded_on' => $r->recorded_on?->toDateString(),
                'house_tenure' => $r->house_tenure,
                'total' => $r->total(),
            ])->values()->all(),
        ];
    }

    /**
     * One record in full — the shape of `current`, and of every show/store/update response.
     *
     * @return array<string, mixed>
     */
    public function present(PatientSocioeconomicProfile $profile): array
    {
        $profile->loadMissing('recordedBy:id,displayName');

        $expenses = [];
        foreach (PatientSocioeconomicProfile::EXPENSE_ITEMS as $item) {
            $expenses[$item] = $this->money($profile->{$item});
        }
        $expenses['others_specify'] = $profile->others_specify;

        return [
            'id' => $profile->id,
            'patient_id' => $profile->patient_id,
            'recorded_on' => $profile->recorded_on?->toDateString(),
            'recorded_by' => $profile->recordedBy === null ? null : [
                'id' => $profile->recordedBy->id,
                'name' => $profile->recordedBy->displayName,
            ],
            'remarks' => $profile->remarks,
            'house' => [
                'tenure' => $profile->house_tenure,
                'rent_amount' => $profile->house_tenure === 'rented' ? $this->money($profile->house_rent_amount) : null,
            ],
            'light_source' => $profile->light_source ?? [],
            'water_source' => $profile->water_source ?? [],
            'expenses' => $expenses,
            'total' => $profile->total(),
            'created_at' => $profile->created_at,
            'updated_at' => $profile->updated_at,
        ];
    }

    private function money(mixed $value): ?float
    {
        return $value === null ? null : round((float) $value, 2);
    }
}
