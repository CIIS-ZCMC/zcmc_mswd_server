<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateCaseModelRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('cases.update') ?? false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'patient_id' => ['sometimes', 'required', 'exists:patients,id'],
            'assigned_user_id' => ['sometimes', 'required', 'exists:users,id'],
            'case_type' => ['sometimes', 'required', 'string', 'max:255'],
            'priority_level' => ['sometimes', 'required', 'string', 'max:255'],
            'admission_type' => ['sometimes', 'required', 'string', 'max:255'],
            'status' => ['sometimes', 'required', 'string', 'max:255'],
            'date_opened' => ['sometimes', 'required', 'date'],
            'date_closed' => ['nullable', 'date'],
        ];
    }
}
