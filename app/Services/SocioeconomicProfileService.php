<?php

namespace App\Services;

use App\Models\Patient;
use App\Models\PatientSocioeconomicProfile;
use Illuminate\Support\Facades\DB;

/**
 * Writes for the patient-level Socio-Economic module. Each record is a dated
 * snapshot: it stores the household size at record time and its own per-capita
 * income, so history stays interpretable after the family changes.
 */
class SocioeconomicProfileService
{
    /**
     * @param  array<string, mixed>  $data  validated request data (may carry `expenses`)
     */
    public function create(Patient $patient, array $data, int $recordedBy): PatientSocioeconomicProfile
    {
        $expenses = $data['expenses'] ?? [];
        unset($data['expenses']);

        return DB::transaction(function () use ($patient, $data, $expenses, $recordedBy) {
            $profile = $patient->socioeconomicProfiles()->create($data + [
                'recorded_by' => $recordedBy,
                'household_size' => $patient->familyMembers()->count() + 1,
            ]);

            foreach ($expenses as $line) {
                $profile->expenses()->create(['expense_type' => $line['expense_type'], 'amount' => $line['amount']]);
            }

            return $this->refreshPerCapita($profile);
        });
    }

    /**
     * Corrects a record. The household-size snapshot is kept: a household that has
     * changed since is recorded as a new dated profile, not by rewriting history.
     * When `expenses` is present it replaces every line.
     *
     * @param  array<string, mixed>  $data
     */
    public function update(PatientSocioeconomicProfile $profile, array $data): PatientSocioeconomicProfile
    {
        $replaceExpenses = array_key_exists('expenses', $data);
        $expenses = $data['expenses'] ?? [];
        unset($data['expenses']);

        return DB::transaction(function () use ($profile, $data, $replaceExpenses, $expenses) {
            $profile->update($data);

            if ($replaceExpenses) {
                $profile->expenses()->get()->each->delete();

                foreach ($expenses as $line) {
                    $profile->expenses()->create(['expense_type' => $line['expense_type'], 'amount' => $line['amount']]);
                }
            }

            return $this->refreshPerCapita($profile);
        });
    }

    public function delete(PatientSocioeconomicProfile $profile): bool
    {
        return (bool) $profile->delete();
    }

    /**
     * Per-capita income is (income − expenses) / household size, floored at zero —
     * a plain figure, not an MSWD classification.
     */
    private function refreshPerCapita(PatientSocioeconomicProfile $profile): PatientSocioeconomicProfile
    {
        $profile->load('expenses');

        $perCapita = $profile->total_family_income === null
            ? null
            : round(max(0, (float) $profile->total_family_income - (float) $profile->expenses->sum('amount'))
                / max(1, $profile->household_size), 2);

        $profile->update(['net_per_capita_income' => $perCapita]);

        return $profile->refresh();
    }
}
