<?php

namespace App\Http\Requests;

use App\Models\AssistantType;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAssistantTypeRequest extends FormRequest
{
    /** Permission is enforced by the controller's middleware. */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * A Type of Assistance. The name is unique among types that are not deleted; the
     * code is unique across every type, deleted ones included. The category comes from
     * the vocabulary, except that an update may keep the type's older value.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $current = $this->route('assistantType');
        $categories = array_keys(AssistantType::categoryOptions($current?->category));

        return [
            'name' => ['required', 'string', 'max:255', Rule::unique('assistant_types', 'name')->ignore($current)->whereNull('deleted_at')],
            'code' => ['required', 'string', 'max:64', 'regex:/^[a-z0-9_]+$/', Rule::unique('assistant_types', 'code')->ignore($current)],
            'category' => ['required', 'string', Rule::in($categories)],
            'description' => ['nullable', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'code.regex' => 'The code may only use lowercase letters, numbers and underscores.',
        ];
    }
}
