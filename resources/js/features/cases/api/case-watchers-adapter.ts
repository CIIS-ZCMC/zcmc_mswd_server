import type { ApiCaseWatcher, ApiWatcherStatus } from "../types/api.types"
import type { CaseWatcher, WatcherRequirement, WatcherRequirementReason, WatcherStatus } from "../types/watcher.types"

export function toCaseWatcher(api: ApiCaseWatcher): CaseWatcher {
  return {
    id: String(api.id),
    caseId: String(api.case_id),
    patientWatcherId: String(api.patient_watcher_id),
    fullName: api.watcher?.name ?? api.name,
    relationship: api.watcher?.relationship_label ?? api.relationship,
    relationshipCode: api.watcher?.relationship_code ?? api.relationship,
    contactNo: api.watcher?.contact_number ?? api.contact_number,
    address: api.watcher?.address ?? api.address,
    isPrimary: api.is_primary,
    isInformant: api.is_informant,
    passNumber: api.pass_number,
    passValidUntil: api.pass_valid_until,
    passStatus: api.pass_status,
    presentFrom: api.present_from,
    presentUntil: api.present_until,
    addedBy: api.added_by
      ? {
          id: String(api.added_by.id),
          name: api.added_by.name,
        }
      : null,
    notes: api.notes,
  }
}

export function toWatcherStatus(api: ApiWatcherStatus): WatcherStatus {
  const req = (api.requirement ?? "optional").toLowerCase() as WatcherRequirement
  const requirement: WatcherRequirement = ["required", "recommended", "optional", "waived"].includes(req)
    ? req
    : "optional"

  return {
    requirement,
    requirementReason: (api.requirement_reason ?? "opd") as WatcherRequirementReason,
    hasPrimary: Boolean(api.has_primary),
    satisfied: Boolean(api.satisfied),
    blocking: Boolean(api.blocking),
    waiver: api.waiver
      ? {
          reason: api.waiver.reason,
          note: api.waiver.note,
          waivedBy: api.waiver.waived_by,
          waivedAt: api.waiver.waived_at,
        }
      : null,
  }
}
