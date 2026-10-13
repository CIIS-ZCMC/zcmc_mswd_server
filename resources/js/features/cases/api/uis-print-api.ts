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
    link.download =
      opts.filename || `UIS-${uisTargetKey(target).toUpperCase()}.pdf`
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
  target: UisTarget,
  options?: { blank?: boolean }
): Promise<{ url: string; revoke: () => void }> {
  const params: Record<string, string | number | boolean | undefined> = {
    preview: 1,
  }
  if (options?.blank) {
    params.blank = 1
  }
  const blob = await fetchBlob(`${uisPath(target)}/pdf`, params)
  const url = URL.createObjectURL(blob)
  return {
    url,
    revoke: () => URL.revokeObjectURL(url),
  }
}

/**
 * Triggers server-side print logging for an encounter or case without downloading a file.
 */
export async function logUisPrint(
  target: UisTarget,
  options?: { blank?: boolean; copies?: number; remarks?: string }
): Promise<void> {
  const params: Record<string, string | number | boolean | undefined> = {
    copies: options?.copies && options.copies > 1 ? options.copies : undefined,
    remarks: options?.remarks?.trim() || undefined,
    blank: options?.blank ? 1 : undefined,
  }
  // Omitting preview: 1 records the print on the server
  // Omitting download: 1 streams the response without triggering a browser download
  await fetchBlob(`${uisPath(target)}/pdf`, params)
}

/**
 * Directly streams the UIS PDF into a hidden iframe and invokes the browser's
 * native system print dialog (with printer destination and copy settings),
 * while simultaneously recording the official print log on the server.
 */
export async function printUisDirectly(
  target: UisTarget,
  options?: { blank?: boolean; copies?: number; remarks?: string }
): Promise<void> {
  const params: Record<string, string | number | boolean | undefined> = {
    copies: options?.copies && options.copies > 1 ? options.copies : undefined,
    remarks: options?.remarks?.trim() || undefined,
    blank: options?.blank ? 1 : undefined,
    // Omitting preview: 1 triggers server-side print logging in CaseIntakeSheetPdfController
    // Omitting download: 1 returns the streamed PDF instead of forcing a file download
  }

  const blob = await fetchBlob(`${uisPath(target)}/pdf`, params)
  const url = URL.createObjectURL(blob)

  const iframe = document.createElement("iframe")
  iframe.style.position = "fixed"
  iframe.style.right = "0"
  iframe.style.bottom = "0"
  iframe.style.width = "0"
  iframe.style.height = "0"
  iframe.style.border = "none"
  iframe.src = url

  document.body.appendChild(iframe)

  const cleanup = () => {
    setTimeout(() => {
      iframe.remove()
      URL.revokeObjectURL(url)
    }, 60_000)
  }

  return new Promise<void>((resolve) => {
    let handled = false
    const triggerPrint = () => {
      if (handled) return
      handled = true
      try {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
      } catch {
        const win = window.open(url, "_blank")
        win?.focus()
        win?.print()
      }
      cleanup()
      resolve()
    }

    iframe.onload = () => {
      setTimeout(triggerPrint, 500)
    }

    // Fallback timer if onload doesn't fire for PDF plugin in certain browsers
    setTimeout(triggerPrint, 2500)
  })
}
