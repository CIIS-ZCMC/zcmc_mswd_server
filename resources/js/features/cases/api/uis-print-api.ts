import { apiClient, fetchBlob } from "@/lib/api-client"
import type { ApiEnvelope } from "@/features/patients/types/api.types"
import type { ApiUisPrintLog, ApiUisReadiness } from "../types/api.types"

export interface CaseUisPdfOptions {
  copies?: number
  remarks?: string
  preview?: boolean
  blank?: boolean
  filename?: string
}

/**
 * GET /cases/{id}/uis — readiness information for printing the Unified Intake Sheet.
 */
export function getCaseUisReadiness(caseId: number | string): Promise<ApiUisReadiness> {
  return apiClient
    .get<ApiEnvelope<ApiUisReadiness>>(`/cases/${caseId}/uis`)
    .then((res) => res.data)
}

/**
 * GET /cases/{id}/uis/pdf — streams the rendered Unified Intake Sheet (ANNEX B).
 * When `preview: true`, opens the PDF in a new tab without logging a print server-side.
 * Otherwise triggers a download and logs the print count and remarks.
 */
export async function downloadCaseUisPdf(
  caseId: number | string,
  options?: CaseUisPdfOptions | string
): Promise<void> {
  const opts: CaseUisPdfOptions =
    typeof options === "string" ? { filename: options } : (options ?? {})

  const params: Record<string, string | number | boolean | undefined> = {
    copies: opts.copies && opts.copies > 1 ? opts.copies : undefined,
    remarks: opts.remarks?.trim() || undefined,
    blank: opts.blank ? 1 : undefined,
  }

  if (opts.preview) {
    params.preview = 1
  } else {
    params.download = 1
  }

  const blob = await fetchBlob(`/cases/${caseId}/uis/pdf`, params)
  const url = URL.createObjectURL(blob)

  if (opts.preview) {
    window.open(url, "_blank")
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  } else {
    const link = document.createElement("a")
    link.href = url
    link.download = opts.filename || `UIS-CASE-${caseId}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}

/**
 * GET /cases/{id}/uis/prints — history of past UIS prints for this case.
 */
export function listCaseUisPrints(caseId: number | string): Promise<ApiUisPrintLog[]> {
  return apiClient
    .get<ApiEnvelope<ApiUisPrintLog[]>>(`/cases/${caseId}/uis/prints`)
    .then((res) => res.data)
}

/**
 * Streams the UIS PDF with `preview: 1` and returns a blob object URL for embedding in an in-page <iframe> preview.
 * Returns both the object URL and a revoke callback to free memory when the modal closes.
 */
export async function getCaseUisPreviewBlobUrl(
  caseId: number | string
): Promise<{ url: string; revoke: () => void }> {
  const blob = await fetchBlob(`/cases/${caseId}/uis/pdf`, { preview: 1 })
  const url = URL.createObjectURL(blob)
  return {
    url,
    revoke: () => URL.revokeObjectURL(url),
  }
}

