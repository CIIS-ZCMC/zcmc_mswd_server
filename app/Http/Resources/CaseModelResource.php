<?php

namespace App\Http\Resources;

use App\Services\WatcherRequirementService;
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
            // A flat lite shape, not SocialCaseResource: twenty narrative
            // columns per list row is not acceptable. The full report is one
            // GET /cases/{case}/social-case away.
            'social_case' => $this->whenLoaded('socialCase', fn () => $this->socialCase === null ? null : [
                'id' => $this->socialCase->id,
                'social_case_no' => $this->socialCase->social_case_no,
                'social_case_status' => $this->socialCase->social_case_status,
                'revision' => $this->socialCase->revision,
                'review_requested_at' => $this->socialCase->review_requested_at,
                'noted_at' => $this->socialCase->noted_at,
            ]),
            'activities_count' => $this->whenCounted('activities'),
            'assessments_count' => $this->whenCounted('assessments'),
            'diagnostics_count' => $this->whenCounted('diagnostics'),
            'interventions_count' => $this->whenCounted('interventions'),
            'documents_count' => $this->whenCounted('documents'),
            'watchers' => CaseWatcherResource::collection($this->whenLoaded('watchers')),
            // Tied to whether `watchers` was eager-loaded (only
            // CaseModelService::profile() does), so every other
            // CaseModelResource call site — list rows, PatientResource::cases,
            // etc. — skips this extra query.
            'watcher_status' => $this->whenLoaded(
                'watchers',
                fn () => app(WatcherRequirementService::class)->status($this->resource),
            ),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
