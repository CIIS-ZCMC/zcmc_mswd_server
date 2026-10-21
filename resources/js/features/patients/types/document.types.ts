/**
 * A file uploaded for a patient. `type` is the Library document type's name at
 * upload time; the case is optional. The file itself is read through the server
 * (never a storage path), so a document carries only its details here.
 */
export interface DocumentItem {
  id: number
  typeId: number | null
  type: string
  fileName: string
  fileType: string
  /** Bytes; null on uploads from before sizes were kept. */
  fileSize: number | null
  caseId: number | null
  caseCode: string | null
  uploadedByName: string | null
  uploadedAt: string
}

/** What the upload dialog collects. */
export interface UploadDocumentInput {
  file: File
  documentTypeId: number
  caseId?: number | null
}
