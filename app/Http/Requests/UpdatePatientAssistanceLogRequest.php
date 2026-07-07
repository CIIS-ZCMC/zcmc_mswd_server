<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdatePatientAssistanceLogRequest extends FormRequest
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
            'assistance_id' => ['sometimes', 'required', 'exists:patient_assistance,id'],
            'status' => ['sometimes', 'required', 'string', 'max:255'],
            'action' => ['sometimes', 'required', 'string', 'max:255'],
            'action_by' => ['sometimes', 'required', 'exists:users,id'],
            'action_date' => ['sometimes', 'required', 'date'],
        ];
    }
}
