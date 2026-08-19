<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreInterventionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('cases.create') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'intervention_type_id' => ['required', 'integer', 'exists:intervention_type,id'],
            'description' => ['nullable', 'string'],
            'date_given' => ['nullable', 'date'],
            'outcome' => ['nullable', 'string'],
        ];
    }
}
