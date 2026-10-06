export interface CaseWatcher {
  id: string
  caseId: string
  patientWatcherId: string | null
  fullName: string
  relationship: string
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

export interface WatcherStatus {
  requirement: WatcherRequirement
  hasPrimary: boolean
  satisfied: boolean
  blocking: boolean
}

export interface WatcherRelationshipType {
  id: string
  name: string
  code: string
}
