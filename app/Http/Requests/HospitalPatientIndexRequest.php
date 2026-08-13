<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class HospitalPatientIndexRequest extends FormRequest
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
            'search' => ['nullable', 'string', 'max:255'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:500'],
        ];
    }
}
