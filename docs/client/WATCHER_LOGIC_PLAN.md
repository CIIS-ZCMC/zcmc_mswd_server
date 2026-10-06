# MSS — Watcher Logic Plan (Client)

Client half of the plan replacing the patient-scoped `patient_watchers` model
with episode-scoped `case_watchers`.

This document was rewritten on **2026-09-25** after auditing the shipped code.
The previous revision had a contradictory status (the summary table showed
Phases 6–8 ☑ while the section headers still read ☐) and described a data layer
that no longer matches the codebase. The client work is, in fact, **built and
wired** — types, API, adapter, hooks, the case-scoped tab, the pass dialogs, the
requirement banner, the waiver dialog, and the intake optimistic guard. The one
genuinely unbuilt item is the "Missing watcher" worklist filter, which is blocked
on a server filter that was never planned.

The server half is **fully shipped**: `zcmc_mswd_server/docs/WATCHER_LOGIC_PLAN.md`,
Phases 1–5 all ☑ (schema, requirement resolver, endpoints/DTOs/resources,
transition enforcement, backfill command). The `watcher_status` payload also
carries a resolved `waiver` block (`reason`, `note`, `waived_by`, `waived_at`)
as of the server's 2026-09-24 follow-up.

**Status legend:** ☐ not started · ◐ in progress · ☑ done

| Phase | Depends on | Status |
|-------|-----------|--------|
| 6. Types + adapter + API layer | server 3 | ☑ done |
| 7. Watchers UI goes case-scoped | client 6 | ☑ done |
| 8. Requirement banner + waiver dialog + optimistic guard | client 6; server 4 | ☑ done |
| 9. "Missing watcher" worklist filter | server addition (unbuilt) | ☐ blocked |

---

## What is built today (as-built record)

### Phase 6 — data layer ☑

The patient-scoped `Watcher` placeholder model is retired. Case-scoped types and
plumbing live in `src/features/cases/`:

| File | Role |
|------|------|
| [watcher.types.ts](../src/features/cases/types/watcher.types.ts) | `CaseWatcher`, `WatcherRequirement`, `WatcherStatus` (`passStatus` is now a real `"active"\|"expired"\|"revoked"`, not a placeholder) |
| [case-watchers-api.ts](../src/features/cases/api/case-watchers-api.ts) | `listCaseWatchers`, `getWatcherStatus`, `createCaseWatcher`, `updateCaseWatcher`, `deleteCaseWatcher`, `promoteCaseWatcher`, `issueWatcherPass`, `revokeWatcherPass`, and the waiver store/destroy |
| [case-watchers-adapter.ts](../src/features/cases/api/case-watchers-adapter.ts) | `toCaseWatcher`, `toWatcherStatus` |
| [use-case-watchers.ts](../src/features/cases/hooks/use-case-watchers.ts) | `caseWatcherKeys`, `useCaseWatchers`, `useWatcherStatus` |
| [use-case-watcher-mutations.ts](../src/features/cases/hooks/use-case-watcher-mutations.ts) | create/update/delete/promote/issue-pass/revoke-pass, invalidating watchers + status + patient detail keys |
| [watcher-relationship-types-api.ts](../src/features/reference/api/watcher-relationship-types-api.ts) | the relationship master-list lookup |

`createCaseWatcher` supports both server paths — `patient_watcher_id` (link a
directory entry) or a full inline person — matching `StoreCaseWatcherRequest`.

### Phase 7 — case-scoped Watchers tab ☑

[watchers-tab.tsx](../src/features/patients/components/tabs/watchers-tab.tsx) now
reads `useCaseWatchers(caseId)`, not `patient.watchers`. It:

- takes a `caseId` prop and shows a "No Active Admission Case" empty state when
  absent (rather than 404-ing against `undefined`);
- renders real Role (Primary / Informant), Pass Number, Valid Until and Status
  columns — no more placeholder strings;
- offers per-row Make Primary, Edit, Issue/Reissue Pass, Revoke Pass, Remove;
- keys the `RecordHistoryPopover` on `patientWatcherId` (the directory subject),
  correctly showing nothing for an ad-hoc episode watcher with no directory row.

Issuing a pass is a **separate per-row action** via
[issue-pass-dialog.tsx](../src/features/patients/components/dialogs/issue-pass-dialog.tsx),
distinct from create — the pass number comes back from the server, never typed.
[watcher-dialog.tsx](../src/features/patients/components/dialogs/watcher-dialog.tsx)
sources `relationship` from the reference lookup (see
`WATCHER_RELATIONSHIP_DROPDOWN_PLAN.md`, ☑).

The tab is mounted on **both** the patient detail view
([patient-detail-view.tsx:330](../src/features/patients/components/patient-detail-view.tsx#L330),
`caseId={patient.latestCaseId}`) and the case detail page
([case-detail-page.tsx:379](../src/features/cases/components/case-detail-page.tsx#L379)).

### Phase 8 — requirement banner, waiver, optimistic guard ☑

- **Banner** — [watcher-status-banner.tsx](../src/features/patients/components/watcher-status-banner.tsx),
  mounted above the tabs in the patient detail view
  ([patient-detail-view.tsx:207](../src/features/patients/components/patient-detail-view.tsx#L207)),
  driven by `useWatcherStatus`. Renders the destructive/warning/muted variants
  per `requirement` × `hasPrimary`, including the "waived by X on Y" copy now that
  the server exposes the resolved `waiver` block.
- **Waiver dialog** — [watcher-waiver-dialog.tsx](../src/features/patients/components/dialogs/watcher-waiver-dialog.tsx),
  gated on `usePermission("cases.waive_watcher")`, with the six reason values and
  a required note when `other`.
- **Optimistic guard** — [intake-sheet-tab.tsx](../src/features/patients/components/tabs/intake-sheet-tab.tsx)
  disables Submit/Finalize with a tooltip when `watcherStatus.blocking` is true;
  the server 422 remains the real gate.

---

## Phase 9 — "Missing watcher" worklist filter ☐ blocked

The one piece of the original plan that was never built, and correctly so.

The intent: a "Missing watcher" filter on the patient sidebar (or the caseload
screen) surfacing every case where `watcher_status.blocking` is true — the view a
section head would live in.

**Why it is blocked.** There is no server-side filter for this. The client
sidebar filters are server-driven (`API_CONTRACT_SYNC_PLAN.md` Phase 7, shipped),
so a client-side `useMemo` over one page would silently mean "blocking within this
page" — worse than no filter. A correct implementation needs a server addition
first: a `whereDoesntHave(...)` + admission-type scope exposed as
`?watcher_blocking=1` on `GET /patients` (or, better, on `GET /my-caseload`,
which is the more natural home now that a caseload screen exists). The server's
own `WATCHER_LOGIC_PLAN.md` §8 flags this as a **cross-repo dependency that was
never scoped into a server phase**.

**Do not build this client-side.** Raise the server filter first; then this phase
is a small addition to `caseload-page.tsx`'s bucket/filter bar.

---

## Open items / tech debt

- **Patient-view Watchers tab is not the "Known contacts directory" the server
  plan imagined.** Server §8 sketched the patient-view tab becoming a read-only
  directory once a case page existed. Instead, the full case-scoped tab renders in
  both places against `patient.latestCaseId`. Harmless, but it means "watchers are
  per-episode" is implied rather than shown on the patient view. Decide whether
  the patient-view copy becomes the read-only directory now that `/cases/:id`
  hosts the real per-episode tab.
- **`as any` cast into `WatchersTab`.** [case-detail-page.tsx:379](../src/features/cases/components/case-detail-page.tsx#L379)
  passes `caseRecord.patient as any`. Same root cause and fix as the SCSR tab —
  tighten the prop to what the tab reads. Tracked in `SOCIAL_CASE_PLAN.md`.
- **`is_incapacitated` capture.** The resolver reads it, but nothing in intake
  sets it (server open item §10). If MSS wants to drive the "Required" resolution
  for an incapacitated adult, intake needs a field for it — a client change.
- **Pass number series** is the server's placeholder `PASS-{year}-{seq}`; if
  guarantee letters later share a series, the display is unaffected but worth
  knowing.

---

## Verification

No test runner in this repo. Gate for any further work: `npx tsc -b` and
`npm run lint` clean (**not** `npm run typecheck`, which excludes `src/`), then a
manual walkthrough on one inpatient case and one OPD case — banner states, add /
promote / issue-pass / revoke / remove, waiver filing clears the destructive
banner, disabled Submit/Finalize when blocking.
