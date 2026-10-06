/**
 * Backend `documents.document_type` is a free string (no enum), and there is
 * no verification-status or file-size column on the Document model at all —
 * both typed as `string` rather than a fixed union the backend can't back.
 */
export type DocumentCategory = string
export type DocumentStatus = string

export interface DocumentItem {
  id: string
  title: string
  category: DocumentCategory
  uploadDate: string
  status: DocumentStatus
  fileSize: string
}
