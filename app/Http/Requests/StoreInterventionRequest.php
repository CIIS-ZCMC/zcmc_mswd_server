<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreInterventionRequest extends FormRequest
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
            'intervention_type_id' => ['required', 'exists:intervention_type,id'],
            'description' => ['nullable', 'string'],
            'date_given' => ['required', 'date'],
            'outcome' => ['nullable', 'string'],
        ];
    }
}
