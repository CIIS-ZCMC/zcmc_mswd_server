<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CaseProgressNoteResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'case_id' => $this->case_id,
            'assessment_id' => $this->assessment_id,
            'note_type' => $this->note_type,
            'note_date' => $this->note_date?->toDateString(),
            'narrative' => $this->narrative,
            'follow_up_on' => $this->follow_up_on?->toDateString(),
            'follow_up_done_at' => $this->follow_up_done_at,
            'has_open_follow_up' => $this->hasOpenFollowUp(),
            'author' => $this->whenLoaded('author', fn () => [
                'id' => $this->author?->id,
                'name' => $this->author?->employee_name,
            ]),
            'follow_up_done_by' => $this->whenLoaded('followUpDoneBy', fn () => $this->followUpDoneBy === null ? null : [
                'id' => $this->followUpDoneBy->id,
                'name' => $this->followUpDoneBy->employee_name,
            ]),
            // A due follow-up is listed away from its case, so say whose it is.
            'case_code' => $this->whenLoaded('case', fn () => $this->case?->case_code),
            'patient_id' => $this->whenLoaded('case', fn () => $this->case?->patient_id),
            'patient_name' => $this->whenLoaded('case', fn () => $this->case?->relationLoaded('patient') && $this->case->patient !== null
                ? trim("{$this->case->patient->last_name}, {$this->case->patient->first_name}")
                : null),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
