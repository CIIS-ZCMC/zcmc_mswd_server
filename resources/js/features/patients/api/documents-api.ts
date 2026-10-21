import { apiClient, fetchBlob } from "@/lib/api-client"
import type { ApiDocument, ApiEnvelope } from "../types/api.types"
import type { DocumentItem, UploadDocumentInput } from "../types/document.types"
import { toDocumentItem } from "./patients-adapter"

export interface ListPatientDocumentsParams {
  documentTypeId?: number
  caseId?: number
}

/** GET /patients/{id}/documents — newest first. */
export function listPatientDocuments(
  patientId: number,
  filters: ListPatientDocumentsParams = {}
): Promise<DocumentItem[]> {
  return apiClient
    .get<ApiEnvelope<ApiDocument[]>>(`/patients/${patientId}/documents`, {
      params: {
        document_type_id: filters.documentTypeId,
        case_id: filters.caseId,
      },
    })
    .then((res) => res.data.map(toDocumentItem))
}

/** POST /patients/{id}/documents — multipart; the case is optional. */
export function uploadPatientDocument(
  patientId: number,
  input: UploadDocumentInput
): Promise<DocumentItem> {
  const form = new FormData()
  form.append("file", input.file)
  form.append("document_type_id", String(input.documentTypeId))
  if (input.caseId) {
    form.append("case_id", String(input.caseId))
  }

  return apiClient
    .post<ApiEnvelope<ApiDocument>>(`/patients/${patientId}/documents`, form)
    .then((res) => toDocumentItem(res.data))
}

/** DELETE /patients/{id}/documents/{document} — soft delete; the file stays in storage. */
export function deletePatientDocument(
  patientId: number,
  documentId: number
): Promise<void> {
  return apiClient.delete(`/patients/${patientId}/documents/${documentId}`)
}

/**
 * GET /patients/{id}/documents/{document}/file — streams the stored file through the
 * server. Opens it in a new tab, or saves it under its own name when `download`.
 */
export async function openPatientDocument(
  patientId: number,
  document: Pick<DocumentItem, "id" | "fileName">,
  options: { download?: boolean } = {}
): Promise<void> {
  // Open the tab inside the click, before the await, or the browser blocks it.
  const tab = options.download ? null : window.open("", "_blank")

  try {
    const blob = await fetchBlob(
      `/patients/${patientId}/documents/${document.id}/file`,
      { download: options.download ? 1 : undefined }
    )
    const url = URL.createObjectURL(blob)

    if (options.download) {
      const link = window.document.createElement("a")
      link.href = url
      link.download = document.fileName
      window.document.body.appendChild(link)
      link.click()
      window.document.body.removeChild(link)
      URL.revokeObjectURL(url)
      return
    }

    if (tab) {
      tab.location.href = url
    } else {
      window.open(url, "_blank")
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (error) {
    tab?.close()
    throw error
  }
}
