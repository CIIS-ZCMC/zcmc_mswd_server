<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StorePatientAssistanceLogRequest extends FormRequest
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
            'assistance_id' => ['required', 'exists:patient_assistance,id'],
            'status' => ['required', 'string', 'max:255'],
            'action' => ['required', 'string', 'max:255'],
            'action_by' => ['required', 'exists:users,id'],
            'action_date' => ['required', 'date'],
        ];
    }
}
