<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;

/** A partial edit of a DAR line: the store rules, each field optional. */
class UpdateDarEntryRequest extends StoreDarEntryRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return collect(parent::rules())
            ->map(fn (array $rules) => ['sometimes', ...array_filter($rules, fn ($rule) => $rule !== 'required')])
            ->all();
    }
}
