<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

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
            'family_background' => ['nullable', 'string'],
            'social_functioning' => ['nullable', 'string'],
            'assessment_notes' => ['nullable', 'string'],
            'intervention_plan' => ['nullable', 'string'],
        ];
    }
}
