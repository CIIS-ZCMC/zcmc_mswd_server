<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PatientResource extends JsonResource
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
            'sector_id' => $this->sector_id,
            'hospital_id' => $this->hospital_id,
            'mswd_id' => $this->mswd_id,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'middle_name' => $this->middle_name,
            'extension_name' => $this->extension_name,
            'birthdate' => $this->birthdate,
            'estimated_age' => $this->estimated_age,
            'sex' => $this->sex,
            'civil_status' => $this->civil_status,
            'address' => $this->address,
            'barangay' => $this->barangay,
            'municipality' => $this->municipality,
            'province' => $this->province,
            'contact_number' => $this->contact_number,
            'religion' => $this->religion,
            'nationality' => $this->nationality,
            'place_of_birth' => $this->place_of_birth,
            'permanent_address' => $this->permanent_address,
            'present_address' => $this->present_address,
            'educational_attainment' => $this->educational_attainment,
            'occupation' => $this->occupation,
            'employer' => $this->employer,
            'monthly_income' => $this->monthly_income,
            'archived_at' => $this->deleted_at,

            // Counts (when loaded via loadCount)
            'cases_count' => $this->whenCounted('cases'),
            'patient_ids_count' => $this->whenCounted('patientIds'),
            'family_members_count' => $this->whenCounted('familyMembers'),
            'watchers_count' => $this->whenCounted('watchers'),
            'documents_count' => $this->whenCounted('documents'),

            // Relations (when eager-loaded, e.g. on the profile)
            'sector' => SectorResource::make($this->whenLoaded('sector')),
            'patient_ids' => PatientIdResource::collection($this->whenLoaded('patientIds')),
            'family_members' => PatientFamilyMemberResource::collection($this->whenLoaded('familyMembers')),
            'watchers' => PatientWatcherResource::collection($this->whenLoaded('watchers')),
            'caretakers' => PatientCaretakerResource::collection($this->whenLoaded('caretakers')),
            'cases' => CaseModelResource::collection($this->whenLoaded('cases')),
            'documents' => DocumentResource::collection($this->whenLoaded('documents')),

            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
