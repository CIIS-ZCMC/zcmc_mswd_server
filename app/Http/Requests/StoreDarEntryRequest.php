<?php

namespace App\Http\Requests;

use App\Models\DarEntry;
use App\Models\ServiceVisit;
use Closure;
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
            'service_visit_id' => ['bail', 'nullable', 'integer', Rule::exists('service_visits', 'id'), $this->visitTheWorkerCanFile(...)],
            'entry_date' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'served_time' => ['nullable', 'date_format:H:i'],
            'activity' => ['required', 'string', Rule::in(array_keys(DarEntry::ACTIVITIES))],
            'remarks' => ['nullable', 'string', 'max:500'],
        ];
    }

    /**
     * A line filed from the queue must be for a visit this worker completed, on the same
     * patient, and only once. A deleted line no longer counts, so it can be filed again.
     */
    private function visitTheWorkerCanFile(string $attribute, mixed $value, Closure $fail): void
    {
        $visit = ServiceVisit::find($value);

        if ($visit === null
            || $visit->status !== ServiceVisit::STATUS_COMPLETED
            || (int) $visit->completed_by !== (int) $this->user()->id
            || (int) $visit->patient_id !== (int) $this->input('patient_id')) {
            $fail('This visit cannot be added to your DAR.');

            return;
        }

        if (DarEntry::query()->where('service_visit_id', $visit->id)->where('user_id', $this->user()->id)->exists()) {
            $fail('This visit is already on your DAR.');
        }
    }
}
