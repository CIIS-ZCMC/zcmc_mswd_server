import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  deletePatientDocument,
  listPatientDocuments,
  uploadPatientDocument,
  type ListPatientDocumentsParams,
} from "../api/documents-api"
import type { UploadDocumentInput } from "../types/document.types"
import { patientDetailKeys } from "./use-patient-detail"

export const patientDocumentKeys = {
  all: (patientId: number) =>
    ["patients", "detail", patientId, "documents"] as const,
  list: (patientId: number, filters: ListPatientDocumentsParams) =>
    [...patientDocumentKeys.all(patientId), filters] as const,
}

export function usePatientDocuments(
  patientId: number,
  filters: ListPatientDocumentsParams = {}
) {
  return useQuery({
    queryKey: patientDocumentKeys.list(patientId, filters),
    queryFn: () => listPatientDocuments(patientId, filters),
    enabled: patientId > 0,
  })
}

/** Upload and delete, each refreshing the list and the profile (its tab count). */
export function usePatientDocumentMutations(patientId: number) {
  const queryClient = useQueryClient()

  const refresh = () => {
    queryClient.invalidateQueries({
      queryKey: patientDocumentKeys.all(patientId),
    })
    queryClient.invalidateQueries({
      queryKey: patientDetailKeys(patientId).profile,
    })
  }

  const upload = useMutation({
    mutationFn: (input: UploadDocumentInput) =>
      uploadPatientDocument(patientId, input),
    onSuccess: refresh,
  })

  const remove = useMutation({
    mutationFn: (documentId: number) =>
      deletePatientDocument(patientId, documentId),
    onSuccess: refresh,
  })

  return { upload, remove }
}
