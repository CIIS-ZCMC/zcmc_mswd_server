<?php

namespace App\Services;

use App\Models\Patient;
use App\Models\PatientSocioeconomicProfile;

/**
 * Reads a patient's List of Expenses record as the Unified Intake Sheet needs it:
 * family income and living conditions as assessment columns, and the expense items as
 * the free-form lines `assessment_expenses` holds.
 *
 * The workers record these once, on the patient's Socio-economic tab; the UIS used to
 * ignore them and print blanks, because the two modules were deliberately separate and
 * nothing else in the UI writes an assessment's expenses. The dependency runs one way —
 * the UIS reads the record, the Socio-economic module never reads the UIS.
 *
 * Pure mapping, no writes, so intake and Refresh share it. See
 * docs/UIS_SOCIOECONOMIC_IMPORT_PLAN.md.
 */
class UisSocioeconomicImporter
{
    /**
     * Expense label per profile item. Each is chosen to land in the right slot of
     * UisExpenseSlots::KEYWORDS (a test pins every one): "House help" must not read as
     * housing, and an "Others: …" line belongs to the Others slot only.
     *
     * @var array<string, string>
     */
    public const LABELS = [
        'house_rent_amount' => 'House rent',
        'food' => 'Food',
        'transport' => 'Transportation',
        'medical' => 'Medical',
        'insurance' => 'Insurance',
        'education' => 'Education',
        'clothing' => 'Clothing',
        'house_help' => 'House help',
        'others' => 'Others',
    ];

    /**
     * The patient's current record: the newest by (recorded_on, id), soft-deleted
     * excluded — the same rule the Socio-economic tab uses for its "current".
     */
    public function latestFor(Patient $patient): ?PatientSocioeconomicProfile
    {
        return $patient->socioeconomicProfiles()
            ->orderByDesc('recorded_on')
            ->orderByDesc('id')
            ->first();
    }

    /**
     * The assessment columns the record fills. A value the record does not hold is left
     * out, not nulled, so an import never wipes what the assessment already has.
     *
     * @return array<string, mixed>
     */
    public function attributes(PatientSocioeconomicProfile $profile): array
    {
        $attributes = [
            'house_tenure' => $profile->house_tenure,
            'light_source' => $profile->light_source,
            'water_source' => $profile->water_source,
            'total_family_income' => $profile->total_family_income,
            'other_income_sources' => $profile->other_income_sources,
        ];

        return array_filter($attributes, fn ($value) => ! blank($value));
    }

    /**
     * One line per filled item. A blank item makes no line, so its slot stays blank on
     * the form rather than printing 0. The rent counts only when the house is rented,
     * as the record's own total does.
     *
     * @return list<array{expense_type: string, amount: float}>
     */
    public function expenseLines(PatientSocioeconomicProfile $profile): array
    {
        $lines = [];

        foreach (self::LABELS as $item => $label) {
            if ($item === 'house_rent_amount' && $profile->house_tenure !== 'rented') {
                continue;
            }

            if ($profile->{$item} === null) {
                continue;
            }

            if ($item === 'others' && filled($profile->others_specify)) {
                $label = "Others: {$profile->others_specify}";
            }

            $lines[] = ['expense_type' => $label, 'amount' => (float) $profile->{$item}];
        }

        return $lines;
    }
}
