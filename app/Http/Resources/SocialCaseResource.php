<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The Social Case Study Report as the client's SCSR tab consumes it. The same
 * underlying row as AssessmentResource, but the SCSR view of it — every
 * narrative section, both signature blocks, and the two action flags the tab
 * needs to decide what to render.
 */
class SocialCaseResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'case_id' => $this->case_id,
            'social_case_no' => $this->social_case_no,
            'social_case_status' => $this->social_case_status,
            'revision' => $this->revision,

            // V. Economic / environmental
            'classification' => $this->classification,
            'total_family_income' => $this->total_family_income,
            'housing_type' => $this->housing_type,
            'utilities_access' => $this->utilities_access,

            // II–X. The narrative sections, in document order.
            'referral_source' => $this->referral_source,
            'reason_for_referral' => $this->reason_for_referral,
            'presenting_problem' => $this->presenting_problem,
            'family_background' => $this->family_background,
            'medical_history' => $this->medical_history,
            'social_functioning' => $this->social_functioning,
            'assessment_notes' => $this->assessment_notes,
            'recommendation' => $this->recommendation,
            'recommended_assistance' => $this->recommended_assistance,
            'recommended_amount' => $this->recommended_amount,
            'intervention_plan' => $this->intervention_plan,

            'created_by' => $this->whenLoaded('createdBy', fn () => [
                'id' => $this->createdBy?->id,
                'name' => $this->createdBy?->employee_name,
            ]),
            'prepared_by' => $this->whenLoaded('preparedBy', fn () => [
                'id' => $this->preparedBy?->id,
                'name' => $this->preparedBy?->employee_name,
            ]),
            'prepared_at' => $this->prepared_at,
            'noted_by' => $this->whenLoaded('notedBy', fn () => [
                'id' => $this->notedBy?->id,
                'name' => $this->notedBy?->employee_name,
            ]),
            'noted_at' => $this->noted_at,
            'review_requested_at' => $this->review_requested_at,

            'expenses' => AssessmentExpenseResource::collection($this->whenLoaded('expenses')),
            'expenses_total' => $this->whenLoaded('expenses', fn () => (float) $this->expenses->sum('amount')),

            'is_editable' => $this->isSocialCaseEditable(),
            'can_finalize' => $this->isSocialCaseEditable()
                && ($request->user()?->can('cases.finalize_social_case') ?? false),

            // The latest archived copy — earlier revisions stay reachable
            // through GET /cases/{case}/documents, which is why there is no
            // revisions collection here.
            'latest_document' => $this->whenLoaded('latestSocialCaseDocument', fn () => [
                'id' => $this->latestSocialCaseDocument?->id,
                'file_name' => $this->latestSocialCaseDocument?->file_name,
                'file_path' => $this->latestSocialCaseDocument?->file_path,
                'created_at' => $this->latestSocialCaseDocument?->created_at,
            ]),

            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
