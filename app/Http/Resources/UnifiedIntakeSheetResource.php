<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UnifiedIntakeSheetResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'intake_no' => $this->intake_no,
            'status' => $this->status,
            'referral_source' => $this->referral_source,
            'referral_details' => $this->referral_details,
            'date_of_intake' => $this->date_of_intake,
            'remarks' => $this->remarks,
            'patient_id' => $this->patient_id,
            'case_id' => $this->case_id,
            'assessment_id' => $this->assessment_id,
            'intake_worker_id' => $this->intake_worker_id,
            'submitted_at' => $this->submitted_at,
            'finalized_at' => $this->finalized_at,
            'finalized_by' => $this->finalized_by,
            'patient' => PatientResource::make($this->whenLoaded('patient')),
            'case' => CaseModelResource::make($this->whenLoaded('case')),
            'assessment' => AssessmentResource::make($this->whenLoaded('assessment')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
