<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class StoreUnifiedIntakeSheetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('intake.create') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            // Header
            'referral_source' => ['nullable', 'string', 'max:255'],
            'referral_details' => ['nullable', 'string'],
            'date_of_intake' => ['nullable', 'date'],
            'remarks' => ['nullable', 'string'],

            // Patient: reuse OR create (mutually exclusive, enforced below)
            'patient_id' => ['nullable', 'integer', 'exists:patients,id', 'required_without:patient'],
            'patient' => ['nullable', 'array', 'required_without:patient_id'],
            'patient.sector_id' => ['required_with:patient', 'integer', 'exists:sectors,id'],
            'patient.first_name' => ['required_with:patient', 'string', 'max:255'],
            'patient.last_name' => ['required_with:patient', 'string', 'max:255'],
            'patient.middle_name' => ['nullable', 'string', 'max:255'],
            'patient.sex' => ['required_with:patient', 'string', 'max:20'],
            'patient.birthdate' => ['nullable', 'date'],
            'patient.civil_status' => ['nullable', 'string', 'max:50'],
            'patient.address' => ['nullable', 'string', 'max:255'],
            'patient.contact_number' => ['nullable', 'string', 'max:50'],

            'patient_ids' => ['nullable', 'array'],
            'patient_ids.*.id' => ['nullable', 'integer'],
            'patient_ids.*.id_type' => ['required_with:patient_ids', 'string', 'max:50'],
            'patient_ids.*.id_number' => ['required_with:patient_ids', 'string', 'max:100'],

            'family_members' => ['nullable', 'array'],
            'family_members.*.id' => ['nullable', 'integer'],
            'family_members.*.name' => ['required_with:family_members', 'string', 'max:255'],
            'family_members.*.relationship' => ['nullable', 'string', 'max:100'],
            'family_members.*.age' => ['nullable', 'integer', 'min:0'],
            'family_members.*.occupation' => ['nullable', 'string', 'max:255'],
            'family_members.*.monthly_income' => ['nullable', 'numeric', 'min:0'],

            'watchers' => ['nullable', 'array'],
            'watchers.*.name' => ['required_with:watchers', 'string', 'max:255'],
            'watchers.*.relationship' => ['nullable', 'string', 'max:100'],

            // Case: attach to an existing open case OR open a new one
            'case_id' => ['nullable', 'integer', 'exists:cases,id', 'required_without:case'],
            'case' => ['nullable', 'array', 'required_without:case_id'],
            'case.case_type' => ['required_with:case', 'string', 'max:50'],
            'case.priority_level' => ['required_with:case', 'string', 'max:50'],
            'case.admission_type' => ['required_with:case', 'string', 'max:50'],
            'case.date_opened' => ['nullable', 'date'],

            // Assessment (optional until finalize)
            'assessment' => ['nullable', 'array'],
            'assessment.classification' => ['required_with:assessment', 'string', 'max:50'],
            'assessment.total_family_income' => ['nullable', 'numeric', 'min:0'],
            'assessment.presenting_problem' => ['nullable', 'string'],
            'assessment.family_background' => ['nullable', 'string'],
            'assessment.intervention_plan' => ['nullable', 'string'],

            // Recommended assistance
            'assistances' => ['nullable', 'array'],
            'assistances.*.assistant_type_id' => ['required_with:assistances', 'integer', 'exists:assistant_types,id'],
            'assistances.*.amount' => ['nullable', 'numeric', 'min:0'],
            'assistances.*.notes' => ['nullable', 'string'],

            // Household expenses recorded at this intake (only meaningful alongside an assessment)
            'expenses' => ['nullable', 'array'],
            'expenses.*.expense_type' => ['required_with:expenses', 'string', 'max:255'],
            'expenses.*.amount' => ['required_with:expenses', 'numeric', 'min:0'],
        ];
    }

    protected function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if ($this->filled('patient_id') && $this->filled('patient')) {
                $validator->errors()->add('patient', 'Provide either an existing patient_id or a new patient, not both.');
            }

            if ($this->filled('case_id') && $this->filled('case')) {
                $validator->errors()->add('case', 'Provide either an existing case_id or a new case, not both.');
            }
        });
    }
}
