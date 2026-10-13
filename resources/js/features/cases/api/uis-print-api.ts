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
 * Whose Unified Intake Sheet: an intake assessment (with or without a case,
 * `/assessments/{id}/uis`) or a case's intake (`/cases/{id}/uis`). See
 * docs/INTAKE_ASSESSMENT_PLAN.md.
 */
export type UisTarget = { assessmentId: number } | { caseId: number | string }

export function uisPath(target: UisTarget): string {
  return "assessmentId" in target
    ? `/assessments/${target.assessmentId}/uis`
    : `/cases/${target.caseId}/uis`
}

/** A stable cache key for a target ("assessment-5", "case-12"). */
export function uisTargetKey(target: UisTarget): string {
  return "assessmentId" in target
    ? `assessment-${target.assessmentId}`
    : `case-${target.caseId}`
}

/**
 * GET …/uis — readiness information for printing the Unified Intake Sheet.
 */
export function getUisReadiness(target: UisTarget): Promise<ApiUisReadiness> {
  return apiClient
    .get<ApiEnvelope<ApiUisReadiness>>(uisPath(target))
    .then((res) => res.data)
}

/**
 * GET …/uis/pdf — streams the rendered Unified Intake Sheet (ANNEX B).
 * When `preview: true`, opens the PDF in a new tab without logging a print server-side.
 * Otherwise triggers a download and logs the print count and remarks.
 */
export async function downloadUisPdf(
  target: UisTarget,
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

  const blob = await fetchBlob(`${uisPath(target)}/pdf`, params)
  const url = URL.createObjectURL(blob)

  if (opts.preview) {
    window.open(url, "_blank")
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  } else {
    const link = document.createElement("a")
    link.href = url
    link.download = opts.filename || `UIS-${uisTargetKey(target).toUpperCase()}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}

/**
 * GET …/uis/prints — history of past UIS prints of this encounter.
 */
export function listUisPrints(target: UisTarget): Promise<ApiUisPrintLog[]> {
  return apiClient
    .get<ApiEnvelope<ApiUisPrintLog[]>>(`${uisPath(target)}/prints`)
    .then((res) => res.data)
}

/**
 * Streams the UIS PDF with `preview: 1` and returns a blob object URL for embedding in an in-page <iframe> preview.
 * Returns both the object URL and a revoke callback to free memory when the modal closes.
 */
export async function getUisPreviewBlobUrl(
  target: UisTarget
): Promise<{ url: string; revoke: () => void }> {
  const blob = await fetchBlob(`${uisPath(target)}/pdf`, { preview: 1 })
  const url = URL.createObjectURL(blob)
  return {
    url,
    revoke: () => URL.revokeObjectURL(url),
  }
}
