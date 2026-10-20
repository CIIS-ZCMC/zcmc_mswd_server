<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePatientWatcherRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->filled('first_name') && $this->filled('last_name') && ! $this->filled('name')) {
            $fullName = trim(preg_replace('/\s+/', ' ', "{$this->input('first_name')} {$this->input('middle_name')} {$this->input('last_name')}"));
            $this->merge(['name' => $fullName]);
        }
    }

    /**
     * patient_id is deliberately absent: a watcher belongs to one patient and
     * cannot be moved to another.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'first_name' => ['sometimes', 'required', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'last_name' => ['sometimes', 'required', 'string', 'max:255'],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'relationship_code' => ['sometimes', 'required', 'string', Rule::exists('watcher_relationship_types', 'code')],
            'contact_number' => ['sometimes', 'nullable', 'string', 'max:255'],
            'address' => ['sometimes', 'nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
