<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AssessmentResource extends JsonResource
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
            'parent_assessment_id' => $this->parent_assessment_id,
            'reassessment_reason' => $this->reassessment_reason,
            'created_by' => $this->created_by,
            'total_family_income' => $this->total_family_income,
            'net_per_capita_income' => $this->net_per_capita_income,
            'calculated_classification' => $this->calculated_classification,
            'classification' => $this->classification,
            'classification_override_reason' => $this->classification_override_reason,
            'calculated_discount_rate' => $this->calculated_discount_rate,
            'has_override' => $this->hasOverride(),
            'housing_type' => $this->housing_type,
            'utilities_access' => $this->utilities_access,
            'social_case_status' => $this->social_case_status,
            'presenting_problem' => $this->presenting_problem,
            'family_background' => $this->family_background,
            'social_functioning' => $this->social_functioning,
            'assessment_notes' => $this->assessment_notes,
            'intervention_plan' => $this->intervention_plan,
            'expenses' => AssessmentExpenseResource::collection($this->whenLoaded('expenses')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
