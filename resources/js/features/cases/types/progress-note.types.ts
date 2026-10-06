export type NoteType =
  | "progress"
  | "home_visit"
  | "phone_follow_up"
  | "conference"
  | "referral_follow_up"
  | "other"

export interface CaseProgressNote {
  id: number
  caseId: number
  noteType: NoteType
  narrative: string
  noteDate: string
  followUpOn: string | null
  followUpCompletedAt: string | null
  authorId: number | null
  authorName: string | null
  isEditable: boolean
  createdAt: string
  updatedAt: string
  // Attached case & patient info when returned from /my-follow-ups
  caseCode?: string | null
  patientName?: string | null
  patientId?: number | null
}

export interface CreateProgressNotePayload {
  note_type: NoteType
  narrative: string
  note_date: string
  follow_up_on?: string | null
}

export interface UpdateProgressNotePayload {
  note_type?: NoteType
  narrative?: string
  note_date?: string
  follow_up_on?: string | null
}
