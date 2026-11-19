<?php

namespace App\Http\Requests;

use App\Models\AssessmentExpense;
use Illuminate\Foundation\Http\FormRequest;

class UpdateAssessmentExpenseRequest extends FormRequest
{
    public function authorize(): bool
    {
        $expense = $this->route('expense');

        return $expense instanceof AssessmentExpense
            ? $expense->assessment->canBeChangedBy($this->user(), 'cases.update')
            : ($this->user()?->can('cases.update') ?? false);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'expense_type' => ['sometimes', 'required', 'string', 'max:255'],
            'amount' => ['sometimes', 'required', 'numeric', 'min:0'],
        ];
    }
}
