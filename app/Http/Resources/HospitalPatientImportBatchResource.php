<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HospitalPatientImportBatchResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'status' => [
                'code' => $this->status->value,
                'label' => $this->status->label(),
            ],
            'requested_by' => $this->requested_by,
            'sector_id' => $this->sector_id,
            'total' => $this->total,
            'created_count' => $this->created_count,
            'updated_count' => $this->updated_count,
            'skipped_count' => $this->skipped_count,
            'failed_count' => $this->failed_count,
            'started_at' => $this->started_at,
            'finished_at' => $this->finished_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,

            'results' => HospitalPatientImportResultResource::collection($this->whenLoaded('results')),
        ];
    }
}
