<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateDiagnosticRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('cases.update') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'diagnosis_name' => ['sometimes', 'required', 'string', 'max:255'],
            'diagnosis_description' => ['nullable', 'string'],
            'diagnosis_date' => ['nullable', 'date'],
            'attending_physician' => ['nullable', 'string', 'max:255'],
            'facility_name' => ['nullable', 'string', 'max:255'],
        ];
    }
}
