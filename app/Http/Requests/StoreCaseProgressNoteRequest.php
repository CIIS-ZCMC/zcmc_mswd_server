<?php

namespace App\Http\Requests;

use App\Models\CaseProgressNote;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCaseProgressNoteRequest extends FormRequest
{
    /**
     * No new permission: a progress note is ordinary case work, the opposite
     * end of the authority scale from signing the social case study.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('cases.update') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'note_type' => ['nullable', Rule::in(CaseProgressNote::TYPES)],
            'note_date' => ['nullable', 'date'],
            'narrative' => ['required', 'string'],
            'follow_up_on' => ['nullable', 'date'],
        ];
    }
}
