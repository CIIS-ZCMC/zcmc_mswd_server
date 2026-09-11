<?php

namespace App\DTOs;

/**
 * The author-supplied half of a Social Case Study Report: narrative and
 * socioeconomic columns only.
 *
 * Deliberately carries no lifecycle column — `social_case_no`,
 * `social_case_status`, `revision`, `prepared_*`, `noted_*`, `case_id` and
 * `created_by` are written by SocialCaseService and can never arrive from a
 * request body.
 */
class SocialCaseDto
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
        public readonly ?string $classification = null,
        public readonly ?float $total_family_income = null,
        public readonly ?string $housing_type = null,
        public readonly ?string $utilities_access = null,
        public readonly ?string $referral_source = null,
        public readonly ?string $reason_for_referral = null,
        public readonly ?string $presenting_problem = null,
        public readonly ?string $family_background = null,
        public readonly ?string $medical_history = null,
        public readonly ?string $social_functioning = null,
        public readonly ?string $assessment_notes = null,
        public readonly ?string $recommendation = null,
        public readonly ?string $recommended_assistance = null,
        public readonly ?float $recommended_amount = null,
        public readonly ?string $intervention_plan = null,
        array $suppliedKeys = [],
    ) {
        $this->suppliedKeys = $suppliedKeys;
    }

    public static function fromArray(array $data): self
    {
        return new self(
            classification: $data['classification'] ?? null,
            total_family_income: $data['total_family_income'] ?? null,
            housing_type: $data['housing_type'] ?? null,
            utilities_access: $data['utilities_access'] ?? null,
            referral_source: $data['referral_source'] ?? null,
            reason_for_referral: $data['reason_for_referral'] ?? null,
            presenting_problem: $data['presenting_problem'] ?? null,
            family_background: $data['family_background'] ?? null,
            medical_history: $data['medical_history'] ?? null,
            social_functioning: $data['social_functioning'] ?? null,
            assessment_notes: $data['assessment_notes'] ?? null,
            recommendation: $data['recommendation'] ?? null,
            recommended_assistance: $data['recommended_assistance'] ?? null,
            recommended_amount: $data['recommended_amount'] ?? null,
            intervention_plan: $data['intervention_plan'] ?? null,
            suppliedKeys: array_keys($data),
        );
    }

    public function toArray(): array
    {
        $all = [
            'classification' => $this->classification,
            'total_family_income' => $this->total_family_income,
            'housing_type' => $this->housing_type,
            'utilities_access' => $this->utilities_access,
            'referral_source' => $this->referral_source,
            'reason_for_referral' => $this->reason_for_referral,
            'presenting_problem' => $this->presenting_problem,
            'family_background' => $this->family_background,
            'medical_history' => $this->medical_history,
            'social_functioning' => $this->social_functioning,
            'assessment_notes' => $this->assessment_notes,
            'recommendation' => $this->recommendation,
            'recommended_assistance' => $this->recommended_assistance,
            'recommended_amount' => $this->recommended_amount,
            'intervention_plan' => $this->intervention_plan,
        ];

        return array_intersect_key($all, array_flip($this->suppliedKeys));
    }
}
