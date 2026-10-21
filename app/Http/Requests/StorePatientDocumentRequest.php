<?php

namespace App\Http\Requests;

use App\Models\Patient;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * A patient's document upload. The case is optional but must be the patient's own;
 * the type must be an active Library type. Patient, uploader and file details are set
 * server-side.
 */
class StorePatientDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('patients.update') ?? false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var Patient $patient */
        $patient = $this->route('patient');

        return [
            'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
            'document_type_id' => [
                'required',
                'integer',
                Rule::exists('document_types', 'id')->where('is_active', true)->whereNull('deleted_at'),
            ],
            'case_id' => [
                'nullable',
                'integer',
                Rule::exists('cases', 'id')->where('patient_id', $patient->id),
            ],
        ];
    }
}
