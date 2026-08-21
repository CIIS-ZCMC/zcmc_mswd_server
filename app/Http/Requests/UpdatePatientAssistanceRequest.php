<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdatePatientAssistanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('assistance.update') ?? false;
    }

    /**
     * Status transitions go through the dedicated approve/release/cancel
     * endpoints, so only the aid's own details are editable here.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'assistant_type_id' => ['sometimes', 'required', 'integer', 'exists:assistant_types,id'],
            'guarantor_id' => ['nullable', 'integer', 'exists:guarantors,id'],
            'amount' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
            'date_given' => ['sometimes', 'required', 'date'],
        ];
    }
}
