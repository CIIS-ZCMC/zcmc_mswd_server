<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AmendSocialCaseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('cases.finalize_social_case') ?? false;
    }

    /**
     * Reopening a signed document is an accountable act — the reason is
     * recorded on the case timeline, so it is required.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'reason' => ['required', 'string', 'max:255'],
        ];
    }
}
