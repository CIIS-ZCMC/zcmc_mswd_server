<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PatientMergeResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'source_patient_id' => $this->source_patient_id,
            'target_patient_id' => $this->target_patient_id,
            'moved_counts' => collect($this->manifest ?? [])->map(fn ($ids) => count($ids)),
            'performed_by' => $this->performed_by,
            'reversed_at' => $this->reversed_at,
            'reversed_by' => $this->reversed_by,
            'is_reversed' => $this->isReversed(),
            'created_at' => $this->created_at,
        ];
    }
}
