import type {
  ApiAssignableCase,
  ApiHospitalLookup,
  ApiPatientGuarantor,
  ApiPatientTransaction,
} from "../types/api.types"
import type {
  AssignableCase,
  EncounterGuarantor,
  HospitalEncounter,
  HospitalLookup,
} from "../types/hospital-transaction.types"

function toBool(value: unknown): boolean {
  return value === true || value === 1 || value === "1"
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const n = Number(value)
  return Number.isNaN(n) ? null : n
}

function toLookup(raw: ApiHospitalLookup | null | undefined): HospitalLookup | null {
  if (!raw) return null
  return { id: raw.id, description: raw.description ?? null }
}

function toGuarantor(raw: ApiPatientGuarantor): EncounterGuarantor {
  return {
    id: raw.id,
    name: raw.guarantor_details?.guarantor_name ?? null,
    amount: toNumber(raw.amount),
    postDate: raw.post_date ?? null,
    glPosted: toBool(raw.isGlPost),
    glPostDate: raw.gl_post_date ?? null,
  }
}

/**
 * Map a HIS transaction wire shape onto the UI model. `detailed` reflects
 * whether the relations were loaded (the single-encounter read) or absent
 * (the list read).
 */
export function toHospitalEncounter(raw: ApiPatientTransaction): HospitalEncounter {
  const guarantors = (raw.patient_guarantors ?? []).map(toGuarantor)
  const detailed = raw.patient_guarantors !== undefined

  return {
    id: raw.id,
    hospitalNumber: raw.hospital_number ?? null,
    patientName: raw.patient_name ?? null,
    registrationStatus: raw.registration_status ?? null,
    registrationDate: raw.registration_date ?? null,
    patientTransactionType: raw.patient_transaction_type ?? null,
    patientCategory: raw.patient_category ?? null,

    detailed,
    hospitalPlan: toLookup(raw.hospital_plan),
    discount: toLookup(raw.discount),
    serviceType: toLookup(raw.service_type),
    admissionCaseType: toLookup(raw.admission_case_type),
    membership: toLookup(raw.membership),
    transactionType: toLookup(raw.transaction_type),
    admissionResult: toLookup(raw.admission_result),
    guarantors,
    guarantorTotal: guarantors.reduce((sum, g) => sum + (g.amount ?? 0), 0),

    dischargeNumber: raw.discharge_number ?? null,
    dischargeDate: raw.discharge_date ?? null,
    mayGoHomeNumber: raw.may_go_home_number ?? null,
    mayGoHomeDatetime: raw.may_go_home_datetime ?? null,
    patientNumber: raw.patient_number ?? null,

    impression: raw.doctors_impression ?? null,
    dischargeDiagnosis: raw.discharge_diagnosis ?? null,
    finalDiagnosisCode: raw.final_diagnosis_code ?? null,
    finalDiagnosis: raw.final_diagnosis ?? null,

    isWithPhic: toBool(raw.isWithPHIC),
    isCancelled: toBool(raw.isCancel),
    cancelDate: raw.cancel_date ?? null,
    cancelRemarks: raw.cancel_remarks ?? null,
    isHemodialysis: toBool(raw.isHemodialysis),

    animalBiteDate: raw.animal_bite_date ?? null,
    animalVaccineDate: raw.animal_vaccine_date ?? null,
    vaccineDate: raw.vaccine_date ?? null,
  }
}

export function toAssignableCase(raw: ApiAssignableCase): AssignableCase {
  return {
    id: raw.id,
    caseCode: raw.case_code,
    status: raw.status,
    admissionType: raw.admission_type ?? null,
  }
}
