<?php

namespace App\Support;

use App\Models\Patient;

/**
 * The patient's and the family members' monthly incomes — the first two parts of a
 * List of Expenses record's total family income (the third is "other family income",
 * typed in the module).
 *
 * The one place that reads them: the service snapshots it when a record is created, and
 * the overview returns it as the live preview and to flag a changed family. It reads only
 * the patient and the patient's family members — patient-level records, never cases.
 */
final class FamilyIncome
{
    /**
     * Every family member counts, not only those living with the patient; a member with
     * no income adds nothing and is left out.
     *
     * @return array{
     *     patient_income: float|null,
     *     family_members: list<array{id: int, name: string, relationship: string|null, monthly_income: float}>,
     *     family_members_total: float,
     *     total: float
     * }
     */
    public static function snapshot(Patient $patient): array
    {
        $members = $patient->familyMembers()->orderBy('id')->get()
            ->filter(fn ($member) => (float) $member->monthly_income > 0)
            ->map(fn ($member) => [
                'id' => $member->id,
                'name' => $member->name,
                'relationship' => $member->relationship,
                'monthly_income' => round((float) $member->monthly_income, 2),
            ])->values()->all();

        $membersTotal = round(array_sum(array_column($members, 'monthly_income')), 2);
        $patientIncome = $patient->monthly_income === null ? null : round((float) $patient->monthly_income, 2);

        return [
            'patient_income' => $patientIncome,
            'family_members' => $members,
            'family_members_total' => $membersTotal,
            'total' => round((float) $patientIncome + $membersTotal, 2),
        ];
    }
}
