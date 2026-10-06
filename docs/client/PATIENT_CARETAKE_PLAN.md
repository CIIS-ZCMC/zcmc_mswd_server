# MSWD Client — Patient Caretake Plan

Client half of the Patient Caretake module: **custody** (who is responsible for a
patient) and **accountability** (who created, updated or deleted patient data).
Four phases, each independently verifiable and revertable.

The server half lives in `zcmc_mswd_server/docs/PATIENT_CARETAKE_PLAN.md`
(Phases 1–5) and carries the schema, endpoint and permission definitions. Every
phase here is gated on a server phase — see the table.

**Status legend:** ☐ not started · ◐ in progress · ☑ done

| Phase | Gate | Status |
|-------|------|--------|
| 6. Types, API and adapter | server 4 | ☑ |
| 7. Caretake tab (custody) | server 3 + phase 6 | ☑ |
| 8. History tab (accountability) | server 2 + phase 6 | ☑ |
| 9. Global audit log + inline history | server 4 + phase 6 | ☑ |

---

## Background — what exists today

Less is mocked here than the tab names suggest. The accurate picture:

**The history trail is already real, and already thin.**
`usePatientDetail` runs `getPatientHistory(patientId)` →
`GET /patients/{id}/history` → `toAuditHistory()` → `patient.history` →
`history-tab.tsx`. It works. What it loses:

- `toAuditHistory` drops `changes` entirely. The server sends field-level
  old→new values in `properties`; the client renders only `description`, so
  *what* changed is never shown — only that something did.
- `action` is derived from `event` with a regex title-case, falling back to the
  raw `subject_type`. There is no per-subject labelling, so "Updated" on a
  watcher and "Updated" on an assessment are indistinguishable in the list.
- No filtering, no grouping, no pagination. The endpoint returns an unpaginated
  collection and the tab maps all of it.

**The staff tab is not reading caretakers at all.** `buildAssignedStaff()` in
`patients-adapter.ts` builds `StaffAssignment` from
`latestCase.assigned_user` — the episode handler — while `raw.caretakers`
(typed as `ApiCaretaker`, eager-loaded by `PatientService::profile()`) is
discarded. The tab therefore shows one name and no assignment history, and its
"Reassign Staff" button is inert. Several `StaffAssignment` fields are
placeholders with no backing data: `socialWorkerId`, `caseOfficer`,
`attendingPhysician` (correctly out of MSS scope), and `shift: "Morning"`, which
is invented outright.

**Nothing renders per-record provenance.** No section of the detail view shows
who last changed it.

**There is no cross-patient audit view.** No route, no page, no nav entry.

---

## Phase 6 — Types, API and adapter ☑

**Gate:** server Phase 4 deployed. **Landed ahead of that gate** — the
type/adapter half is real today (`raw.caretakers` and `changes` were already
on the wire and merely discarded), while the four new endpoints
(`GET /patients/{id}/caretake`, the reassign route, `GET /activity-log`) 404
until the server catches up. Nothing calls them yet, so nothing regresses;
Phase 7 is what actually needs the server.

Foundation for 7–9. No visual change; the two tabs keep rendering what they
render today until their own phases land.

### Types

| File | Change |
|------|--------|
| `src/features/patients/types/audit.types.ts` | expand `AuditHistory` → `id`, `timestamp`, `event` (`"created" \| "updated" \| "deleted"`), `action` (display label), `performedBy`, `subjectType`, `subjectId`, `subjectLabel`, `patientId`, `caseId`, `changes: AuditFieldChange[]`; + `interface AuditFieldChange { field: string; label: string; from: unknown; to: unknown }` |
| `src/features/patients/types/caretake.types.ts` *(new)* | `CaretakerAssignment` — `id`, `user: { id, name }`, `role`, `assignedDate`, `assignedBy`, `reason`, `unassignedDate`, `unassignedBy`, `unassignedReason`, `replacedById`, `isActive`; + `CaretakerRole` union matching the server's `social_worker \| case_manager \| nurse \| counselor \| others` |
| `src/features/patients/types/patient.types.ts` | `assignedStaff: StaffAssignment` → `caretakers: CaretakerAssignment[]`; keep `assignedStaff` for the episode handler but narrow it to what is real (`socialWorker`, `assignedDate`) |
| `src/features/patients/types/case-study.types.ts` | drop `shift`, `socialWorkerId`, `caseOfficer` from `StaffAssignment` — invented fields with no source |
| `src/features/patients/types/api.types.ts` | + `patient_id`, `case_id`, `subject_label` on `ApiActivity`; expand `ApiCaretaker` with the Phase 3 fields; + `ApiCaretakeSummary`, `ApiActivityLogPage` |
| `src/features/patients/types/index.ts` | export the new module |

### API

| File | Change |
|------|--------|
| `src/features/patients/api/patients-api.ts` | + `getPatientCaretake(patientId)` → `GET /patients/{id}/caretake`; + `assignCaretaker`, `reassignCaretaker`, `unassignCaretaker` |
| `src/features/audit/api/activity-log-api.ts` *(new)* | `getActivityLog(filters)` → `GET /activity-log`; `getRecordHistory(subjectType, subjectId)` → the same endpoint with the narrow filter |

`getPatientHistory` stays as-is — `GET /patients/{id}/history` is unchanged by
the server plan, so nothing that calls it breaks.

### Adapter

| Function | Change |
|----------|--------|
| `toAuditHistory` | stop discarding `changes`: map `properties.attributes` / `properties.old` into `AuditFieldChange[]`; take `action` from `subject_label` + `event` instead of the title-case regex |
| `toCaretakerAssignment` *(new)* | `ApiCaretaker` → `CaretakerAssignment` |
| `buildAssignedStaff` | strip the invented fields; keep sourcing `socialWorker` from `latestCase.assigned_user` — that is genuinely the episode handler and stays correct under the decision that custody is patient-level |
| `toPatientDetailRecord` | populate `caretakers` from `raw.caretakers` (already eager-loaded, currently discarded) |

### Hooks

| File | Change |
|------|--------|
| `src/features/patients/hooks/use-patient-detail.ts` | + `caretake` to `patientDetailKeys`; keep the existing `history` query |
| `src/features/patients/hooks/use-caretaker-writes.ts` *(new)* | `useAssignCaretaker` / `useReassignCaretaker` / `useUnassignCaretaker`, each invalidating `profile` **and** `history` on success — a custody change writes to the trail too, so invalidating only the profile leaves the History tab stale |

**Blast radius.** `PatientRecord.assignedStaff` changing shape breaks
`staff-tab.tsx` and `mock-patients.ts` at compile time. That is intended — it is
how Phase 7 is forced to be complete rather than half-migrated. Budget for the
mock file edit in this phase, not the next.

**Gate.** `npm run build` clean; the detail view renders unchanged.

---

## Phase 7 — Caretake tab (custody) ☑

**Gate:** server Phase 3 + Phase 6.

Rename `staff-tab.tsx` → `caretake-tab.tsx` and rebuild it.

### Layout

1. **Episode handler** (one line, read-only) — `latestCase.assigned_user`, with
   the case code and date opened. Labelled as the handler for *that episode*, so
   the distinction from custody is visible rather than implied. Changing it
   belongs to the case module, not here.
2. **Active caretakers** — one card per active assignment: name, role, assigned
   date, assigned by, reason. Actions: **Reassign**, **Unassign**.
3. **Assignment history** — reverse-chronological list of ended assignments,
   each showing who ended it, when, and the handover reason; rows linked by
   `replacedById` render as a chain rather than as unrelated entries.
4. **Assign caretaker** button → dialog.

### Components

| File | Purpose |
|------|---------|
| `components/tabs/caretake-tab.tsx` *(replaces `staff-tab.tsx`)* | the layout above |
| `components/dialogs/assign-caretaker-dialog.tsx` *(new)* | user picker (combobox, from `GET /users`) + role select + reason |
| `components/dialogs/reassign-caretaker-dialog.tsx` *(new)* | new-holder picker + required handover reason; shows the outgoing holder so the action is unambiguous |
| `components/dialogs/unassign-caretaker-dialog.tsx` *(new)* | confirm + optional reason |
| `components/patient-detail-view.tsx` | tab label "Staff" → "Caretake"; wire the new component |

### Rules the UI must enforce

- **One active caretaker per role.** The server rejects a second with a 422
  (Phase 3's unique guard). The role select must disable roles already held, and
  the 422 must surface as a field error on the role, not a toast — the user
  needs to know *which* constraint they hit.
- **Reassign is not unassign + assign.** Only the reassign action writes
  `replaced_by_id`; presenting them as interchangeable breaks the chain in the
  history list. Keep them visually distinct.
- **Reason is required on reassign, optional on assign and unassign.** Matches
  the server's validation; a handover without a stated reason is the case the
  module exists to prevent.
- Gate every write behind `usePermission("patients.update")`; render the tab
  read-only without it.

**Blast radius.** Contained to one tab. `mock-patients.ts` already migrated in
Phase 6.

**Gate.** `npm run build`; manual pass of assign → reassign → unassign against a
real patient, confirming the chain renders and the duplicate-role 422 surfaces
correctly.

---

## Phase 8 — History tab (accountability) ☑

**Gate:** server Phase 2 + Phase 6.

Rebuild `history-tab.tsx` on the data Phase 6 stopped discarding.

| Change | Detail |
|--------|--------|
| Field-level diffs | each entry expands to a `from → to` table built from `AuditFieldChange[]`; collapsed by default so the timeline stays scannable |
| Real labels | `subjectLabel` from the server (`"Watcher: Maria Cruz"`) instead of a bare `subject_type` |
| Day grouping | sticky date headers; relative time ("2 hours ago") on the row, absolute on hover |
| Filters | by user, by action (`created`/`updated`/`deleted`), by record type, by date range — client-side over the returned set for now |
| Empty and loading states | `Empty` and `Skeleton` components, not a bare `.map()` over an assumed array |
| Value formatting | dates, currency (`monthly_income`, assistance `amount`) and booleans formatted per field rather than dumped as raw JSON |

**Sensitive-field handling.** The diff view renders whatever
`changes` contains. Classification, income and assessment fields are the point
of the module and stay visible; nothing here needs masking beyond what the
server already withholds. If a field ever should not be diffable, the fix is
`$hidden`/`logExcept` on the server model — never a client-side filter, which
leaves the value in the network response.

**Volume.** The endpoint stays unpaginated (server Phase 2 keeps it a limited
collection). If a long-lived patient's trail grows past what renders
comfortably, virtualise the list or move this tab to the paginated
`/activity-log` endpoint with a `patient_id` filter — that endpoint exists from
server Phase 4, so the migration is a hook swap, not a redesign.

**Blast radius.** Contained to one tab.

**Gate.** `npm run build`; verify against a patient with edits across several
record types that each diff matches what was actually changed.

---

## Phase 9 — Global audit log and inline history ☑

**Gate:** server Phase 4 + Phase 6.

### Global audit log page

| File | Purpose |
|------|---------|
| `src/features/audit/components/audit-log-page.tsx` *(new)* | paginated table: timestamp, user, action, record type, record, patient |
| `src/features/audit/components/audit-log-filters.tsx` *(new)* | user, date range, action, record type, patient — server-side, driven by the Phase 4 query parameters |
| `src/features/audit/hooks/use-activity-log.ts` *(new)* | TanStack Query with the filter object in the key; `placeholderData: keepPreviousData` so paging does not blank the table |
| `src/components/layout/sidebar.tsx` | nav entry, rendered only under `usePermission("audit.view")` |
| `src/App.tsx` | route, guarded by the same permission |

Filter state belongs in the URL (search params), so an audit finding can be
linked to. That is the one requirement that is painful to retrofit — build it in
from the start.

Rows link through to the patient detail view where `patient_id` is set.
Protective-case rows are already absent from the response for users without
`audit.view_protective`; **the client must not implement its own hiding** — a
client-side filter would mean the data still crossed the wire.

### Per-record inline history

A small, consistent affordance: a history icon in each section header
(Profile, Family, Watchers, IDs, Documents) opening a popover with the last
five changes to that record and a link into the full History tab.

| File | Purpose |
|------|---------|
| `src/features/audit/components/record-history-popover.tsx` *(new)* | takes `subjectType` + `subjectId`, fetches through `getRecordHistory`, renders a compact list |
| the section components in `components/tabs/` | drop the trigger into each header |

Fetch **on open**, not on mount. Mounting five of these per patient view would
add five requests to every detail render for information almost nobody expands.

**Blast radius.** Additive — a new feature folder, a new route, one nav entry
and a header icon per section. Nothing existing changes shape.

**Gate.** `npm run build`; confirm the page is unreachable (route and nav) for a
user without `audit.view`, and that filter state survives a page reload.

---

## Out of scope

- **Read/view logging surfaces.** The server records no view events, so there is
  nothing to render.
- **Reports.** Caseload-per-social-worker and staff-activity output belong to the
  Reports module.
- **Export.** No CSV/PDF export of the audit log in these phases; add it once the
  filter set has settled in real use.
