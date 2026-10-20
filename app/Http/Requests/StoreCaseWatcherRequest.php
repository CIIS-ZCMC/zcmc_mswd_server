<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Assigns a watcher to a case: either an existing patient watcher
 * (`patient_watcher_id`) or a new person (`watcher`), which is created for the
 * case's patient and assigned in one step.
 */
class StoreCaseWatcherRequest extends FormRequest
{
    /**
     * Permission is gated at the route (cases.update); nothing further to
     * check here.
     */
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->route('case')) {
            $this->merge(['case_id' => $this->route('case')->id]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'case_id' => ['required', 'exists:cases,id'],

            'patient_watcher_id' => ['required_without:watcher', 'nullable', 'integer', 'exists:patient_watchers,id'],

            'watcher' => ['required_without:patient_watcher_id', 'nullable', 'array'],
            'watcher.last_name' => ['required_with:watcher', 'string', 'max:255'],
            'watcher.first_name' => ['required_with:watcher', 'string', 'max:255'],
            'watcher.middle_name' => ['nullable', 'string', 'max:255'],
            'watcher.relationship_code' => ['required_with:watcher', 'string', Rule::exists('watcher_relationship_types', 'code')],
            'watcher.contact_number' => ['required_with:watcher', 'string', 'max:255'],
            'watcher.address' => ['required_with:watcher', 'string', 'max:255'],
            'watcher.notes' => ['nullable', 'string'],

            'is_primary' => ['sometimes', 'boolean'],
            'is_informant' => ['sometimes', 'boolean'],
            'present_from' => ['nullable', 'date'],
            'present_until' => ['nullable', 'date', 'after_or_equal:present_from'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
