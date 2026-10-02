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
        public readonly ?array $problem_categories = null,
        public readonly ?string $problem_specify = null,
        public readonly ?string $house_tenure = null,
        public readonly ?array $light_source = null,
        public readonly ?array $water_source = null,
        public readonly ?string $informant_name = null,
        public readonly ?string $informant_last_name = null,
        public readonly ?string $informant_first_name = null,
        public readonly ?string $informant_middle_name = null,
        public readonly ?string $informant_relationship = null,
        public readonly ?string $informant_address = null,
        public readonly ?string $informant_contact_number = null,
        public readonly ?array $other_income_sources = null,
        public readonly ?string $referral_source = null,
        public readonly ?string $medical_history = null,
        public readonly ?string $recommendation = null,
        public readonly ?string $recommendation_mode = null,
        public readonly ?string $fund_source = null,
        public readonly ?string $family_background = null,
        public readonly ?string $social_functioning = null,
        public readonly ?string $assessment_notes = null,
        public readonly ?string $intervention_plan = null,
        /** Expense lines created together with the assessment (not an assessment column). */
        public readonly ?array $expenses = null,
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
            problem_categories: $data['problem_categories'] ?? null,
            problem_specify: $data['problem_specify'] ?? null,
            house_tenure: $data['house_tenure'] ?? null,
            light_source: $data['light_source'] ?? null,
            water_source: $data['water_source'] ?? null,
            informant_name: $data['informant_name'] ?? null,
            informant_last_name: $data['informant_last_name'] ?? null,
            informant_first_name: $data['informant_first_name'] ?? null,
            informant_middle_name: $data['informant_middle_name'] ?? null,
            informant_relationship: $data['informant_relationship'] ?? null,
            informant_address: $data['informant_address'] ?? null,
            informant_contact_number: $data['informant_contact_number'] ?? null,
            other_income_sources: $data['other_income_sources'] ?? null,
            referral_source: $data['referral_source'] ?? null,
            medical_history: $data['medical_history'] ?? null,
            recommendation: $data['recommendation'] ?? null,
            recommendation_mode: $data['recommendation_mode'] ?? null,
            fund_source: $data['fund_source'] ?? null,
            family_background: $data['family_background'] ?? null,
            social_functioning: $data['social_functioning'] ?? null,
            assessment_notes: $data['assessment_notes'] ?? null,
            intervention_plan: $data['intervention_plan'] ?? null,
            expenses: $data['expenses'] ?? null,
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
            'problem_categories' => $this->problem_categories,
            'problem_specify' => $this->problem_specify,
            'house_tenure' => $this->house_tenure,
            'light_source' => $this->light_source,
            'water_source' => $this->water_source,
            'informant_name' => $this->informant_name,
            'informant_last_name' => $this->informant_last_name,
            'informant_first_name' => $this->informant_first_name,
            'informant_middle_name' => $this->informant_middle_name,
            'informant_relationship' => $this->informant_relationship,
            'informant_address' => $this->informant_address,
            'informant_contact_number' => $this->informant_contact_number,
            'other_income_sources' => $this->other_income_sources,
            'referral_source' => $this->referral_source,
            'medical_history' => $this->medical_history,
            'recommendation' => $this->recommendation,
            'recommendation_mode' => $this->recommendation_mode,
            'fund_source' => $this->fund_source,
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
