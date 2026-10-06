/**
 * Backend `assessments.classification` is a free string (see migration
 * comment: "indigent, low_income, self_sufficient, others") with no DB or
 * validation-level enum — so this is intentionally `string`, not a fixed
 * union. Previously this was "Category C1"|"C2"|"C3"|"D", which doesn't
 * exist anywhere in the backend; dropped in favor of the real values.
 */
export type MedicalCategory = string

/** Mirrors the backend `patient_family_members` columns one-for-one. */
export interface FamilyMember {
  id: string
  fullName: string
  relationship: string
  /** Normalized to `YYYY-MM-DD`; the API emits a full ISO datetime. */
  birthdate: string
  sex: string
  age: number
  civilStatus?: string
  occupation: string
  monthlyIncome: number
  educationalAttainment: string
  contactNumber: string
  isLivingWithPatient: boolean
}

/**
 * The handler of the patient's most recent *episode* — `cases.assigned_user`
 * and `cases.date_opened`, nothing more. Standing custody is a separate
 * concern; see `CaretakerAssignment` in caretake.types.ts.
 *
 * `socialWorkerId` (no RSW licence column exists), `caseOfficer` (no such
 * role exists apart from the assigned user) and `shift` (invented outright,
 * always "Morning") were dropped — none had a backing field.
 */
export interface StaffAssignment {
  socialWorker: string
  /**
   * Clinical data, outside this system's module boundary. Kept as an
   * explicit "not tracked" note rather than silently omitted, so the UI can
   * say why the field is blank instead of implying it is unassigned.
   */
  attendingPhysician: string
  assignedDate: string
}

export interface SocialCaseStudy {
  caseNumber: string
  assessmentDate: string
  category: MedicalCategory
  classificationDetails: string
  presentingProblem: string
  socialWorkerNotes: string
}
