import type { ApiCaseWatcher, ApiWatcherStatus } from "../types/api.types"
import type { CaseWatcher, WatcherRequirement, WatcherStatus } from "../types/watcher.types"

export function toCaseWatcher(api: ApiCaseWatcher): CaseWatcher {
  return {
    id: String(api.id),
    caseId: String(api.case_id),
    patientWatcherId: api.patient_watcher_id ? String(api.patient_watcher_id) : null,
    fullName: api.name,
    relationship: api.relationship,
    contactNo: api.contact_number,
    address: api.address,
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
    hasPrimary: Boolean(api.has_primary),
    satisfied: Boolean(api.satisfied),
    blocking: Boolean(api.blocking),
  }
}
