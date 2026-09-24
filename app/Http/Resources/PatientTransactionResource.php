<?php

namespace App\Http\Resources;

use App\Enums\RegistryStatus;
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

            'patient_name' => $this->whenLoaded('patient', fn () => $this->patient?->displayName()),
            'hospital_number' => $this->whenLoaded('patient', fn () => $this->patient?->hospital_number),
            'patient_guarantors' => PatientGuarantorResource::collection($this->whenLoaded('guarantors')),
            
            'patient_details' => $this->whenLoaded('patient', fn () => HospitalPatientResource::make($this->patient)),      // FK_emdPatients
            'hospital_plan' => $this->lookup('hospitalPlan', HospitalPlanResource::class),                                  // FK_mscHospPlan
            'discount' => $this->lookup('discount', DiscountResource::class),                                               // FK_mscDiscounts
            'service_type' => $this->lookup('serviceType', ServiceTypeResource::class),                                     // FK_mscServiceType
            'admission_case_type' => $this->lookup('caseType', HospitalCaseTypeResource::class),                            // FK_mscHospCaseTypes
            'membership' => $this->lookup('membership', MembershipResource::class),                                         // FK_mscPHICMemberships
            'transaction_type' => $this->lookup('transactionType', TransactionTypeResource::class),                         // FK_mscHospTranTypes
            'admission_result' => $this->lookup('admissionResult', AdmissionResultResource::class),                         // FK_mscAdmResults

            'patient_transaction_type' => $this->pattrantype,
            'patient_category' => $this->patientcateg,

            'registration_status' => $this->registryStatus(),
            'registration_date' => $this->registrydate,

            // FK_ASUDischarge,

            'discharge_number' => $this->dischargeno,
            'discharge_date' => $this->dischdate,

            'may_go_home_number' => $this->mghno,
            'may_go_home_datetime' => $this->mghdatetime,

            'untaged_may_go_home_datetime' => $this->untagmghdatetime,
            'untaged_may_go_home_remarks' => $this->untagmghremarks,

            'patient_number' => $this->patientno,
            'doctors_impression' => $this->impression,
            'discharge_diagnosis' => $this->dischdiagnosis,
            'final_diagnosis_code' => $this->finaldiagcode,
            'final_diagnosis' => $this->finaldiagnosis,

            'isWithPHIC' => $this->isWithPhilHealth,

            'isCancel' => $this->cancelflag,
            'cancel_date' => $this->canceldate,
            'cancel_remarks' => $this->cancelremarks,

            'isHemodialysis' => $this->isHemodialysis,
            'mss_classification' => $this->FK_mscMedSocialService, // Patient Socioeconomic Classification System
            // 'patient_type' => $this->FK_mscPatientType,

            'animal_bite_date' => $this->animalBiteDate,
            'animal_vaccine_date' => $this->animalVaccinDate,
            'vaccine_date' => $this->vaccinDate,
        ];
    }

    /**
     * One lookup vocabulary as its resource: absent when the relation was not
     * eager-loaded, null when it was but the FK is empty.
     *
     * The null case is ordinary, not an error — most of these columns are
     * optional in Bizbox, and a row with no discount or no PhilHealth
     * membership is a perfectly normal encounter. Without the check,
     * Resource::make(null) would reach getKey() on nothing.
     *
     * @param  class-string<JsonResource>  $resource
     */
    private function lookup(string $relation, string $resource): mixed
    {
        return $this->whenLoaded(
            $relation,
            fn () => $this->{$relation} === null ? null : $resource::make($this->{$relation}),
        );
    }

    /**
     * The encounter status as { code, label }, or null when the HIS row carries
     * no recognised registrystatus code.
     *
     * @return array{code: string, label: string}|null
     */
    private function registryStatus(): ?array
    {
        $status = RegistryStatus::tryFrom((string) $this->registrystatus);

        return $status === null ? null : [
            'code' => $status->value,
            'label' => $status->label(),
        ];
    }
}
