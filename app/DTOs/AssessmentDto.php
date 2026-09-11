<?php

namespace App\DTOs;

class AssessmentDto
{
    /**
     * Keys present in the source array, whatever their value — lets toArray()
     * distinguish "omitted" (leave column untouched) from "explicit null"
     * (clear the column) instead of collapsing both to "not written".
     *
     * @var array<int, string>
     */
    private readonly array $suppliedKeys;

    public function __construct(
        public readonly ?int $case_id = null,
        public readonly ?int $parent_assessment_id = null,
        public readonly ?string $reassessment_reason = null,
        public readonly ?int $created_by = null,
        public readonly ?float $total_family_income = null,
        public readonly ?float $net_per_capita_income = null,
        public readonly ?string $housing_type = null,
        public readonly ?string $utilities_access = null,
        public readonly ?string $classification = null,
        public readonly ?string $calculated_classification = null,
        public readonly ?string $classification_override_reason = null,
        public readonly ?float $calculated_discount_rate = null,
        public readonly ?string $presenting_problem = null,
        public readonly ?string $family_background = null,
        public readonly ?string $social_functioning = null,
        public readonly ?string $assessment_notes = null,
        public readonly ?string $intervention_plan = null,
        array $suppliedKeys = [],
    ) {
        $this->suppliedKeys = $suppliedKeys;
    }

    public static function fromArray(array $data): self
    {
        return new self(
            case_id: $data['case_id'] ?? null,
            parent_assessment_id: $data['parent_assessment_id'] ?? null,
            reassessment_reason: $data['reassessment_reason'] ?? null,
            created_by: $data['created_by'] ?? null,
            total_family_income: isset($data['total_family_income']) ? (float) $data['total_family_income'] : null,
            net_per_capita_income: isset($data['net_per_capita_income']) ? (float) $data['net_per_capita_income'] : null,
            housing_type: $data['housing_type'] ?? null,
            utilities_access: $data['utilities_access'] ?? null,
            classification: $data['classification'] ?? null,
            calculated_classification: $data['calculated_classification'] ?? null,
            classification_override_reason: $data['classification_override_reason'] ?? null,
            calculated_discount_rate: isset($data['calculated_discount_rate']) ? (float) $data['calculated_discount_rate'] : null,
            presenting_problem: $data['presenting_problem'] ?? null,
            family_background: $data['family_background'] ?? null,
            social_functioning: $data['social_functioning'] ?? null,
            assessment_notes: $data['assessment_notes'] ?? null,
            intervention_plan: $data['intervention_plan'] ?? null,
            suppliedKeys: array_keys($data),
        );
    }

    public function toArray(): array
    {
        $all = [
            'case_id' => $this->case_id,
            'parent_assessment_id' => $this->parent_assessment_id,
            'reassessment_reason' => $this->reassessment_reason,
            'created_by' => $this->created_by,
            'total_family_income' => $this->total_family_income,
            'net_per_capita_income' => $this->net_per_capita_income,
            'housing_type' => $this->housing_type,
            'utilities_access' => $this->utilities_access,
            'classification' => $this->classification,
            'calculated_classification' => $this->calculated_classification,
            'classification_override_reason' => $this->classification_override_reason,
            'calculated_discount_rate' => $this->calculated_discount_rate,
            'presenting_problem' => $this->presenting_problem,
            'family_background' => $this->family_background,
            'social_functioning' => $this->social_functioning,
            'assessment_notes' => $this->assessment_notes,
            'intervention_plan' => $this->intervention_plan,
        ];

        $attributes = array_intersect_key($all, array_flip($this->suppliedKeys));

        return array_filter(
            $attributes,
            fn ($value, $key) => ! in_array($key, ['case_id', 'created_by'], true) || $value !== null,
            ARRAY_FILTER_USE_BOTH,
        );
    }
}
