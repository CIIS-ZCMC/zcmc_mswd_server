<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PatientFamilyMemberResource extends JsonResource
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
            'name' => $this->name,
            'relationship' => $this->relationship,
            'age' => $this->age,
            'occupation' => $this->occupation,
            'monthly_income' => $this->monthly_income,
            'education' => $this->education,
            'contact_number' => $this->contact_number,
            'is_living_with_patient' => $this->is_living_with_patient,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
