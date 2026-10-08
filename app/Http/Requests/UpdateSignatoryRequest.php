<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Same fields as a create, all optional.
 */
class UpdateSignatoryRequest extends StoreSignatoryRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $rules = parent::rules();
        $rules['name'] = ['sometimes', ...array_diff($rules['name'], ['required'])];
        $rules['role'] = ['sometimes', ...array_diff($rules['role'], ['required'])];

        return $rules;
    }
}
