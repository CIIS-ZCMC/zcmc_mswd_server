<?php

namespace App\Http\Requests;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Create/update rules shared by the Library lists whose code assessments store
 * (modes of assistance, fund sources). The name is unique among rows that are not
 * deleted; the code is unique across every row, deleted ones included, because the
 * column carries a unique index. Once an assessment stores a code it can no longer be
 * changed, since the assessment would stop resolving to the row.
 */
abstract class AssessmentLookupRequest extends FormRequest
{
    /** The lookup table these rules validate against. */
    abstract protected function table(): string;

    /** The route parameter that holds the row being updated (null on create). */
    abstract protected function routeKey(): string;

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
        $current = $this->route($this->routeKey());
        $isUpdate = $current instanceof Model;

        return [
            'name' => [$isUpdate ? 'sometimes' : 'required', 'string', 'max:255', Rule::unique($this->table(), 'name')->ignore($current)->whereNull('deleted_at')],
            'code' => [
                $isUpdate ? 'sometimes' : 'required',
                'string',
                'max:64',
                'regex:/^[a-z0-9_]+$/',
                Rule::unique($this->table(), 'code')->ignore($current),
                function (string $attribute, mixed $value, Closure $fail) use ($current, $isUpdate) {
                    if ($isUpdate && $value !== $current->code && $current->usageCount() > 0) {
                        $fail('The code cannot change while assessments use it.');
                    }
                },
            ],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:65535'],
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
