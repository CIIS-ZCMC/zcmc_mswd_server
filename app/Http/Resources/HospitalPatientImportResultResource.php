<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HospitalPatientImportResultResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'hospital_patient_id' => $this->hospital_patient_id,
            'hospital_id' => $this->hospital_id,
            'patient_id' => $this->patient_id,
            'outcome' => [
                'code' => $this->outcome->value,
                'label' => $this->outcome->label(),
            ],
            'message' => $this->message,
        ];
    }
}
