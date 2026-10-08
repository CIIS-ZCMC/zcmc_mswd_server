<?php

namespace App\Http\Resources;

use App\Models\DarEntry;
use App\Services\DarReportService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One line of a worker's Daily Accomplishment Report, with the patient as printed.
 *
 * @mixin DarEntry
 */
class DarEntryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'entry_date' => $this->entry_date?->toDateString(),
            'served_time' => $this->served_time === null ? null : substr($this->served_time, 0, 5),
            'activity' => $this->activity,
            'activity_label' => $this->activityLabel(),
            'remarks' => $this->remarks,
            'patient' => $this->whenLoaded('patient', fn () => $this->patient === null
                ? null
                : app(DarReportService::class)->patient($this->patient, $this->entry_date)),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
