<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StorePatientAssistanceRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'case_id' => ['required', 'exists:cases,id'],
            'assistant_type_id' => ['required', 'exists:assistant_types,id'],
            'guarantor_id' => ['nullable', 'exists:guarantors,id'],
            'amount' => ['nullable', 'numeric'],
            'notes' => ['nullable', 'string'],
            'date_given' => ['required', 'date'],
            'created_by' => ['required', 'exists:users,id'],
            'status' => ['required', 'string', 'max:255'],
        ];
    }
}
