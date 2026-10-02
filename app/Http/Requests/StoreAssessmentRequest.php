<?php

namespace App\Http\Requests;

use App\Models\Assessment;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAssessmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('cases.create') ?? false;
    }

    /**
     * The client form sends the contact number under both informant_contact_number
     * and a legacy informant_contact; the former is the stored one.
     */
    protected function prepareForValidation(): void
    {
        if ($this->has('informant_contact') && ! $this->has('informant_contact_number')) {
            $this->merge(['informant_contact_number' => $this->input('informant_contact')]);
        }
    }

    /**
     * `case_id` and `created_by` are set from the route + actor.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'parent_assessment_id' => ['nullable', 'integer', 'exists:assessments,id'],
            'reassessment_reason' => ['nullable', 'string', 'max:255'],
            'classification' => ['nullable', 'string', 'max:255'],
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
            'informant_last_name' => ['nullable', 'string', 'max:255'],
            'informant_first_name' => ['nullable', 'string', 'max:255'],
            'informant_middle_name' => ['nullable', 'string', 'max:255'],
            'informant_relationship' => ['nullable', 'string', 'max:255'],
            'informant_address' => ['nullable', 'string', 'max:500'],
            'informant_contact_number' => ['nullable', 'string', 'max:50'],
            'other_income_sources' => ['nullable', 'array'],
            'other_income_sources.*.source' => ['required', 'string', 'max:255'],
            'other_income_sources.*.amount' => ['nullable', 'numeric', 'min:0'],
            'referral_source' => ['nullable', 'string', 'max:255'],
            'medical_history' => ['nullable', 'string'],
            'recommendation' => ['nullable', 'string'],
            'recommendation_mode' => ['nullable', 'string', Rule::in(array_keys(Assessment::RECOMMENDATION_MODES))],
            'fund_source' => ['nullable', 'string', Rule::in(array_keys(Assessment::FUND_SOURCES))],
            'family_background' => ['nullable', 'string'],
            'social_functioning' => ['nullable', 'string'],
            'assessment_notes' => ['nullable', 'string'],
            'intervention_plan' => ['nullable', 'string'],
            // Expense lines created with the assessment (same rules as StoreAssessmentExpenseRequest).
            'expenses' => ['nullable', 'array'],
            'expenses.*.expense_type' => ['required', 'string', 'max:255'],
            'expenses.*.amount' => ['required', 'numeric', 'min:0'],
        ];
    }
}
