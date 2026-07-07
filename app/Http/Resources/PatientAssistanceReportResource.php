<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PatientAssistanceReportResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'assistance_id' => $this->assistance_id,
            'hospital_id' => $this->hospital_id,
            'mswd_id' => $this->mswd_id,
            'patient_name' => $this->patient_name,
            'patient_address' => $this->patient_address,
            'assistant_type' => $this->assistant_type,
            'category' => $this->category,
            'amount' => $this->amount,
            'snapshot_json' => $this->snapshot_json,
            'released_by' => $this->released_by,
            'released_at' => $this->released_at,
            'is_void' => $this->is_void,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
