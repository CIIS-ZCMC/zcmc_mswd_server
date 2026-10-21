<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Create or update a document type; on update every field is optional. */
class DocumentTypeRequest extends FormRequest
{
    /** Permission is enforced by the controller's middleware. */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $current = $this->route('documentType');

        return [
            'name' => [
                $current instanceof Model ? 'sometimes' : 'required',
                'string',
                'max:255',
                Rule::unique('document_types', 'name')->ignore($current)->whereNull('deleted_at'),
            ],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:65535'],
        ];
    }
}
