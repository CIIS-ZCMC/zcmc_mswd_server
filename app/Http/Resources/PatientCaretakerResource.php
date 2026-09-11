<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PatientCaretakerResource extends JsonResource
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
            'user_id' => $this->user_id,
            'role' => $this->role,
            'assigned_date' => $this->assigned_date,
            'unassigned_date' => $this->unassigned_date,
            'is_active' => $this->is_active,
            'reason' => $this->reason,
            'unassigned_reason' => $this->unassigned_reason,
            'replaced_by_id' => $this->replaced_by_id,
            // The holder of the assignment. Without this the client has only
            // user_id to render, and degrades to "User #3" on every caretaker
            // card — assigned_by/unassigned_by below were serialized from the
            // start, but the one name the Caretake tab most needs was not.
            'user' => $this->whenLoaded('user', fn () => [
                'id' => $this->user?->id,
                'name' => $this->user?->employee_name,
            ]),
            'assigned_by' => $this->whenLoaded('assignedBy', fn () => [
                'id' => $this->assignedBy?->id,
                'name' => $this->assignedBy?->employee_name,
            ]),
            'unassigned_by' => $this->whenLoaded('unassignedBy', fn () => [
                'id' => $this->unassignedBy?->id,
                'name' => $this->unassignedBy?->employee_name,
            ]),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
