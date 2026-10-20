import { apiClient } from "@/lib/api-client"
import type {
  ApiActivity,
  ApiAssessment,
  ApiCase,
  ApiEnvelope,
  ApiFamilyMember,
  ApiPaginated,
  ApiPatient,
  ApiWatcher,
} from "../types/api.types"

export interface ListPatientsParams {
  search?: string
  page?: number
  perPage?: number
  classification?: string
  intakeDate?: string
}

/** GET /patients — the sidebar/table listing. Supports pagination and server-side filters. */
export function listPatients(params: ListPatientsParams = {}) {
  return apiClient.get<ApiPaginated<ApiPatient>>("/patients", {
    params: {
      search: params.search || undefined,
      page: params.page ?? 1,
      per_page: params.perPage ?? 25,
    },
    filters: {
      classification:
        params.classification && params.classification !== "ALL" ? params.classification : undefined,
      intake_date: params.intakeDate || undefined,
    },
  })
}

/** GET /patients/{id}/profile — the consolidated 360 view (family, watchers, ids, cases, documents). */
export function getPatientProfile(patientId: number) {
  return apiClient
    .get<ApiEnvelope<ApiPatient>>(`/patients/${patientId}/profile`)
    .then((res) => res.data)
}

/** GET /patients/{id}/history — field-level audit trail (spatie/activitylog), newest first. */
export function getPatientHistory(patientId: number) {
  return apiClient
    .get<ApiEnvelope<ApiActivity[]>>(`/patients/${patientId}/history`)
    .then((res) => res.data)
}

/**
 * The patient's most recent case (episode), or null if none exists yet.
 * `cases.date_opened desc` is CaseModelRepository's default sort, so the
 * first row of a 1-item page is the latest.
 */
export function getLatestCaseForPatient(patientId: number) {
  return apiClient
    .get<ApiPaginated<ApiCase>>("/cases", { filters: { patient_id: patientId }, params: { per_page: 1 } })
    .then((res) => res.data[0] ?? null)
}

/** GET /cases/{id}/assessments — already returned newest-first by the controller. */
export function getCaseAssessments(caseId: number) {
  return apiClient
    .get<ApiEnvelope<ApiAssessment[]>>(`/cases/${caseId}/assessments`)
    .then((res) => res.data)
}

export interface CreateFamilyMemberPayload {
  name: string
  relationship?: string
  birthdate?: string
  sex?: string
  age?: number
  civil_status?: string
  occupation?: string
  monthly_income?: number
  educational_attainment?: string
  contact_number?: string
  is_living_with_patient?: boolean
}

/** POST /patients/{id}/family-members */
export function createFamilyMember(patientId: number, payload: CreateFamilyMemberPayload) {
  return apiClient
    .post<ApiEnvelope<ApiFamilyMember>>(`/patients/${patientId}/family-members`, payload)
    .then((res) => res.data)
}

export interface UpdateFamilyMemberPayload {
  name?: string
  relationship?: string
  birthdate?: string
  sex?: string
  age?: number
  civil_status?: string
  occupation?: string
  monthly_income?: number
  educational_attainment?: string
  contact_number?: string
  is_living_with_patient?: boolean
}

/** PUT /family-members/{id} */
export function updateFamilyMember(memberId: string | number, payload: UpdateFamilyMemberPayload) {
  return apiClient
    .put<ApiEnvelope<ApiFamilyMember>>(`/family-members/${memberId}`, payload)
    .then((res) => res.data)
}

/** DELETE /family-members/{id} */
export function deleteFamilyMember(memberId: string | number) {
  return apiClient.delete<void>(`/family-members/${memberId}`)
}

export interface UpdatePatientBackgroundPayload {
  contact_number?: string
  address?: string
  barangay?: string
  municipality?: string
  religion?: string
  nationality?: string
  place_of_birth?: string
  permanent_address?: string
  present_address?: string
  educational_attainment?: string
  occupation?: string
  employer?: string
  monthly_income?: number
  civil_status?: string
}

/** PUT /patients/{id} — used here for just the background/economic fields; the patient stays the source of truth, editable independent of any one intake. */
export function updatePatientBackground(patientId: number, payload: UpdatePatientBackgroundPayload) {
  return apiClient
    .put<ApiEnvelope<ApiPatient>>(`/patients/${patientId}`, payload)
    .then((res) => res.data)
}

export interface CreateWatcherPayload {
  name: string
  first_name?: string | null
  middle_name?: string | null
  last_name?: string | null
  relationship_code: string
  contact_number: string
  address: string
  notes?: string | null
}

export type UpdateWatcherPayload = Partial<CreateWatcherPayload>

/** GET /patients/{id}/watchers: the patient's watchers with the cases each is assigned to. */
export function listPatientWatchers(patientId: number) {
  return apiClient
    .get<ApiEnvelope<ApiWatcher[]>>(`/patients/${patientId}/watchers`)
    .then((res) => res.data)
}

/** PUT /watchers/{id} */
export function updateWatcher(watcherId: number, payload: UpdateWatcherPayload) {
  return apiClient
    .put<ApiEnvelope<ApiWatcher>>(`/watchers/${watcherId}`, payload)
    .then((res) => res.data)
}

/** DELETE /watchers/{id} */
export function deleteWatcher(watcherId: number) {
  return apiClient.delete<void>(`/watchers/${watcherId}`)
}

/** POST /patients/{id}/watchers */
export function createWatcher(patientId: number, payload: CreateWatcherPayload) {
  return apiClient
    .post<ApiEnvelope<ApiWatcher>>(`/patients/${patientId}/watchers`, payload)
    .then((res) => res.data)
}
