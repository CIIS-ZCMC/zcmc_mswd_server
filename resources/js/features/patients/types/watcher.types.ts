/** One case a patient watcher is assigned to (a `case_watchers` row). */
export interface WatcherAssignment {
  id: string
  caseId: string
  caseCode: string | null
  caseStatus: string | null
  isPrimary: boolean
  isInformant: boolean
  passNumber: string | null
  passStatus: string
}

/**
 * A person who watches over the patient — the single record of who they are.
 * Assigning them to an open case is what gives them a primary role and a ward
 * pass; a watcher with no assignment is simply a known contact.
 */
export interface Watcher {
  id: string
  /** The composed full name, e.g. "Maria L. Reyes". */
  fullName: string
  lastName: string
  firstName: string
  middleName: string
  /** Display label, e.g. "Barangay Official". */
  relationship: string
  /** Master-list code, e.g. "barangay_official" — what the API takes. */
  relationshipCode: string
  contactNo: string
  address: string
  notes: string
  assignments: WatcherAssignment[]
}

/** A case a watcher can still be assigned to (open or ongoing). */
export interface OpenCase {
  id: number
  caseCode: string
  status: string
  admissionType: string | null
  dateOpened: string | null
}
