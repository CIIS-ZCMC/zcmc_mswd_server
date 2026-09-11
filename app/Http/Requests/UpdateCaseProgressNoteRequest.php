<?php

namespace App\Http\Requests;

use App\Models\CaseProgressNote;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCaseProgressNoteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('cases.update') ?? false;
    }

    /**
     * `follow_up_on` accepts an explicit null, which clears a follow-up that
     * is no longer owed.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'note_type' => ['sometimes', 'required', Rule::in(CaseProgressNote::TYPES)],
            'note_date' => ['sometimes', 'required', 'date'],
            'narrative' => ['sometimes', 'required', 'string'],
            'follow_up_on' => ['nullable', 'date'],
        ];
    }
}
