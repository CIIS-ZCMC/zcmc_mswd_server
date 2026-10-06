/** UI-facing models for a patient's hospital (HIS) encounters. */

export type RegistryStatusCode = "A" | "D" | "X" | "M" | "U"

export interface RegistryStatus {
  code: string
  label: string
}

/** A named lookup value (service type, discount, plan, etc.). */
export interface HospitalLookup {
  id: number
  description: string | null
}

export interface EncounterGuarantor {
  id: number
  name: string | null
  amount: number | null
  postDate: string | null
  glPosted: boolean
  glPostDate: string | null
}

/**
 * One HIS encounter. Scalar fields are present on the list read; the lookups and
 * guarantors are populated only once the full encounter is loaded (`detailed`).
 */
export interface HospitalEncounter {
  id: number
  hospitalNumber: string | null
  patientName: string | null
  registrationStatus: RegistryStatus | null
  registrationDate: string | null
  patientTransactionType: string | null
  patientCategory: string | null

  // Populated on the full read only.
  detailed: boolean
  hospitalPlan: HospitalLookup | null
  discount: HospitalLookup | null
  serviceType: HospitalLookup | null
  admissionCaseType: HospitalLookup | null
  membership: HospitalLookup | null
  transactionType: HospitalLookup | null
  admissionResult: HospitalLookup | null
  guarantors: EncounterGuarantor[]
  guarantorTotal: number

  dischargeNumber: string | null
  dischargeDate: string | null
  mayGoHomeNumber: string | null
  mayGoHomeDatetime: string | null
  patientNumber: string | null

  impression: string | null
  dischargeDiagnosis: string | null
  finalDiagnosisCode: string | null
  finalDiagnosis: string | null

  isWithPhic: boolean
  isCancelled: boolean
  cancelDate: string | null
  cancelRemarks: string | null
  isHemodialysis: boolean

  animalBiteDate: string | null
  animalVaccineDate: string | null
  vaccineDate: string | null
}

export interface AssignableCase {
  id: number
  caseCode: string
  status: string
  admissionType: string | null
}
