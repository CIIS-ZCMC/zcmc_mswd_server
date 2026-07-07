<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreCaseModelRequest extends FormRequest
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
            'patient_id' => ['required', 'exists:patients,id'],
            'assigned_user_id' => ['required', 'exists:users,id'],
            'case_code' => ['required', 'string', 'max:255', 'unique:cases,case_code'],
            'case_type' => ['required', 'string', 'max:255'],
            'priority_level' => ['required', 'string', 'max:255'],
            'status' => ['required', 'string', 'max:255'],
            'admission_type' => ['required', 'string', 'max:255'],
            'date_opened' => ['required', 'date'],
            'date_closed' => ['nullable', 'date'],
        ];
    }
}
