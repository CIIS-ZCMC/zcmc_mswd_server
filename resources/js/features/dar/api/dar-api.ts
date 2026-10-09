import { apiClient, fetchBlob } from "@/lib/api-client"
import { openPdfInNewTab } from "@/lib/open-pdf"
import type {
  DarEntry,
  DarResponse,
  StoreDarEntryPayload,
  UpdateDarEntryPayload,
} from "../types/dar.types"

/**
 * GET /api/dar?date=YYYY-MM-DD
 * Fetch the worker's DAR entries and summary for the specified date.
 */
export async function getDar(date?: string): Promise<DarResponse> {
  return apiClient.get<DarResponse>("/dar", {
    params: date ? { date } : undefined,
  })
}

/**
 * POST /api/dar-entries
 * Create a new entry on the worker's DAR.
 */
export async function createDarEntry(
  payload: StoreDarEntryPayload
): Promise<DarEntry> {
  const res = await apiClient.post<{ data: DarEntry }>("/dar-entries", payload)
  return res.data
}

/**
 * PATCH /api/dar-entries/{id}
 * Update an existing entry on the worker's DAR.
 */
export async function updateDarEntry(
  id: number,
  payload: UpdateDarEntryPayload
): Promise<DarEntry> {
  const res = await apiClient.patch<{ data: DarEntry }>(
    `/dar-entries/${id}`,
    payload
  )
  return res.data
}

/**
 * DELETE /api/dar-entries/{id}
 * Soft-delete an entry from the worker's DAR.
 */
export async function deleteDarEntry(id: number): Promise<void> {
  await apiClient.delete(`/dar-entries/${id}`)
}

/**
 * Open the DAR printable PDF report in a new tab or trigger download.
 */
export async function exportDarPdf(
  date: string,
  download = false
): Promise<void> {
  await openPdfInNewTab("/dar/export", {
    date,
    format: "pdf",
    download: download ? 1 : undefined,
  })
}

/**
 * Download the DAR export as CSV.
 */
export async function exportDarCsv(date: string): Promise<void> {
  const blob = await fetchBlob("/dar/export", {
    date,
    format: "csv",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `DAR_${date}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
