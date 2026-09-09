<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCaseWatcherRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            // is_primary is deliberately absent — promotion only happens
            // through POST case-watchers/{caseWatcher}/promote, which keeps
            // the demote-then-set atomicity CaseWatcherService::promote()
            // provides. A generic update can't be allowed to bypass it.
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'relationship' => ['sometimes', 'required', 'string', Rule::exists('watcher_relationship_types', 'code')],
            'contact_number' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'is_informant' => ['sometimes', 'boolean'],
            'present_from' => ['nullable', 'date'],
            'present_until' => ['nullable', 'date', 'after_or_equal:present_from'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
