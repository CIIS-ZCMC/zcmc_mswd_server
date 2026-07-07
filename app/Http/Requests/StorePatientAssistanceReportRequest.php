<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StorePatientAssistanceReportRequest extends FormRequest
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
            'hospital_id' => ['required', 'string', 'max:255', 'unique:patient_assistance_reports,hospital_id'],
            'mswd_id' => ['required', 'string', 'max:255', 'unique:patient_assistance_reports,mswd_id'],
            'patient_name' => ['required', 'string', 'max:255'],
            'patient_address' => ['nullable', 'string', 'max:255'],
            'assistant_type' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'max:255'],
            'amount' => ['nullable', 'numeric'],
            'snapshot_json' => ['required', 'array'],
            'released_by' => ['required', 'exists:users,id'],
            'released_at' => ['required', 'date'],
            'is_void' => ['boolean'],
        ];
    }
}
