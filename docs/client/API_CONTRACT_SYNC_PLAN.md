# MSWD Client — Client/Server Contract Sync Plan

Client half of the phased plan closing the gaps found in the 2026-09-08 audit of
this repo against `zcmc_mswd_server`. Four phases, each independently verifiable
and revertable.

The server half lives in `zcmc_mswd_server/docs/API_CONTRACT_SYNC_PLAN.md`
(Phases 1–4). **Every phase here depends on the server side being deployed
first** — Phases 5 and 6 need server Phases 1 and 3; **Phase 7 must not land
until server Phase 4 is deployed**, or the sidebar's category and date filters
will silently filter nothing.

> See also `docs/UIS_MODULE_PLAN.md` for the Unified Intake Sheet (Intake + Assessing)
> client plan covering Phase 1–5 (assessment fields, expenses CRUD, readiness hints, case-only print).

**Status legend:** ☐ not started · ◐ in progress · ☑ done

| Phase | Status | Depends on |
|-------|--------|------------|
| 5. Type sync | ☐ | server 1, 3 |
| 6. Adapter reads embedded relations | ☐ | server 3 |
| 7. Pagination and server-driven filters | ☐ | server 4 |
| 8. Permission gating | ☐ | — |

---

## Background — what the audit found on this side

Every endpoint the client calls exists and the auth, envelope and pagination
contracts line up. No breaking mismatch. The client-side problems:

1. **Type drift.** `features/patients/types/api.types.ts` under-declares what
   the Laravel resources emit — `ApiSector.code`, timestamps on four
   sub-resources, `ApiCase.patient` and its `*_count` keys,
   `ApiPaginationMeta.from` / `to` / `path`.
2. **Fields typed as available that never arrive.** `GET /patients` eager-loads
   only `sector`, so the adapter's `patient_ids`, `family_members`, `watchers`
   and `documents` are always empty on list rows — meaning `philHealthNo`,
   `seniorCitizenId`, `pwdId` and `customIds` are always blank there. (Harmless
   today: the ID tab is a detail view fed by `/profile`, which does load them.)
   `GET /intake-sheets` list rows carry no `case` or `assessment`.
3. **Permission coupling.** `usePatientDetail` fires `/cases` and
   `/cases/{id}/assessments`, both gated on `cases.view`. A `patients.view`-only
   user gets a 403 surfaced as a page-level error instead of degrading to
   demographics.
4. **Hard cap.** `usePatients` requests `per_page: 100` — exactly `ListQuery`'s
   maximum — with no paging UI. Past 100 patients the sidebar truncates
   silently.
5. **Two sidebar filters already broken**, independent of any of the above:
   - the category chips read `patient.category`, which is always
     `"Unclassified"` on list rows, since classification lives on `Assessment`
     and the list never loaded cases
   - the intake-date filter compares `patient.intakeDate` (a full ISO datetime
     from `created_at`) against a `YYYY-MM-DD` string, so it never matches

---

## Phase 5 — Type sync ☐

No runtime change. Makes the compiler aware of server Phases 1 and 3.

`src/features/patients/types/api.types.ts`:

- `ApiSector` → `+ code: string | null`, `created_at`, `updated_at`
- `ApiPatientId` / `ApiFamilyMember` / `ApiWatcher` / `ApiCaretaker` →
  `+ created_at`, `updated_at`
- `ApiCase` → `+ patient?: ApiPatient`, `+` the five optional `*_count` keys
- `ApiPatient` → `+ latest_case`, `latest_assessment`; doc comment marking the
  relation block profile-only
- `ApiUnifiedIntakeSheet` → `+ intake_worker?: ApiUserLite | null`
- `ApiPaginationMeta` → `+ from: number | null`, `to: number | null`, `path: string`

`src/features/patients/api/intake-sheets-api.ts`:

- `IntakeAssessmentPayload` gains `housing_type?`, `utilities_access?`,
  `social_functioning?`, `assessment_notes?`

**Gate:** `npx tsc --noEmit`

---

## Phase 6 — Adapter reads the embedded relations ☐

`src/features/patients/api/patients-adapter.ts` — `toPatientListRecord` sources
`category`, `intakeDate`, `admissionStatus`, `caseStudy.caseNumber` and
`assignedStaff` from `latest_case` / `latest_assessment` instead of falling back
to placeholders. List and detail rows stop disagreeing.

`ward` / `bedNo` / `diagnosis` stay as honest placeholders — no backend columns
exist for them.

**Gate:** `tsc`, then eyeball the sidebar. First visible change: category badges
show real values instead of `Unclassified`.

---

## Phase 7 — Pagination and server-driven filters ☐

The big UI phase. **Must not land before server Phase 4 is deployed.**

- `src/features/patients/api/patients-api.ts`: `ListPatientsParams` gains
  `page`, `classification`, `intakeDate` (sent as `filter[classification]`,
  `filter[intake_date]`)
- `src/features/patients/hooks/use-patients.ts`: owns `page` / `search` /
  `classification` / `intakeDate`; 300 ms search debounce; `keepPreviousData` so
  the list doesn't blank between pages; page resets to 1 on any filter change;
  `per_page: 25`; returns `page`, `totalPages`, `total`, `setPage` and the
  filter setters
- `src/components/layout/sidebar.tsx`: delete the `useMemo`, take `patients`
  already filtered, drive search / chips / date from props, add a pager footer
- `src/components/layout/main-layout.tsx`, `src/App.tsx`: thread the props
- `src/features/patients/hooks/use-patient-filters.ts`: confirm nothing imports
  it, then delete — it duplicates the sidebar's local filtering

**Why the filters must move server-side.** Once the client holds one page, a
client-side `useMemo` filter silently becomes "filter within this page" — a chip
that hides rows on page 2 but not page 3 is worse than no chip at all.

Server support for each, after server Phase 4:

| Filter | Mechanism |
|--------|-----------|
| search (name / hospital # / mswd # / barangay) | `?search=` — covers `mswd_id`, `hospital_id`, `first_name`, `middle_name`, `last_name`, `barangay` |
| category chips | `filter[classification]`, matched against the patient's current assessment |
| intake date | `filter[intake_date]`, matched against `cases.date_opened` |

**Gate:** `tsc`, `npm run build`, then a manual pass on paging, each filter, and
changing a filter while on page 2.

**Revert:** largest surface in the plan — keep it in its own commit, separate
from Phase 6.

---

## Phase 8 — Permission gating ☐

`src/features/patients/hooks/use-patient-detail.ts` — gate `latestCaseQuery` and
`assessmentsQuery` on `usePermission("cases.view")`, and drop their errors from
the `error` chain when disabled.

Independent of the other phases; can land at any point.

**Gate:** log in as a `patients.view`-only role and confirm demographics render
instead of a 403 page.

---

## Verification

Per-phase gates above, then `npx tsc --noEmit` and `npm run build`.

End-to-end with the server: create an intake with all four new assessment fields
→ confirm they render in the Social Case tab → clear one via `PUT` → confirm it
clears → confirm the sidebar pages, filters and classification badges against
real data.

## Commit boundaries

Phases 5+6 together, then 7, then 8 — three commits.
