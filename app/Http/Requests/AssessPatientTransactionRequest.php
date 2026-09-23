<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AssessPatientTransactionRequest extends FormRequest
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
            'case_id' => ['required', 'integer', 'exists:cases,id'],
        ];
    }
}
