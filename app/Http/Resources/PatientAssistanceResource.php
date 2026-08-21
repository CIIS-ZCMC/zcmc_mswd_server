<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PatientAssistanceResource extends JsonResource
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
            'assistant_type_id' => $this->assistant_type_id,
            'assistant_type' => $this->whenLoaded('assistantType', fn () => $this->assistantType?->name),
            'guarantor_id' => $this->guarantor_id,
            'guarantor' => $this->whenLoaded('guarantor', fn () => $this->guarantor?->name),
            'amount' => $this->amount,
            'notes' => $this->notes,
            'date_given' => $this->date_given,
            'created_by' => $this->created_by,
            'status' => $this->status,
            'logs' => PatientAssistanceLogResource::collection($this->whenLoaded('logs')),
            'reports' => PatientAssistanceReportResource::collection($this->whenLoaded('reports')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
