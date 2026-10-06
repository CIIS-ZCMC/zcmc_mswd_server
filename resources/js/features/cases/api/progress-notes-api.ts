import { apiClient } from "@/lib/api-client"
import type { ApiEnvelope } from "@/features/patients/types/api.types"
import type {
  CaseProgressNote,
  CreateProgressNotePayload,
  UpdateProgressNotePayload,
} from "../types/progress-note.types"
import { toCaseProgressNote, toCaseProgressNoteList } from "./progress-notes-adapter"

/** GET /cases/{caseId}/progress-notes */
export async function getCaseProgressNotes(caseId: number | string): Promise<CaseProgressNote[]> {
  const res = await apiClient.get<ApiEnvelope<any[]>>(`/cases/${caseId}/progress-notes`)
  return toCaseProgressNoteList(res.data)
}

/** POST /cases/{caseId}/progress-notes */
export async function createCaseProgressNote(
  caseId: number | string,
  payload: CreateProgressNotePayload
): Promise<CaseProgressNote> {
  const res = await apiClient.post<ApiEnvelope<any>>(`/cases/${caseId}/progress-notes`, payload)
  return toCaseProgressNote(res.data)
}

/** PUT /case-progress-notes/{noteId} */
export async function updateCaseProgressNote(
  noteId: number | string,
  payload: UpdateProgressNotePayload
): Promise<CaseProgressNote> {
  const res = await apiClient.put<ApiEnvelope<any>>(`/case-progress-notes/${noteId}`, payload)
  return toCaseProgressNote(res.data)
}

/** DELETE /case-progress-notes/{noteId} */
export async function deleteCaseProgressNote(noteId: number | string): Promise<void> {
  await apiClient.delete(`/case-progress-notes/${noteId}`)
}

/** POST /case-progress-notes/{noteId}/complete-follow-up */
export async function completeProgressNoteFollowUp(
  noteId: number | string
): Promise<CaseProgressNote> {
  const res = await apiClient.post<ApiEnvelope<any>>(
    `/case-progress-notes/${noteId}/complete-follow-up`
  )
  return toCaseProgressNote(res.data)
}

/** GET /my-follow-ups */
export async function getMyFollowUps(): Promise<CaseProgressNote[]> {
  const res = await apiClient.get<ApiEnvelope<any[]>>("/my-follow-ups")
  return toCaseProgressNoteList(res.data)
}
