<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StorePatientIdRequest extends FormRequest
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
            'id_type' => ['required', 'string', 'max:255'],
            'id_number' => ['required', 'string', 'max:255'],
            'date_issued' => ['nullable', 'date'],
            'date_expiry' => ['nullable', 'date'],
            'is_verified' => ['boolean'],
        ];
    }
}
