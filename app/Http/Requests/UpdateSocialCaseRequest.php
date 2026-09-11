<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSocialCaseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('cases.update') ?? false;
    }

    /**
     * A partial write: only the keys actually present are applied, so a tab
     * editing one section never blanks the other nine.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'classification' => ['sometimes', 'required', 'string', 'max:255'],
            'total_family_income' => ['nullable', 'numeric', 'min:0'],
            'housing_type' => ['nullable', 'string', 'max:255'],
            'utilities_access' => ['nullable', 'string', 'max:255'],
            'referral_source' => ['nullable', 'string', 'max:255'],
            'reason_for_referral' => ['nullable', 'string'],
            'presenting_problem' => ['nullable', 'string'],
            'family_background' => ['nullable', 'string'],
            'medical_history' => ['nullable', 'string'],
            'social_functioning' => ['nullable', 'string'],
            'assessment_notes' => ['nullable', 'string'],
            'recommendation' => ['nullable', 'string'],
            'recommended_assistance' => ['nullable', 'string', 'max:255'],
            'recommended_amount' => ['nullable', 'numeric', 'min:0'],
            'intervention_plan' => ['nullable', 'string'],
        ];
    }
}
