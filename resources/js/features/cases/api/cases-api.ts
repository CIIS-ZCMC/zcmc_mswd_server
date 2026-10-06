import { apiClient, fetchBlob } from "@/lib/api-client"
import type { ApiEnvelope, ApiPaginated } from "@/features/patients/types/api.types"
import type {
  AssignPayload,
  CloseCasePayload,
  HospitalLookupItem,
  OpenCasePayload,
  ReferPayload,
  UpdateCasePayload,
} from "../types/case.types"

export interface GetCasesParams {
  [key: string]: string | number | boolean | undefined | null
  page?: number
  per_page?: number
  search?: string
  status?: string
  priority_level?: string
  card_color?: string
  patient_id?: number
}

export interface GetMyCaseloadParams {
  [key: string]: string | number | boolean | undefined | null
  page?: number
  per_page?: number
  search?: string
  social_case_status?: string
  status?: string
}

/** GET /cases — list all cases paginated with filters */
export function getCases(params?: GetCasesParams): Promise<ApiPaginated<any>> {
  return apiClient.get<ApiPaginated<any>>("/cases", { params })
}

/** GET /my-caseload — personal case queue partitioned by status */
export function getMyCaseload(params?: GetMyCaseloadParams): Promise<ApiPaginated<any>> {
  return apiClient.get<ApiPaginated<any>>("/my-caseload", { params })
}

/** GET /cases/{id} — full single case detail */
export function getCase(id: number | string): Promise<any> {
  return apiClient
    .get<ApiEnvelope<any>>(`/cases/${id}`)
    .then((res) => res.data)
}

/** GET /cases/{id}/profile — case profile snapshot */
export function getCaseProfile(id: number | string): Promise<any> {
  return apiClient
    .get<ApiEnvelope<any>>(`/cases/${id}/profile`)
    .then((res) => res.data)
}

/** GET /cases/{id}/history — case audit history */
export function getCaseHistory(id: number | string): Promise<any[]> {
  return apiClient
    .get<ApiEnvelope<any[]>>(`/cases/${id}/history`)
    .then((res) => res.data)
}

/** GET /cases/{id}/activities — case timeline activities */
export function getCaseActivities(id: number | string): Promise<any[]> {
  return apiClient
    .get<ApiEnvelope<any[]>>(`/cases/${id}/activities`)
    .then((res) => res.data)
}

/** POST /cases — open a new case */
export function openCase(payload: OpenCasePayload): Promise<any> {
  return apiClient
    .post<ApiEnvelope<any>>("/cases", payload)
    .then((res) => res.data)
}

/** PUT /cases/{id} — update a case */
export function updateCase(id: number | string, payload: UpdateCasePayload): Promise<any> {
  return apiClient
    .put<ApiEnvelope<any>>(`/cases/${id}`, payload)
    .then((res) => res.data)
}

/** POST /cases/{id}/assign — assign case to a worker */
export function assignCase(id: number | string, payload: AssignPayload): Promise<any> {
  return apiClient
    .post<ApiEnvelope<any>>(`/cases/${id}/assign`, payload)
    .then((res) => res.data)
}

/** POST /cases/{id}/close — close case */
export function closeCase(id: number | string, payload?: CloseCasePayload): Promise<any> {
  return apiClient
    .post<ApiEnvelope<any>>(`/cases/${id}/close`, payload || {})
    .then((res) => res.data)
}

/** POST /cases/{id}/refer — refer case */
export function referCase(id: number | string, payload: ReferPayload): Promise<any> {
  return apiClient
    .post<ApiEnvelope<any>>(`/cases/${id}/refer`, payload)
    .then((res) => res.data)
}

/** POST /cases/{id}/reopen — reopen closed/referred case */
export function reopenCase(id: number | string, notes?: string): Promise<any> {
  return apiClient
    .post<ApiEnvelope<any>>(`/cases/${id}/reopen`, { notes })
    .then((res) => res.data)
}

/** DELETE /cases/{id} — archive a case */
export function archiveCase(id: number | string): Promise<void> {
  return apiClient.delete(`/cases/${id}`)
}

/** POST /cases/{id}/restore — restore an archived case */
export function restoreCase(id: number | string): Promise<any> {
  return apiClient
    .post<ApiEnvelope<any>>(`/cases/${id}/restore`)
    .then((res) => res.data)
}

/** GET /hospital-case-types — admission type lookups */
export function getHospitalCaseTypes(): Promise<HospitalLookupItem[]> {
  return apiClient
    .get<ApiEnvelope<HospitalLookupItem[]>>("/hospital-case-types")
    .then((res) => res.data)
    .catch(() => [])
}

/** GET /hospital-transaction-types — transaction type lookups */
export function getHospitalTransactionTypes(): Promise<HospitalLookupItem[]> {
  return apiClient
    .get<ApiEnvelope<HospitalLookupItem[]>>("/hospital-transaction-types")
    .then((res) => res.data)
    .catch(() => [])
}

/** GET /cases/{id}/summary-pdf — download case summary PDF */
export function downloadCaseSummaryPdf(id: number | string): Promise<Blob> {
  return fetchBlob(`/cases/${id}/summary-pdf`)
}

