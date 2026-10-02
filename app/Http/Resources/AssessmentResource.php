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
            'problem_categories' => $this->problem_categories,
            'problem_specify' => $this->problem_specify,
            'house_tenure' => $this->house_tenure,
            'light_source' => $this->light_source,
            'water_source' => $this->water_source,
            'informant_name' => $this->informant_name,
            'informant_last_name' => $this->informant_last_name,
            'informant_first_name' => $this->informant_first_name,
            'informant_middle_name' => $this->informant_middle_name,
            'informant_relationship' => $this->informant_relationship,
            'informant_address' => $this->informant_address,
            'informant_contact_number' => $this->informant_contact_number,
            'other_income_sources' => $this->other_income_sources,
            'referral_source' => $this->referral_source,
            'medical_history' => $this->medical_history,
            'recommendation' => $this->recommendation,
            'recommendation_mode' => $this->recommendation_mode,
            'fund_source' => $this->fund_source,
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
