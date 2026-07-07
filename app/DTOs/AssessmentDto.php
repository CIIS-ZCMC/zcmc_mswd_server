<?php

namespace App\DTOs;

class AssessmentDto
{
    public function __construct(
        public readonly ?int $case_id = null,
        public readonly ?int $created_by = null,
        public readonly ?float $total_family_income = null,
        public readonly ?string $housing_type = null,
        public readonly ?string $utilities_access = null,
        public readonly ?string $classification = null,
        public readonly ?string $presenting_problem = null,
        public readonly ?string $family_background = null,
        public readonly ?string $social_functioning = null,
        public readonly ?string $assessment_notes = null,
        public readonly ?string $intervention_plan = null,
    ) {
    }

    public static function fromArray(array $data): self
    {
        return new self(
            case_id: $data['case_id'] ?? null,
            created_by: $data['created_by'] ?? null,
            total_family_income: $data['total_family_income'] ?? null,
            housing_type: $data['housing_type'] ?? null,
            utilities_access: $data['utilities_access'] ?? null,
            classification: $data['classification'] ?? null,
            presenting_problem: $data['presenting_problem'] ?? null,
            family_background: $data['family_background'] ?? null,
            social_functioning: $data['social_functioning'] ?? null,
            assessment_notes: $data['assessment_notes'] ?? null,
            intervention_plan: $data['intervention_plan'] ?? null,
        );
    }

    public function toArray(): array
    {
        return array_filter([
            'case_id' => $this->case_id,
            'created_by' => $this->created_by,
            'total_family_income' => $this->total_family_income,
            'housing_type' => $this->housing_type,
            'utilities_access' => $this->utilities_access,
            'classification' => $this->classification,
            'presenting_problem' => $this->presenting_problem,
            'family_background' => $this->family_background,
            'social_functioning' => $this->social_functioning,
            'assessment_notes' => $this->assessment_notes,
            'intervention_plan' => $this->intervention_plan,
        ], fn ($value) => $value !== null);
    }
}
