<?php

namespace App\Services;

use App\Models\Assessment;
use App\Models\FundSource;
use App\Models\ModeOfAssistance;
use App\Models\Patient;
use App\Models\PatientFamilyMember;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * The patient's side of a Unified Intake Sheet, frozen at intake.
 *
 * The UIS used to print the patient's records as they are *now*, so adding a
 * family member or correcting an address rewrote every sheet already issued. The
 * assessment's own answers were always stored on the row; this is the rest of the
 * form — section I's identity and section II's family composition — captured once
 * and kept, the way `case_hospital_transactions` keeps a HIS encounter.
 *
 * Section V is deliberately **not** captured: a guarantee is a later decision on
 * the same encounter, so freezing it at intake would leave section V blank for
 * good on most sheets. It stays live in UnifiedIntakeSheetPdfService.
 *
 * The copy is taken at creation and then left alone — AssessmentService's
 * `refreshSnapshot()` is the only way to pull current data in, and it records who
 * did it and when. See docs/UIS_SNAPSHOT_PLAN.md.
 */
class UisSnapshotService
{
    /**
     * The curated copy. Shaped for the form, not as a dump of the patient row:
     * ages are resolved as of the interview (so they never drift), the address is
     * composed as the sheet prints it, and the PhilHealth number and Library
     * labels are looked up here rather than in the Blade.
     *
     * @return array<string, mixed>
     */
    public function capture(Patient $patient, CarbonInterface|string|null $asOf = null, ?Assessment $assessment = null): array
    {
        $asOf = $asOf === null ? Carbon::now() : Carbon::parse($asOf);

        $patient->loadMissing(['patientIds', 'familyMembers']);

        return [
            'patient' => $this->patient($patient, $asOf),
            'family_members' => $patient->familyMembers
                ->map(fn (PatientFamilyMember $member) => $this->familyMember($member, $asOf))
                ->values()
                ->all(),
            'household_size' => $this->householdSize($patient),
            // The row stores the code; the name is a Library row that may later be
            // renamed or retired, so the label the sheet printed is kept too.
            'labels' => [
                'recommendation_mode' => ModeOfAssistance::labelFor($assessment?->recommendation_mode),
                'fund_source' => FundSource::labelFor($assessment?->fund_source),
            ],
        ];
    }

    /**
     * Give every intake that has no frozen copy one, from the patient's data as
     * it stands. Used by the migration that introduced the copy: those sheets
     * were drifting with the patient record and their original values are gone,
     * so today's data is the best available and at least stops the drift.
     *
     * @return int how many were backfilled
     */
    public function backfill(): int
    {
        $filled = 0;

        Assessment::query()
            // Intakes only: the SCSR is a signed document, not a UIS.
            ->whereNull('social_case_status')
            ->whereNull('uis_snapshot')
            ->with('patient.familyMembers', 'patient.patientIds')
            ->chunkById(100, function (Collection $assessments) use (&$filled) {
                foreach ($assessments as $assessment) {
                    $interviewedAt = $assessment->interviewed_at ?? $assessment->encounter_date ?? $assessment->created_at;

                    $assessment->forceFill([
                        'uis_snapshot' => $assessment->patient === null
                            ? null
                            : $this->capture($assessment->patient, $interviewedAt, $assessment),
                        'uis_snapshot_at' => $assessment->created_at,
                        'interviewed_at' => $interviewedAt,
                        'interviewed_by' => $assessment->interviewed_by ?? $assessment->created_by,
                        'household_size' => $assessment->household_size ?? $this->householdSize($assessment->patient),
                    ])->saveQuietly();

                    $filled++;
                }
            });

        return $filled;
    }

    /**
     * The patient side of the sheet, ready to render: the frozen copy when the
     * assessment has one, the live patient otherwise (a blank form, or a row from
     * before snapshots existed). Normalized to one shape either way, so the PDF
     * and the on-screen sheet cannot disagree — the reason UisExpenseSlots is
     * shared too.
     *
     * @return array{patient: ?object, family_members: Collection<int, object>, household_size: int}
     */
    public function sheetData(?Assessment $assessment, ?Patient $patient): array
    {
        $snapshot = $assessment?->uis_snapshot;

        if (! is_array($snapshot) || $snapshot === []) {
            if ($patient === null) {
                return ['patient' => null, 'family_members' => collect(), 'household_size' => 1];
            }

            // No frozen copy (a blank form, or a row from before snapshots):
            // present the live patient through the same shape.
            $snapshot = $this->capture($patient, $assessment?->interviewed_at, $assessment);
        }

        return [
            'patient' => $this->present($snapshot['patient'] ?? []),
            'family_members' => collect($snapshot['family_members'] ?? [])
                ->map(fn (array $member) => $this->present($member)),
            'household_size' => (int) ($snapshot['household_size'] ?? $assessment?->household_size ?? 1),
        ];
    }

    /**
     * One captured row as an object the form can read. A date survives the JSON
     * round-trip as a string, so it comes back as a Carbon the sheet can format.
     *
     * @param  array<string, mixed>  $row
     */
    private function present(array $row): object
    {
        if (array_key_exists('birthdate', $row)) {
            $row['birthdate'] = blank($row['birthdate']) ? null : Carbon::parse($row['birthdate']);
        }

        return (object) $row;
    }

    /**
     * The household as the MSWD classification counts it: the patient plus every
     * family member, at least one (CalculateMswdClassificationAction).
     */
    public function householdSize(?Patient $patient): int
    {
        if ($patient === null) {
            return 1;
        }

        $members = $patient->relationLoaded('familyMembers')
            ? $patient->familyMembers->count()
            : $patient->familyMembers()->count();

        return max(1, $members + 1);
    }

    /**
     * @return array<string, mixed>
     */
    private function patient(Patient $patient, CarbonInterface $asOf): array
    {
        $composedAddress = collect([$patient->address, $patient->barangay, $patient->municipality, $patient->province])
            ->filter()->join(', ');

        return [
            'full_name' => collect([$patient->last_name, $patient->first_name, $patient->middle_name, $patient->extension_name])
                ->filter()->join(', '),
            'first_name' => $patient->first_name,
            'middle_name' => $patient->middle_name,
            'last_name' => $patient->last_name,
            'extension_name' => $patient->extension_name,
            'sex' => $patient->sex,
            'birthdate' => $patient->birthdate,
            'age' => $this->ageAt($patient->birthdate, $asOf) ?? $patient->estimated_age,
            'place_of_birth' => $patient->place_of_birth,
            'civil_status' => $patient->civil_status,
            'religion' => $patient->religion,
            'nationality' => $patient->nationality,
            'citizenship' => $patient->citizenship,
            'educational_attainment' => $patient->educational_attainment,
            'occupation' => $patient->occupation,
            'monthly_income' => $patient->monthly_income,
            'contact_number' => $patient->contact_number,
            'composed_address' => $composedAddress ?: null,
            'permanent_address' => filled($patient->permanent_address) ? $patient->permanent_address : ($composedAddress ?: null),
            'present_address' => filled($patient->present_address) ? $patient->present_address : ($composedAddress ?: null),
            'hospital_id' => $patient->hospital_id,
            'mswd_id' => $patient->mswd_id,
            'philhealth_no' => $patient->patientIds
                ->first(fn ($id) => str_contains(strtolower((string) $id->id_type), 'philhealth'))
                ?->id_number,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function familyMember(PatientFamilyMember $member, CarbonInterface $asOf): array
    {
        return [
            'name' => $member->name,
            'relationship' => $member->relationship,
            'birthdate' => $member->birthdate,
            'sex' => $member->sex,
            'civil_status' => $member->civil_status,
            'age' => $this->ageAt($member->birthdate, $asOf) ?? $member->age,
            'educational_attainment' => $member->educational_attainment,
            'occupation' => $member->occupation,
            'monthly_income' => $member->monthly_income,
        ];
    }

    private function ageAt(mixed $birthdate, CarbonInterface $asOf): ?int
    {
        return blank($birthdate) ? null : (int) Carbon::parse($birthdate)->diffInYears($asOf);
    }
}
