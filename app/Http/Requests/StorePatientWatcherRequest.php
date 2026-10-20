<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePatientWatcherRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->route('patient')) {
            $this->merge(['patient_id' => $this->route('patient')->id]);
        }

        if ($this->filled('first_name') && $this->filled('last_name') && ! $this->filled('name')) {
            $fullName = trim(preg_replace('/\s+/', ' ', "{$this->input('first_name')} {$this->input('middle_name')} {$this->input('last_name')}"));
            $this->merge(['name' => $fullName]);
        } elseif ($this->filled('name') && ! $this->filled('first_name') && ! $this->filled('last_name')) {
            $trimmed = trim($this->input('name'));
            if (str_contains($trimmed, ',')) {
                $parts = explode(',', $trimmed, 2);
                $last = trim($parts[0]);
                $rest = preg_split('/\s+/', trim($parts[1] ?? '')) ?: [];
                $first = $rest[0] ?? null;
                $middle = count($rest) > 1 ? implode(' ', array_slice($rest, 1)) : null;
            } else {
                $parts = preg_split('/\s+/', $trimmed) ?: [];
                if (count($parts) === 1) {
                    $first = $parts[0];
                    $middle = null;
                    $last = $parts[0];
                } elseif (count($parts) === 2) {
                    $first = $parts[0];
                    $middle = null;
                    $last = $parts[1];
                } else {
                    $first = $parts[0];
                    $middle = implode(' ', array_slice($parts, 1, -1));
                    $last = end($parts);
                }
            }
            $this->merge([
                'first_name' => $first,
                'middle_name' => $middle,
                'last_name' => $last,
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'patient_id' => ['required', 'exists:patients,id'],
            'first_name' => ['required_without:name', 'nullable', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'last_name' => ['required_without:name', 'nullable', 'string', 'max:255'],
            'name' => ['required_without:first_name', 'nullable', 'string', 'max:255'],
            'relationship_code' => ['required', 'string', Rule::exists('watcher_relationship_types', 'code')],
            'contact_number' => ['required', 'string', 'max:255'],
            'address' => ['required', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
