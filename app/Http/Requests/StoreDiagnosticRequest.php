<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreDiagnosticRequest extends FormRequest
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
            'diagnosis_name' => ['required', 'string', 'max:255'],
            'diagnosis_description' => ['nullable', 'string', 'max:255'],
            'diagnosis_date' => ['required', 'date'],
            'attending_physician' => ['nullable', 'string', 'max:255'],
            'facility_name' => ['nullable', 'string', 'max:255'],
        ];
    }
}
