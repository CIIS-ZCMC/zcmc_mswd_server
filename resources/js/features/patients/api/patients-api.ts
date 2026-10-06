import { apiClient } from "@/lib/api-client"
import type {
  ApiActivity,
  ApiAssessment,
  ApiCaretaker,
  ApiCaretakeSummary,
  ApiCase,
  ApiEnvelope,
  ApiFamilyMember,
  ApiPaginated,
  ApiPatient,
  ApiWatcher,
} from "../types/api.types"
import type { CaretakerRole } from "../types/caretake.types"

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

/** GET /patients/{id}/profile — the consolidated 360 view (family, watchers, caretakers, ids, cases, documents). */
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

/**
 * GET /patients/{id}/caretake — standing custody plus the episode handler
 * to contrast it with. Superset of the older `GET /patients/{id}/caretakers`
 * collection, which stays in place for anything still reading it.
 */
export function getPatientCaretake(patientId: number) {
  return apiClient
    .get<ApiEnvelope<ApiCaretakeSummary>>(`/patients/${patientId}/caretake`)
    .then((res) => res.data)
}

export interface AssignCaretakerPayload {
  user_id: number
  role: CaretakerRole
  assigned_date: string
  /** Optional on assign; the server requires it only on reassign. */
  reason?: string
}

/** POST /patients/{id}/caretakers */
export function assignCaretaker(patientId: number, payload: AssignCaretakerPayload) {
  return apiClient
    .post<ApiEnvelope<ApiCaretaker>>(`/patients/${patientId}/caretakers`, payload)
    .then((res) => res.data)
}

export interface ReassignCaretakerPayload {
  user_id: number
  /** Required — a handover with no stated reason is what this module exists to prevent. */
  reason: string
}

/**
 * POST /caretakers/{id}/reassign — ends the current assignment and opens
 * the replacement in one write, stamping `replaced_by_id` so the two render
 * as a chain. Deliberately *not* expressible as unassign + assign: that
 * path leaves the chain broken.
 */
export function reassignCaretaker(caretakerId: string | number, payload: ReassignCaretakerPayload) {
  return apiClient
    .post<ApiEnvelope<ApiCaretaker>>(`/caretakers/${caretakerId}/reassign`, payload)
    .then((res) => res.data)
}

export interface UnassignCaretakerPayload {
  unassigned_reason?: string
}

/** PATCH /caretakers/{id}/unassign — ends custody with no replacement. */
export function unassignCaretaker(caretakerId: string | number, payload: UnassignCaretakerPayload = {}) {
  return apiClient
    .patch<ApiEnvelope<ApiCaretaker>>(`/caretakers/${caretakerId}/unassign`, payload)
    .then((res) => res.data)
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
  relationship?: string
  contact_number?: string
  address?: string
  is_primary?: boolean
}

/** POST /patients/{id}/watchers */
export function createWatcher(patientId: number, payload: CreateWatcherPayload) {
  return apiClient
    .post<ApiEnvelope<ApiWatcher>>(`/patients/${patientId}/watchers`, payload)
    .then((res) => res.data)
}
