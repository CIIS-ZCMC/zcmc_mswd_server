<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PatientWatcherResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $label = $this->relationshipType?->name
            ?? ($this->relationship_code ? ucwords(str_replace('_', ' ', $this->relationship_code)) : null);

        return [
            'id' => $this->id,
            'patient_id' => $this->patient_id,
            'name' => $this->name,
            'first_name' => $this->first_name,
            'middle_name' => $this->middle_name,
            'last_name' => $this->last_name,
            'relationship_code' => $this->relationship_code,
            'relationship_label' => $label,
            // Kept for clients that still read the old free-text field.
            'relationship' => $label,
            'contact_number' => $this->contact_number,
            'address' => $this->address,
            'notes' => $this->notes,
            // The cases this watcher is assigned to, only when they were loaded.
            'assignments' => $this->whenLoaded('caseWatchers', fn () => $this->caseWatchers->map(fn ($assignment) => [
                'id' => $assignment->id,
                'case_id' => $assignment->case_id,
                'case_code' => $assignment->case?->case_code,
                'case_status' => $assignment->case?->status,
                'is_primary' => $assignment->is_primary,
                'is_informant' => $assignment->is_informant,
                'pass_number' => $assignment->pass_number,
                'pass_status' => $assignment->pass_status,
            ])->values()),
            'is_primary' => $this->whenLoaded('caseWatchers', fn () => $this->caseWatchers->contains('is_primary', true)),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
