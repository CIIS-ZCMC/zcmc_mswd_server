import type { CaseProgressNote, NoteType } from "../types/progress-note.types"

export function toCaseProgressNote(raw: any): CaseProgressNote {
  if (!raw) return {} as CaseProgressNote

  return {
    id: Number(raw.id),
    caseId: Number(raw.case_id ?? raw.caseId),
    noteType: (raw.note_type ?? raw.noteType ?? "progress") as NoteType,
    narrative: raw.narrative ?? "",
    noteDate: raw.note_date ?? raw.noteDate ?? "",
    followUpOn: raw.follow_up_on ?? raw.followUpOn ?? null,
    followUpCompletedAt: raw.follow_up_completed_at ?? raw.followUpCompletedAt ?? null,
    authorId: raw.author_id ?? raw.authorId ?? null,
    authorName: raw.author_name ?? raw.authorName ?? raw.author?.name ?? null,
    isEditable: Boolean(raw.is_editable ?? raw.isEditable ?? true),
    createdAt: raw.created_at ?? raw.createdAt ?? "",
    updatedAt: raw.updated_at ?? raw.updatedAt ?? "",
    caseCode: raw.case_code ?? raw.caseCode ?? raw.case?.case_code ?? null,
    patientName: raw.patient_name ?? raw.patientName ?? raw.case?.patient?.name ?? null,
    patientId: raw.patient_id ?? raw.patientId ?? raw.case?.patient_id ?? null,
  }
}

export function toCaseProgressNoteList(list: any[]): CaseProgressNote[] {
  if (!Array.isArray(list)) return []
  return list.map(toCaseProgressNote)
}
