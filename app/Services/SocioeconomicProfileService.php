<?php

namespace App\Services;

use App\Models\Patient;
use App\Models\PatientSocioeconomicProfile;

/**
 * Writes for the patient-level List of Expenses module. Each record is a dated
 * snapshot; a changed situation is recorded as a new dated record rather than by
 * rewriting history (corrections use update).
 */
class SocioeconomicProfileService
{
    /**
     * @param  array<string, mixed>  $data  validated request data
     */
    public function create(Patient $patient, array $data, int $recordedBy): PatientSocioeconomicProfile
    {
        $data = $this->withRentRule($data, $data['house_tenure'] ?? null);

        return $patient->socioeconomicProfiles()->create($data + ['recorded_by' => $recordedBy])->refresh();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(PatientSocioeconomicProfile $profile, array $data): PatientSocioeconomicProfile
    {
        $tenure = array_key_exists('house_tenure', $data) ? $data['house_tenure'] : $profile->house_tenure;

        $profile->update($this->withRentRule($data, $tenure));

        return $profile->refresh();
    }

    public function delete(PatientSocioeconomicProfile $profile): bool
    {
        return (bool) $profile->delete();
    }

    /**
     * The rent amount belongs to a rented house only: any other tenure clears it.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function withRentRule(array $data, ?string $tenure): array
    {
        if ($tenure !== 'rented') {
            $data['house_rent_amount'] = null;
        }

        return $data;
    }
}
