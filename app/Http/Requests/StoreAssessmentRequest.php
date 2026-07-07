<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreAssessmentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'case_id' => ['required', 'exists:cases,id'],
            'created_by' => ['required', 'exists:users,id'],
            'total_family_income' => ['nullable', 'numeric'],
            'housing_type' => ['nullable', 'string', 'max:255'],
            'utilities_access' => ['nullable', 'string', 'max:255'],
            'classification' => ['required', 'string', 'max:255'],
            'presenting_problem' => ['nullable', 'string'],
            'family_background' => ['nullable', 'string'],
            'social_functioning' => ['nullable', 'string'],
            'assessment_notes' => ['nullable', 'string'],
            'intervention_plan' => ['nullable', 'string'],
        ];
    }
}
