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
            // Filter, not array_diff: the list holds rule objects that can't be cast to string.
            $rules[$field] = ['sometimes', ...array_filter($rules[$field], fn ($rule) => $rule !== 'required')];
        }

        $rules['his_transaction_id'] = ['prohibited'];

        return $rules;
    }
}
