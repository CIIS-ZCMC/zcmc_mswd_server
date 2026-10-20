<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CaseWatcherResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $watcher = $this->patientWatcher;

        return [
            'id' => $this->id,
            'case_id' => $this->case_id,
            'patient_watcher_id' => $this->patient_watcher_id,
            'watcher' => $this->whenLoaded('patientWatcher', fn () => PatientWatcherResource::make($watcher)),
            // Flat copies of the watcher's details for clients that predate the
            // embedded `watcher`.
            'name' => $watcher?->name,
            'relationship' => $watcher?->relationship_code,
            'contact_number' => $watcher?->contact_number,
            'address' => $watcher?->address,
            'is_primary' => $this->is_primary,
            'is_informant' => $this->is_informant,
            'pass_number' => $this->pass_number,
            'pass_valid_until' => $this->pass_valid_until,
            'pass_status' => $this->pass_status,
            'present_from' => $this->present_from,
            'present_until' => $this->present_until,
            'added_by' => $this->whenLoaded('addedBy', fn () => [
                'id' => $this->addedBy?->id,
                'name' => $this->addedBy?->employee_name,
            ]),
            'notes' => $this->notes,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
