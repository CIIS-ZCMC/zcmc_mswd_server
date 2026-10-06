<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Same fields as a create, all optional, except the encounter: a guarantee stays on
 * the encounter it was recorded for. When `items` is sent it replaces the breakdown.
 */
class UpdatePatientGuaranteeRequest extends StorePatientGuaranteeRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $rules = [...$this->headerRules(), ...$this->itemRules()];

        foreach (['guarantor_id', 'guaranteed_on', 'items'] as $field) {
            $rules[$field] = ['sometimes', ...array_diff($rules[$field], ['required'])];
        }

        $rules['his_transaction_id'] = ['prohibited'];

        return $rules;
    }
}
