<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CaseModelResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'case_code' => $this->case_code,
            'patient_id' => $this->patient_id,
            'assigned_user_id' => $this->assigned_user_id,
            'case_type' => $this->case_type,
            'priority_level' => $this->priority_level,
            'status' => $this->status,
            'admission_type' => $this->admission_type,
            'date_opened' => $this->date_opened,
            'date_closed' => $this->date_closed,
            'patient' => PatientResource::make($this->whenLoaded('patient')),
            'assigned_user' => $this->whenLoaded('assignedUser', fn () => [
                'id' => $this->assignedUser?->id,
                'name' => $this->assignedUser?->employee_name,
            ]),
            'activities_count' => $this->whenCounted('activities'),
            'assessments_count' => $this->whenCounted('assessments'),
            'diagnostics_count' => $this->whenCounted('diagnostics'),
            'interventions_count' => $this->whenCounted('interventions'),
            'documents_count' => $this->whenCounted('documents'),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
