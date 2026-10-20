<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCaseWatcherRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Assignment fields only — the watcher's own details are edited through
     * PUT /watchers/{watcher}. is_primary is deliberately absent too: promotion
     * only happens through POST case-watchers/{caseWatcher}/promote, which keeps
     * the demote-then-set atomicity CaseWatcherService::promote() provides.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'is_informant' => ['sometimes', 'boolean'],
            'present_from' => ['nullable', 'date'],
            'present_until' => ['nullable', 'date', 'after_or_equal:present_from'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
