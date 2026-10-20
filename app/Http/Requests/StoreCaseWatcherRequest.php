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

        // Deprecated flat shape (name/relationship/contact_number/address on the
        // request itself) is treated as a nested `watcher` until the client
        // stops sending it.
        if (! $this->filled('patient_watcher_id') && ! $this->has('watcher') && $this->filled('name')) {
            $this->merge(['watcher' => [
                'name' => $this->input('name'),
                'relationship_code' => $this->input('relationship_code', $this->input('relationship')),
                'contact_number' => $this->input('contact_number'),
                'address' => $this->input('address'),
            ]]);
        }

        if ($this->has('watcher')) {
            $w = $this->input('watcher');
            if (is_array($w) && ! empty($w['first_name']) && ! empty($w['last_name']) && empty($w['name'])) {
                $w['name'] = trim(preg_replace('/\s+/', ' ', "{$w['first_name']} ".($w['middle_name'] ?? '')." {$w['last_name']}"));
                $this->merge(['watcher' => $w]);
            }
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
            'watcher.name' => ['required_with:watcher', 'string', 'max:255'],
            'watcher.first_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'watcher.middle_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'watcher.last_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'watcher.relationship_code' => ['required_with:watcher', 'string', Rule::exists('watcher_relationship_types', 'code')],
            'watcher.contact_number' => ['nullable', 'string', 'max:255'],
            'watcher.address' => ['nullable', 'string', 'max:255'],
            'watcher.notes' => ['nullable', 'string'],

            'is_primary' => ['sometimes', 'boolean'],
            'is_informant' => ['sometimes', 'boolean'],
            'present_from' => ['nullable', 'date'],
            'present_until' => ['nullable', 'date', 'after_or_equal:present_from'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
