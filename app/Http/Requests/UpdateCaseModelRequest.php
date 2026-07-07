<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateCaseModelRequest extends FormRequest
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
        $caseId = $this->route('case_model')?->id;

        return [
            'patient_id' => ['sometimes', 'required', 'exists:patients,id'],
            'assigned_user_id' => ['sometimes', 'required', 'exists:users,id'],
            'case_code' => ['sometimes', 'required', 'string', 'max:255', 'unique:cases,case_code,' . $caseId],
            'case_type' => ['sometimes', 'required', 'string', 'max:255'],
            'priority_level' => ['sometimes', 'required', 'string', 'max:255'],
            'status' => ['sometimes', 'required', 'string', 'max:255'],
            'admission_type' => ['sometimes', 'required', 'string', 'max:255'],
            'date_opened' => ['sometimes', 'required', 'date'],
            'date_closed' => ['nullable', 'date'],
        ];
    }
}
