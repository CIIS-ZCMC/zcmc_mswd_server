/**
 * Wire shapes for the hospital (HIS) transaction reads, matching the server's
 * PatientTransactionResource / PatientGuarantorResource / lookup resources and
 * the assess endpoints. Relations (lookups, guarantors, patient_details) are
 * absent on the `find` list and present on the single-encounter read, so they
 * are optional here.
 */

/** A registry-status code + label, or null when the HIS row has no status. */
export interface ApiRegistryStatus {
  code: string
  label: string
}

/** A HIS lookup vocabulary row (service type, discount, plan, etc.). */
export interface ApiHospitalLookup {
  id: number
  description?: string | null
  sub_description?: string | null
  is_active?: boolean | null
}

export interface ApiPatientGuarantor {
  id: number
  transaction_id?: number | null
  guarantor_details?: {
    guarantor_id?: number | null
    guarantor_name?: string | null
  } | null
  post_date?: string | null
  amount?: number | string | null
  isGlPost?: boolean | number | null
  gl_post_date?: string | null
}

export interface ApiPatientTransaction {
  id: number
  patient_name?: string | null
  hospital_number?: string | null

  registration_status?: ApiRegistryStatus | null
  registration_date?: string | null

  patient_transaction_type?: string | null
  patient_category?: string | null

  // Lookup relations — present on the single-encounter read only.
  hospital_plan?: ApiHospitalLookup | null
  discount?: ApiHospitalLookup | null
  service_type?: ApiHospitalLookup | null
  admission_case_type?: ApiHospitalLookup | null
  membership?: ApiHospitalLookup | null
  transaction_type?: ApiHospitalLookup | null
  admission_result?: ApiHospitalLookup | null

  // Guarantors — present on the single-encounter read only.
  patient_guarantors?: ApiPatientGuarantor[]

  discharge_number?: string | null
  discharge_date?: string | null
  may_go_home_number?: string | null
  may_go_home_datetime?: string | null
  patient_number?: string | null

  doctors_impression?: string | null
  discharge_diagnosis?: string | null
  final_diagnosis_code?: string | null
  final_diagnosis?: string | null

  isWithPHIC?: boolean | number | null
  isCancel?: boolean | number | null
  cancel_date?: string | null
  cancel_remarks?: string | null
  isHemodialysis?: boolean | number | null
  mss_classification?: string | number | null

  animal_bite_date?: string | null
  animal_vaccine_date?: string | null
  vaccine_date?: string | null
}

/** A local case a HIS encounter can be assessed into (CaseModelResource subset). */
export interface ApiAssignableCase {
  id: number
  case_code: string
  status: string
  admission_type?: string | null
}

/** The case↔encounter link returned by the assess endpoint. */
export interface ApiCaseHospitalTransaction {
  id: number
  case_id: number
  his_transaction_id: number
  hospital_id?: number | null
  linked_at?: string | null
}
