<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdatePatientCaretakerRequest extends FormRequest
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
            'patient_id' => ['sometimes', 'required', 'exists:patients,id'],
            'user_id' => ['sometimes', 'required', 'exists:users,id'],
            'role' => ['sometimes', 'required', 'string', 'max:255'],
            'assigned_date' => ['sometimes', 'required', 'date'],
            'unassigned_date' => ['nullable', 'date'],
            'is_active' => ['boolean'],
        ];
    }
}
