<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StorePatientAssistanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('assistance.create') ?? false;
    }

    /**
     * The case is taken from the route and the creator/status are server-set,
     * so only the aid's own details are accepted here.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'assistant_type_id' => ['required', 'integer', 'exists:assistant_types,id'],
            'guarantor_id' => ['nullable', 'integer', 'exists:guarantors,id'],
            'amount' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
            'date_given' => ['nullable', 'date'],
        ];
    }
}
