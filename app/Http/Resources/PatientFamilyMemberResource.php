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
            'first_name' => $this->first_name,
            'middle_name' => $this->middle_name,
            'last_name' => $this->last_name,
            'extension_name' => $this->extension_name,
            'relationship' => $this->relationship,
            'birthdate' => $this->birthdate,
            'sex' => $this->sex,
            'civil_status' => $this->civil_status,
            'age' => $this->age,
            'occupation' => $this->occupation,
            'monthly_income' => $this->monthly_income,
            'educational_attainment' => $this->educational_attainment,
            'contact_number' => $this->contact_number,
            'is_living_with_patient' => $this->is_living_with_patient,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
