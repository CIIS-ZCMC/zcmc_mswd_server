import { apiClient } from "@/lib/api-client"
import type { ApiEnvelope } from "@/features/patients/types/api.types"
import type { ApiCaseWatcher, ApiWatcherStatus } from "../types/api.types"

export interface CreateCaseWatcherPayload {
  patient_watcher_id?: number | null
  name?: string
  relationship?: string
  contact_number?: string | null
  address?: string | null
  is_primary?: boolean
  is_informant?: boolean
  present_from?: string | null
  present_until?: string | null
  notes?: string | null
}

export interface UpdateCaseWatcherPayload {
  name?: string
  relationship?: string
  contact_number?: string | null
  address?: string | null
  is_primary?: boolean
  is_informant?: boolean
  present_from?: string | null
  present_until?: string | null
  notes?: string | null
}

export interface IssueWatcherPassPayload {
  pass_valid_until?: string | null
}

export interface StoreWatcherWaiverPayload {
  watcher_waiver_reason:
    | "unidentified_patient"
    | "abandoned"
    | "unaccompanied"
    | "patient_refused"
    | "under_protective_custody"
    | "other"
  watcher_waiver_notes?: string | null
}

/** GET /cases/{case}/watchers */
export function listCaseWatchers(caseId: number) {
  return apiClient
    .get<ApiEnvelope<ApiCaseWatcher[]>>(`/cases/${caseId}/watchers`)
    .then((res) => res.data)
}

/** GET /cases/{case}/watcher-status */
export function getWatcherStatus(caseId: number) {
  return apiClient
    .get<ApiEnvelope<ApiWatcherStatus>>(`/cases/${caseId}/watcher-status`)
    .then((res) => res.data)
}

/** POST /cases/{case}/watchers */
export function createCaseWatcher(caseId: number, payload: CreateCaseWatcherPayload) {
  return apiClient
    .post<ApiEnvelope<ApiCaseWatcher>>(`/cases/${caseId}/watchers`, payload)
    .then((res) => res.data)
}

/** PUT /case-watchers/{caseWatcher} */
export function updateCaseWatcher(watcherId: number, payload: UpdateCaseWatcherPayload) {
  return apiClient
    .put<ApiEnvelope<ApiCaseWatcher>>(`/case-watchers/${watcherId}`, payload)
    .then((res) => res.data)
}

/** DELETE /case-watchers/{caseWatcher} */
export function deleteCaseWatcher(watcherId: number) {
  return apiClient.delete<void>(`/case-watchers/${watcherId}`)
}

/** POST /case-watchers/{caseWatcher}/promote */
export function promoteCaseWatcher(watcherId: number) {
  return apiClient
    .post<ApiEnvelope<ApiCaseWatcher>>(`/case-watchers/${watcherId}/promote`)
    .then((res) => res.data)
}

/** POST /case-watchers/{caseWatcher}/issue-pass */
export function issueWatcherPass(watcherId: number, payload: IssueWatcherPassPayload = {}) {
  return apiClient
    .post<ApiEnvelope<ApiCaseWatcher>>(`/case-watchers/${watcherId}/issue-pass`, payload)
    .then((res) => res.data)
}

/** POST /case-watchers/{caseWatcher}/revoke-pass */
export function revokeWatcherPass(watcherId: number) {
  return apiClient
    .post<ApiEnvelope<ApiCaseWatcher>>(`/case-watchers/${watcherId}/revoke-pass`)
    .then((res) => res.data)
}

/** POST /cases/{case}/watcher-waiver */
export function storeWatcherWaiver(caseId: number, payload: StoreWatcherWaiverPayload) {
  return apiClient
    .post<ApiEnvelope<unknown>>(`/cases/${caseId}/watcher-waiver`, payload)
    .then((res) => res.data)
}

/** DELETE /cases/{case}/watcher-waiver */
export function destroyWatcherWaiver(caseId: number) {
  return apiClient.delete<void>(`/cases/${caseId}/watcher-waiver`)
}
