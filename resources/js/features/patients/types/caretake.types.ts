/**
 * Custody: who is responsible for a patient, as a standing assignment across
 * every one of that patient's episodes.
 *
 * Distinct from the *episode handler* (`cases.assigned_user_id`, surfaced as
 * `PatientRecord.assignedStaff`), which is per-case and owned by the case
 * module. A caretaker row outlives any single case.
 */

/**
 * The server's role list. `patient_caretakers.role` is validated as
 * `string|max:255` with no DB enum, so this union is a convention rather
 * than a guarantee about what a read can contain — `toCaretakerRole` in the
 * adapter folds anything unrecognized into `"others"`, keeping the mismatch
 * in one place instead of widening this to `string` everywhere.
 */
export const CARETAKER_ROLES = [
  "social_worker",
  "case_manager",
  "nurse",
  "counselor",
  "others",
] as const

export type CaretakerRole = (typeof CARETAKER_ROLES)[number]

export const CARETAKER_ROLE_LABELS: Record<CaretakerRole, string> = {
  social_worker: "Social Worker",
  case_manager: "Case Manager",
  nurse: "Nurse",
  counselor: "Counselor",
  others: "Others",
}

export interface CaretakerAssignment {
  id: string
  user: { id: string; name: string }
  role: CaretakerRole
  assignedDate: string
  /** Who made the assignment. Empty until the server records it (its Phase 3). */
  assignedBy: string
  reason: string
  unassignedDate?: string
  unassignedBy?: string
  unassignedReason?: string
  /**
   * Set only by a *reassign*, never by unassign-then-assign — it is what
   * lets the history list render a handover chain instead of two unrelated
   * rows. Points at the assignment that superseded this one.
   */
  replacedById?: string
  isActive: boolean
}
