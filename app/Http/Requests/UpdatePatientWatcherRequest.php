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

    /**
     * patient_id is deliberately absent: a watcher belongs to one patient and
     * cannot be moved to another.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'relationship_code' => ['sometimes', 'required', 'string', Rule::exists('watcher_relationship_types', 'code')],
            'contact_number' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
