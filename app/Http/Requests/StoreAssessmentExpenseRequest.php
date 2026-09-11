<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAssessmentExpenseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('cases.create') ?? false;
    }

    /**
     * `expense_type` is a free string by design — the column carries no enum
     * and wards use labels the master list would not anticipate.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'expense_type' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0'],
        ];
    }
}
