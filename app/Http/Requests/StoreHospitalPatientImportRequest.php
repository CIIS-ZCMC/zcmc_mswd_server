<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreHospitalPatientImportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('patients.create') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'sector_id' => ['nullable', 'integer', 'exists:sectors,id'],
        ];
    }
}
