<?php

namespace App\Services;

use App\Models\Patient;
use App\Models\PatientSocioeconomicProfile;
use App\Support\FamilyIncome;

/**
 * Writes for the patient-level List of Expenses module. Each record is a dated
 * snapshot; a changed situation is recorded as a new dated record rather than by
 * rewriting history (corrections use update).
 *
 * The family income is a snapshot too: the patient's and the family members' incomes
 * are read when the record is created, and `total_family_income` is always computed
 * here — it is never taken from a request.
 */
class SocioeconomicProfileService
{
    /**
     * @param  array<string, mixed>  $data  validated request data
     */
    public function create(Patient $patient, array $data, int $recordedBy): PatientSocioeconomicProfile
    {
        $data = $this->withUtilityRules(
            $data,
            $data['house_tenure'] ?? null,
            $data['light_source'] ?? [],
            $data['water_source'] ?? [],
        );

        $profile = $patient->socioeconomicProfiles()->make($data + ['recorded_by' => $recordedBy]);
        $this->takeIncomeSnapshot($profile, $patient);
        $profile->total_family_income = $profile->incomeTotal();
        $profile->save();

        return $profile->refresh();
    }

    /**
     * Keeps the family-income snapshot, recomputing the total when the other family
     * income changes; `refresh_income` re-reads the live family first.
     *
     * @param  array<string, mixed>  $data
     */
    public function update(PatientSocioeconomicProfile $profile, array $data): PatientSocioeconomicProfile
    {
        $tenure = array_key_exists('house_tenure', $data) ? $data['house_tenure'] : $profile->house_tenure;
        $lightSource = array_key_exists('light_source', $data) ? ($data['light_source'] ?? []) : ($profile->light_source ?? []);
        $waterSource = array_key_exists('water_source', $data) ? ($data['water_source'] ?? []) : ($profile->water_source ?? []);
        $refresh = (bool) ($data['refresh_income'] ?? false);
        unset($data['refresh_income']);

        $profile->fill($this->withUtilityRules($data, $tenure, $lightSource, $waterSource));

        if ($refresh) {
            $this->takeIncomeSnapshot($profile, $profile->patient()->withTrashed()->firstOrFail());
        }

        // A record from before the income columns existed has no snapshot; leave its
        // total alone unless the income was actually touched.
        if ($refresh || array_key_exists('other_income_sources', $data)) {
            $profile->total_family_income = $profile->incomeTotal();
        }

        $profile->save();

        return $profile->refresh();
    }

    public function delete(PatientSocioeconomicProfile $profile): bool
    {
        return (bool) $profile->delete();
    }

    private function takeIncomeSnapshot(PatientSocioeconomicProfile $profile, Patient $patient): void
    {
        $snapshot = FamilyIncome::snapshot($patient);

        $profile->patient_income = $snapshot['patient_income'];
        $profile->income_members = array_map(
            fn (array $member) => array_diff_key($member, ['id' => true]),
            $snapshot['family_members'],
        );
    }

    /**
     * Amounts for house, light, and water require a selected tenure/source; clearing
     * the selection clears the stored amount.
     *
     * @param  array<string, mixed>  $data
     * @param  list<string>  $lightSource
     * @param  list<string>  $waterSource
     * @return array<string, mixed>
     */
    private function withUtilityRules(array $data, ?string $tenure, array $lightSource, array $waterSource): array
    {
        if ($tenure !== 'rented') {
            $data['house_rent_amount'] = null;
        }
        if (empty($lightSource)) {
            $data['light_amount'] = null;
        }
        if (empty($waterSource)) {
            $data['water_amount'] = null;
        }

        return $data;
    }
}
