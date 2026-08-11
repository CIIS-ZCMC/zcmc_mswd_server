<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class MergePatientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('patients.merge') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'target_id' => ['required', 'integer', 'exists:patients,id'],
        ];
    }
}
