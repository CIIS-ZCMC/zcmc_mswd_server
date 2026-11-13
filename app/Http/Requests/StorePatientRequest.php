<?php

namespace App\Http\Requests;

use App\Support\PhPhoneNumber;
use App\Support\PsgcAddress;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StorePatientRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('patients.create') ?? false;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('contact_number')) {
            $this->merge(['contact_number' => PhPhoneNumber::normalize($this->input('contact_number'))]);
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
            'sector_id' => ['required', 'exists:sectors,id'],
            'hospital_id' => ['nullable', 'integer', 'unique:patients,hospital_id'],
            'mswd_id' => ['nullable', 'integer', 'unique:patients,mswd_id'],
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'extension_name' => ['nullable', 'string', 'max:255'],
            'birthdate' => ['nullable', 'date'],
            'estimated_age' => ['nullable', 'integer'],
            'sex' => ['required', 'string', 'max:255'],
            'civil_status' => ['nullable', 'string', 'max:255'],
            // Addresses and place of birth are picked from PSGC; the composed
            // strings (address, barangay, municipality, province,
            // present_address, permanent_address, place_of_birth) are written
            // by the server and not accepted here.
            ...PsgcAddress::rules('present_address'),
            ...PsgcAddress::rules('permanent_address'),
            ...PsgcAddress::cityRules('place_of_birth'),
            'contact_number' => PhPhoneNumber::rules(['nullable']),
            'religion' => ['nullable', 'string', 'max:255'],
            'nationality' => ['nullable', 'string', 'max:255'],
            'educational_attainment' => ['nullable', 'string', 'max:255'],
            'occupation' => ['nullable', 'string', 'max:255'],
            'employer' => ['nullable', 'string', 'max:255'],
            'monthly_income' => ['nullable', 'numeric', 'min:0'],
        ];
    }
}
