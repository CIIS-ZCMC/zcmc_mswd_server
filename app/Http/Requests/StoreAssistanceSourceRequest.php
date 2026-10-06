<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAssistanceSourceRequest extends FormRequest
{
    /** Permission is enforced by the controller's middleware. */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * A breakdown type. The name is unique among types that are not deleted, so a deleted
     * type's name can be used again. The code is unique across every row, deleted ones
     * included, because the column carries a unique index.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $ignore = $this->route('assistanceSource');

        return [
            'name' => ['required', 'string', 'max:255', Rule::unique('assistance_sources', 'name')->ignore($ignore)->whereNull('deleted_at')],
            'code' => ['nullable', 'string', 'max:255', Rule::unique('assistance_sources', 'code')->ignore($ignore)],
            'requires_specify' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
