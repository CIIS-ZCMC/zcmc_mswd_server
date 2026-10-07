<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Same fields as a create, all optional.
 */
class UpdateGuarantorRequest extends StoreGuarantorRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $rules = parent::rules();
        $rules['name'] = ['sometimes', ...array_diff($rules['name'], ['required'])];

        return $rules;
    }
}
