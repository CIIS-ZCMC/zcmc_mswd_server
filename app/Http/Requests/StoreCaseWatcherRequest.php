<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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

            // Either link an existing directory entry (relationship/contact
            // default from it, see CaseWatcherService::resolveDirectoryLink)
            // or supply a full inline person.
            'patient_watcher_id' => ['nullable', 'integer', 'exists:patient_watchers,id'],
            'name' => ['required_without:patient_watcher_id', 'string', 'max:255'],
            'relationship' => [
                Rule::requiredIf(fn () => ! $this->filled('patient_watcher_id')),
                'nullable', 'string', Rule::exists('watcher_relationship_types', 'code'),
            ],
            'contact_number' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],

            'is_primary' => ['sometimes', 'boolean'],
            'is_informant' => ['sometimes', 'boolean'],
            'present_from' => ['nullable', 'date'],
            'present_until' => ['nullable', 'date', 'after_or_equal:present_from'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
