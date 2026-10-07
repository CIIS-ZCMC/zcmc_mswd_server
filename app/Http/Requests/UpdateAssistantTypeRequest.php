<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Same fields as a create, all optional.
 */
class UpdateAssistantTypeRequest extends StoreAssistantTypeRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $rules = parent::rules();

        foreach (['name', 'code', 'category'] as $field) {
            $rules[$field] = ['sometimes', ...array_diff($rules[$field], ['required'])];
        }

        return $rules;
    }
}
