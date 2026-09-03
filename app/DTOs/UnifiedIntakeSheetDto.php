<?php

namespace App\DTOs;

class UnifiedIntakeSheetDto
{
    /**
     * @param  array<int, array<string, mixed>>  $patientIds
     * @param  array<int, array<string, mixed>>  $familyMembers
     * @param  array<int, array<string, mixed>>  $watchers
     * @param  array<int, array<string, mixed>>  $assistances
     */
    public function __construct(
        // Header
        public readonly ?string $referral_source = null,
        public readonly ?string $referral_details = null,
        public readonly ?string $date_of_intake = null,
        public readonly ?string $remarks = null,
        // Patient: reuse an existing record OR create a new one
        public readonly ?int $patient_id = null,
        public readonly ?PatientDto $patient = null,
        // Patient sub-records (only applied when creating a new patient)
        public readonly array $patientIds = [],
        public readonly array $familyMembers = [],
        public readonly array $watchers = [],
        // Case: open a new case OR attach to an existing open/ongoing one
        public readonly ?int $case_id = null,
        public readonly ?CaseModelDto $case = null,
        // Assessment + recommended assistance + household expenses
        public readonly ?AssessmentDto $assessment = null,
        public readonly array $assistances = [],
        public readonly array $expenses = [],
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            referral_source: $data['referral_source'] ?? null,
            referral_details: $data['referral_details'] ?? null,
            date_of_intake: $data['date_of_intake'] ?? null,
            remarks: $data['remarks'] ?? null,
            patient_id: $data['patient_id'] ?? null,
            patient: isset($data['patient']) ? PatientDto::fromArray($data['patient']) : null,
            patientIds: $data['patient_ids'] ?? [],
            familyMembers: $data['family_members'] ?? [],
            watchers: $data['watchers'] ?? [],
            case_id: $data['case_id'] ?? null,
            case: isset($data['case']) ? CaseModelDto::fromArray($data['case']) : null,
            assessment: isset($data['assessment']) ? AssessmentDto::fromArray($data['assessment']) : null,
            assistances: $data['assistances'] ?? [],
            expenses: $data['expenses'] ?? [],
        );
    }

    /**
     * Header attributes for the intake sheet row itself.
     */
    public function headerAttributes(): array
    {
        return array_filter([
            'referral_source' => $this->referral_source,
            'referral_details' => $this->referral_details,
            'date_of_intake' => $this->date_of_intake,
            'remarks' => $this->remarks,
        ], fn ($value) => $value !== null);
    }
}
