<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateInterventionRequest extends FormRequest
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
            'case_id' => ['sometimes', 'required', 'exists:cases,id'],
            'created_by' => ['sometimes', 'required', 'exists:users,id'],
            'intervention_type_id' => ['sometimes', 'required', 'exists:intervention_type,id'],
            'description' => ['nullable', 'string'],
            'date_given' => ['sometimes', 'required', 'date'],
            'outcome' => ['nullable', 'string'],
        ];
    }
}
