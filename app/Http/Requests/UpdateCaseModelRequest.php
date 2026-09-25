<?php

namespace App\Http\Requests;

use App\Enums\CardColor;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCaseModelRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('cases.update') ?? false;
    }

    /**
     * transaction_id and created_by are fixed at open and not editable here.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'patient_id' => ['sometimes', 'required', 'exists:patients,id'],
            'assigned_user_id' => ['sometimes', 'required', 'exists:users,id'],
            'case_type' => ['sometimes', 'required', 'string', 'max:255'],
            'priority_level' => ['sometimes', 'required', 'string', 'max:255'],
            'admission_type' => ['sometimes', 'required', 'string', 'max:255'],
            'transaction_type' => ['sometimes', 'nullable', 'string', 'max:255'],
            'card_color' => ['sometimes', Rule::enum(CardColor::class)],
            'status' => ['sometimes', 'required', 'string', 'max:255'],
            'date_opened' => ['sometimes', 'required', 'date'],
            'date_closed' => ['nullable', 'date'],
        ];
    }
}
