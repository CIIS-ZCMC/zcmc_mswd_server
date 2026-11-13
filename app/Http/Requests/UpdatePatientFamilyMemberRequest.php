<?php

namespace App\Http\Requests;

use App\Support\PhPhoneNumber;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdatePatientFamilyMemberRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('contact_number')) {
            $this->merge(['contact_number' => PhPhoneNumber::normalize($this->input('contact_number'))]);
        }

        if ($this->filled('first_name') && $this->filled('last_name') && ! $this->filled('name')) {
            $fullName = trim(preg_replace('/\s+/', ' ', "{$this->input('first_name')} {$this->input('middle_name')} {$this->input('last_name')} {$this->input('extension_name')}"));
            $this->merge(['name' => $fullName]);
        }
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
            'first_name' => ['sometimes', 'required', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'last_name' => ['sometimes', 'required', 'string', 'max:255'],
            'extension_name' => ['nullable', 'string', 'max:50'],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'relationship' => ['nullable', 'string', 'max:255'],
            'birthdate' => ['nullable', 'date'],
            'sex' => ['nullable', 'string', 'max:20'],
            'civil_status' => ['nullable', 'string', 'max:50'],
            'age' => ['nullable', 'integer'],
            'occupation' => ['nullable', 'string', 'max:255'],
            'monthly_income' => ['nullable', 'numeric'],
            'educational_attainment' => ['nullable', 'string', 'max:255'],
            'contact_number' => PhPhoneNumber::rules(['nullable']),
            'is_living_with_patient' => ['boolean'],
        ];
    }
}
