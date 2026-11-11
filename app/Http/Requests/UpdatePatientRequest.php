<?php

namespace App\Http\Requests;

use App\Support\PsgcAddress;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdatePatientRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('patients.update') ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $patientId = $this->route('patient')?->id;

        return [
            'sector_id' => ['sometimes', 'required', 'exists:sectors,id'],
            'hospital_id' => ['nullable', 'integer', 'unique:patients,hospital_id,'.$patientId],
            'mswd_id' => ['nullable', 'integer', 'unique:patients,mswd_id,'.$patientId],
            'first_name' => ['sometimes', 'required', 'string', 'max:255'],
            'last_name' => ['sometimes', 'required', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'extension_name' => ['nullable', 'string', 'max:255'],
            'birthdate' => ['nullable', 'date'],
            'estimated_age' => ['nullable', 'integer'],
            'sex' => ['sometimes', 'required', 'string', 'max:255'],
            'civil_status' => ['nullable', 'string', 'max:255'],
            // Addresses and place of birth are picked from PSGC; the composed
            // strings are written by the server and not accepted here. An
            // address left out of the request is left alone; sent with no
            // city and barangay, it is cleared.
            ...PsgcAddress::rules('present_address'),
            ...PsgcAddress::rules('permanent_address'),
            ...PsgcAddress::cityRules('place_of_birth'),
            'contact_number' => ['nullable', 'string', 'max:255'],
            'religion' => ['nullable', 'string', 'max:255'],
            'nationality' => ['nullable', 'string', 'max:255'],
            'educational_attainment' => ['nullable', 'string', 'max:255'],
            'occupation' => ['nullable', 'string', 'max:255'],
            'employer' => ['nullable', 'string', 'max:255'],
            'monthly_income' => ['nullable', 'numeric', 'min:0'],
        ];
    }
}
