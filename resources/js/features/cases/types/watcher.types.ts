export interface CaseWatcher {
  id: string
  caseId: string
  patientWatcherId: string
  fullName: string
  /** Display label, e.g. "Spouse". */
  relationship: string
  relationshipCode: string
  contactNo: string | null
  address: string | null
  isPrimary: boolean
  isInformant: boolean
  passNumber: string | null
  passValidUntil: string | null
  passStatus: "active" | "expired" | "revoked" | string
  presentFrom: string | null
  presentUntil: string | null
  addedBy: { id: string; name: string } | null
  notes: string | null
}

export type WatcherRequirement = "required" | "recommended" | "optional" | "waived"

/** Why the requirement is what it is; drives the banner text. */
export type WatcherRequirementReason =
  | "legacy"
  | "waived"
  | "minor"
  | "incapacitated"
  | "inpatient"
  | "er"
  | "opd"

export interface WatcherWaiver {
  reason: string
  note: string | null
  waivedBy: string | null
  waivedAt: string | null
}

export interface WatcherStatus {
  requirement: WatcherRequirement
  requirementReason: WatcherRequirementReason
  hasPrimary: boolean
  satisfied: boolean
  blocking: boolean
  waiver: WatcherWaiver | null
}

export interface WatcherRelationshipType {
  id: string
  name: string
  code: string
}
