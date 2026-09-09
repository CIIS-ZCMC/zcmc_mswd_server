<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreWatcherWaiverRequest extends FormRequest
{
    /**
     * Permission is gated at the route (cases.waive_watcher).
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'watcher_waiver_reason' => ['required', Rule::in([
                'unidentified_patient', 'abandoned', 'unaccompanied',
                'patient_refused', 'under_protective_custody', 'other',
            ])],
            'watcher_waiver_note' => ['required_if:watcher_waiver_reason,other', 'nullable', 'string'],
        ];
    }
}
