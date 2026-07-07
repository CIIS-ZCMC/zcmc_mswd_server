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
            'created_by' => $this->created_by,
            'total_family_income' => $this->total_family_income,
            'housing_type' => $this->housing_type,
            'utilities_access' => $this->utilities_access,
            'classification' => $this->classification,
            'presenting_problem' => $this->presenting_problem,
            'family_background' => $this->family_background,
            'social_functioning' => $this->social_functioning,
            'assessment_notes' => $this->assessment_notes,
            'intervention_plan' => $this->intervention_plan,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
