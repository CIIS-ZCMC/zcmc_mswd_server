<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Shapes a hospital (SQL Server) patient registration record. Nests the
 * linked HospitalPatient so callers get both the registration row and the
 * patient it belongs to in one payload.
 */
class PatientRegisterResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->getKey(),
            'patient' => $this->whenLoaded('patient', fn () => HospitalPatientResource::make($this->patient)),
            'patient_name' => $this->whenLoaded('patient', fn () => $this->patient?->displayName()),
            'hospital_number' => $this->whenLoaded('patient', fn () => $this->patient?->hospital_number),
        ];
    }
}
