<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A single entry in an intake's audit trail (spatie/laravel-activitylog).
 */
class ActivityResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'log_name' => $this->log_name,
            'event' => $this->event,
            'description' => $this->description,
            'subject_type' => class_basename((string) $this->subject_type),
            'subject_id' => $this->subject_id,
            'patient_id' => $this->patient_id,
            'case_id' => $this->case_id,
            // Set by ActivityLogService in a batched lookup, never resolved per
            // row here — that would be an N+1 across the whole page.
            'subject_label' => $this->whenNotNull($this->subject_label ?? null),
            'causer' => $this->whenLoaded('causer', fn () => [
                'id' => $this->causer?->id,
                'name' => $this->causer?->employee_name,
            ]),
            'changes' => $this->properties,
            'created_at' => $this->created_at,
        ];
    }
}
