import { apiClient, fetchBlob } from "@/lib/api-client"
import type { ApiEnvelope, ApiSocialCase } from "@/features/patients/types/api.types"
import type { StartSocialCasePayload, UpdateSocialCasePayload } from "../types"

/**
 * GET /cases/{case}/social-case
 * Normalizes 404 (no SCSR yet) to `null` so hook consumers only handle `data === null`.
 */
export function getSocialCase(caseId: number): Promise<ApiSocialCase | null> {
  return apiClient
    .get<ApiEnvelope<ApiSocialCase>>(`/cases/${caseId}/social-case`)
    .then((res) => res.data)
    .catch((err: any) => {
      if (err?.status === 404 || err?.response?.status === 404) {
        return null
      }
      throw err
    })
}

/** POST /cases/{case}/social-case — creates/promotes assessment to draft SCSR */
export function startSocialCase(caseId: number, payload?: StartSocialCasePayload): Promise<ApiSocialCase> {
  return apiClient
    .post<ApiEnvelope<ApiSocialCase>>(`/cases/${caseId}/social-case`, payload ?? {})
    .then((res) => res.data)
}

/** PUT /cases/{case}/social-case — updates SCSR draft / narrative sections */
export function updateSocialCase(caseId: number, payload: UpdateSocialCasePayload): Promise<ApiSocialCase> {
  return apiClient
    .put<ApiEnvelope<ApiSocialCase>>(`/cases/${caseId}/social-case`, payload)
    .then((res) => res.data)
}

/** POST /cases/{case}/social-case/submit — draft -> for_review */
export function submitSocialCase(caseId: number): Promise<ApiSocialCase> {
  return apiClient
    .post<ApiEnvelope<ApiSocialCase>>(`/cases/${caseId}/social-case/submit`)
    .then((res) => res.data)
}

/** POST /cases/{case}/social-case/finalize — draft/for_review -> finalized */
export function finalizeSocialCase(caseId: number): Promise<ApiSocialCase> {
  return apiClient
    .post<ApiEnvelope<ApiSocialCase>>(`/cases/${caseId}/social-case/finalize`)
    .then((res) => res.data)
}

/** POST /cases/{case}/social-case/amend — finalized -> draft/reopened */
export function amendSocialCase(caseId: number, reason: string): Promise<ApiSocialCase> {
  return apiClient
    .post<ApiEnvelope<ApiSocialCase>>(`/cases/${caseId}/social-case/amend`, { reason })
    .then((res) => res.data)
}

/** GET /cases/{case}/social-case/pdf — downloads rendered SCSR PDF with bearer token */
export function downloadSocialCasePdf(caseId: number, filename: string): Promise<void> {
  return fetchBlob(`/cases/${caseId}/social-case/pdf`, { download: 1 }).then((blob) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  })
}
