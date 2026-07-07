<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CaseModelResource extends JsonResource
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
            'patient_id' => $this->patient_id,
            'assigned_user_id' => $this->assigned_user_id,
            'case_code' => $this->case_code,
            'case_type' => $this->case_type,
            'priority_level' => $this->priority_level,
            'status' => $this->status,
            'admission_type' => $this->admission_type,
            'date_opened' => $this->date_opened,
            'date_closed' => $this->date_closed,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
