<?php

namespace App\Http\Requests;

use App\Models\DarEntry;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDarEntryRequest extends FormRequest
{
    /** Permission is enforced by the controller's middleware. */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * A line on the signed-in worker's DAR. The patient must be in the registry (not
     * merged away or deleted); `user_id` is always the signed-in user. Back-dating is
     * allowed so a forgotten line can be caught up, a future date is not.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'patient_id' => ['required', 'integer', Rule::exists('patients', 'id')->whereNull('deleted_at')],
            'entry_date' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'served_time' => ['nullable', 'date_format:H:i'],
            'activity' => ['required', 'string', Rule::in(array_keys(DarEntry::ACTIVITIES))],
            'remarks' => ['nullable', 'string', 'max:500'],
        ];
    }
}
