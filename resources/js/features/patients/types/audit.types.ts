/**
 * One field's before/after within a single audit entry. Built from the
 * server's `changes` payload (spatie's `properties`, which carries
 * `attributes` for the new values and `old` for the previous ones).
 *
 * `from` is absent on a `created` event and `to` is absent on a `deleted`
 * one, so both sides are `unknown` rather than a narrower type — the value
 * is whatever column type the audited model holds, and formatting it is the
 * renderer's job, not this type's.
 */
export interface AuditFieldChange {
  field: string
  /** Human label for `field`; falls back to a de-snake-cased `field`. */
  label: string
  from: unknown
  to: unknown
}

/** The events the server records (created, updated, deleted, restored). Reads are not logged. */
export type AuditEvent = "created" | "updated" | "deleted" | "restored"

export interface AuditHistory {
  id: string
  timestamp: string
  /** The raw event, for filtering. Unrecognized values fall back to `"updated"`. */
  event: AuditEvent
  /** Display label, e.g. "Watcher updated" — derived from `subjectLabel` + `event`. */
  action: string
  performedBy: string
  /** Model basename, e.g. `"PatientWatcher"` — for grouping and filtering. */
  subjectType: string
  subjectId: string
  /** Server-supplied identifying label, e.g. `"Watcher: Maria Cruz"`. */
  subjectLabel: string
  /** Ownership columns; present once the server stamps them. */
  patientId?: string
  caseId?: string
  details: string
  changes: AuditFieldChange[]
}
