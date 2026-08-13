<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Shapes a hospital (SQL Server) patient record. `whenHas` is used so the
 * output tolerates the real HIS schema — a column that doesn't exist is simply
 * omitted. Map these to the actual HIS column names as needed.
 */
class HospitalPatientResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->getKey(),
            'hospital_number' => $this->whenHas('hospital_number'),
            'first_name' => $this->whenHas('first_name'),
            'middle_name' => $this->whenHas('middle_name'),
            'last_name' => $this->whenHas('last_name'),
            'sex' => $this->whenHas('sex'),
            'birthdate' => $this->whenHas('birthdate'),
            'civil_status' => $this->whenHas('civil_status'),
            'address' => $this->whenHas('address'),
            'contact_number' => $this->whenHas('contact_number'),
        ];
    }
}
