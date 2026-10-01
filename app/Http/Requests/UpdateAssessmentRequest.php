<?php

namespace App\Http\Requests;

use App\Models\Assessment;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAssessmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('cases.update') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'parent_assessment_id' => ['nullable', 'integer', 'exists:assessments,id'],
            'reassessment_reason' => ['nullable', 'string', 'max:255'],
            'classification' => ['sometimes', 'nullable', 'string', 'max:255'],
            'classification_override_reason' => ['nullable', 'string'],
            'total_family_income' => ['nullable', 'numeric', 'min:0'],
            'housing_type' => ['nullable', 'string', 'max:255'],
            'utilities_access' => ['nullable', 'string', 'max:255'],
            'presenting_problem' => ['nullable', 'string'],
            'problem_categories' => ['nullable', 'array'],
            'problem_categories.*' => ['string', Rule::in(Assessment::PROBLEM_CATEGORIES)],
            'problem_specify' => ['nullable', 'string'],
            'house_tenure' => ['nullable', 'string', Rule::in(Assessment::HOUSE_TENURES)],
            'light_source' => ['nullable', 'array'],
            'light_source.*' => ['string', Rule::in(Assessment::LIGHT_SOURCES)],
            'water_source' => ['nullable', 'array'],
            'water_source.*' => ['string', Rule::in(Assessment::WATER_SOURCES)],
            'informant_name' => ['nullable', 'string', 'max:255'],
            'informant_relationship' => ['nullable', 'string', 'max:255'],
            'other_income_sources' => ['nullable', 'array'],
            'other_income_sources.*.source' => ['required', 'string', 'max:255'],
            'other_income_sources.*.amount' => ['nullable', 'numeric', 'min:0'],
            'referral_source' => ['nullable', 'string', 'max:255'],
            'medical_history' => ['nullable', 'string'],
            'recommendation' => ['nullable', 'string'],
            'recommendation_mode' => ['nullable', 'string', 'max:255'],
            'fund_source' => ['nullable', 'string', 'max:255'],
            'family_background' => ['nullable', 'string'],
            'social_functioning' => ['nullable', 'string'],
            'assessment_notes' => ['nullable', 'string'],
            'intervention_plan' => ['nullable', 'string'],
        ];
    }
}
