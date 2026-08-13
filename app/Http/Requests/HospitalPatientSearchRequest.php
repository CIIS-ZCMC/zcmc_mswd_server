<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class HospitalPatientSearchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('patients.view') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required_without:hospital_number', 'nullable', 'string', 'max:255'],
            'hospital_number' => ['required_without:name', 'nullable', 'string', 'max:255'],
        ];
    }
}
