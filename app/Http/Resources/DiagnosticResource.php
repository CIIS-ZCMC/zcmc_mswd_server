<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DiagnosticResource extends JsonResource
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
            'case_id' => $this->case_id,
            'created_by' => $this->created_by,
            'diagnosis_name' => $this->diagnosis_name,
            'diagnosis_description' => $this->diagnosis_description,
            'diagnosis_date' => $this->diagnosis_date,
            'attending_physician' => $this->attending_physician,
            'facility_name' => $this->facility_name,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
