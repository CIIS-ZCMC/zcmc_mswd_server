<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateCaseActivityRequest extends FormRequest
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
            'case_id' => ['sometimes', 'required', 'exists:cases,id'],
            'assigned_user_id' => ['sometimes', 'required', 'exists:users,id'],
            'previous_user_id' => ['nullable', 'exists:users,id'],
            'activity_type' => ['sometimes', 'required', 'string', 'max:255'],
            'activity_date' => ['sometimes', 'required', 'date'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
