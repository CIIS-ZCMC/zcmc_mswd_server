<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateUnifiedIntakeSheetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('intake.update') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'referral_source' => ['nullable', 'string', 'max:255'],
            'referral_details' => ['nullable', 'string'],
            'date_of_intake' => ['nullable', 'date'],
            'remarks' => ['nullable', 'string'],

            'assessment' => ['nullable', 'array'],
            'assessment.classification' => ['required_with:assessment', 'string', 'max:50'],
            'assessment.total_family_income' => ['nullable', 'numeric', 'min:0'],
            'assessment.presenting_problem' => ['nullable', 'string'],
            'assessment.family_background' => ['nullable', 'string'],
            'assessment.intervention_plan' => ['nullable', 'string'],
        ];
    }
}
