<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateDocumentRequest extends FormRequest
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
            'patient_id' => ['sometimes', 'required', 'exists:patients,id'],
            'intervention_id' => ['nullable', 'exists:interventions,id'],
            'uploaded_by' => ['sometimes', 'required', 'exists:users,id'],
            'document_type' => ['sometimes', 'required', 'string', 'max:255'],
            'file_name' => ['sometimes', 'required', 'string', 'max:255'],
            'file_path' => ['sometimes', 'required', 'string', 'max:255'],
            'file_type' => ['sometimes', 'required', 'string', 'max:255'],
        ];
    }
}
