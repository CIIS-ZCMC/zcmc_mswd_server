<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Shapes a hospital (SQL Server) patient transaction — one encounter. Nests
 * the linked HospitalPatient so callers get both the transaction row and the
 * patient it belongs to in one payload. Guarantors appear only where the
 * relation was eager-loaded (find(), not the list endpoints).
 */
class PatientTransactionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->getKey(),
            //Registry Date
            //Registry Status
            //Service Type
            //Transaction Type
            // FK_mscHospPlan,
            // FK_emdPatients,
            // FK_mscDiscounts,
            // FK_mscServiceType,
            // FK_mscHospCaseTypes
            // FK_mscPHICMemberships,
            // FK_mscHospTranTypes,
            // FK_mscAdmResults,
            // pattrantype,
            // patientcateg,
            // registrystatus,
            // registrydate,
            // FK_ASUDischarge,
            // dischargeno,
            // dischdate,
            // mghno,
            // mghdatetime,
            // untagmghdatetime,
            // untagmghremarks,
            // patientno,
            // impression,
            // dischdiagnosis,
            // finaldiagcode,
            // finaldiagnosis,
            // isWithPhilHealth,
            // cancelflag,
            // canceldate,
            // cancelremarks,
            // isHemodialysis,
            // FK_mscMedSocialService,
            // FK_mscPatientType,
            // animalBiteDate,
            // vaccinDate,
            // animalVaccinDate,
            'patient' => $this->whenLoaded('patient', fn () => HospitalPatientResource::make($this->patient)),
            'patient_name' => $this->whenLoaded('patient', fn () => $this->patient?->displayName()),
            'hospital_number' => $this->whenLoaded('patient', fn () => $this->patient?->hospital_number),
            'guarantors' => PatientGuarantorResource::collection($this->whenLoaded('guarantors')),
        ];
    }
}
