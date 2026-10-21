# UIS Snapshot Plan

Freeze each Intake Assessment's copy of the patient's data, so an issued Unified Intake
Sheet (ANNEX B) reprints exactly as it was, whatever changed on the patient since.

## Problem

The UIS is rendered on demand and nothing about an issued sheet is kept. Every print
re-reads the patient's *current* records, so editing the patient after an intake rewrites
history.

Live-read today, so it changes on an old reprint:

- **The whole Section II family table** — live `patient->familyMembers`
  (`resources/views/pdf/unified-intake-sheet.blade.php:321`). A member added later appears
  on the old sheet, an edited one shows new values, a soft-deleted one vanishes.
- **All of Section I** — name, sex, birthdate, place of birth, permanent/present address,
  civil status, religion, nationality, educational attainment, occupation, monthly income.
- **Age** — recomputed against the print date, so it drifts upward.
- **PhilHealth No.** and **Hospital No.** — live `patientIds` / `hospital_id`.
- **"Date & Time of Intake-Interview" is `now()`** (`UnifiedIntakeSheetPdfService.php:122`):
  a reprint stamps today as the interview date.
- **"Interviewed by" is whoever clicks Print** (`AssessmentUisController.php:45`).
- Informant address/contact when the assessment left them blank (falls back to the patient).
- Mode/fund **labels** — the code is frozen, the printed name is a live Library lookup.
- `net_per_capita_income` / `calculated_classification` are stored but **recomputed against
  the live family count** on every update or expense write
  (`CalculateMswdClassificationAction.php:34-36`). The household size used is never stored.

The on-screen sheet has the same problem: `uis-sheet.tsx` renders Section I, the family table
and the household size from the **live `patient` prop** and `uis.householdSize`, a live count
in `PatientUisController.php:40-42`.

Already frozen on the assessment row: informant name & relationship, `other_income_sources`,
`total_family_income`, `house_tenure`, `light_source`, `water_source`, the nine
`assessment_expenses` amounts, `problem_categories`, `problem_specify`, `assessment_notes`.

## Decisions

- The snapshot is taken **at creation** and then frozen. A worker with `cases.update` can
  **refresh** it explicitly (recorded: who and when), because the intake form collects no
  family or income — those are filled in on the patient afterwards.
- **Section V stays live.** A guarantee is a later decision on the same encounter, so
  freezing it at intake would leave Section V permanently blank on most sheets.
- The interview stamp is fixed: a recorded `interviewed_at` and `interviewed_by` print
  instead of the print date and the printing user.
- Existing intakes are **backfilled** so they stop drifting. Their original values are gone;
  today's data is the best available.

## Approach

Follows the house pattern: `case_hospital_transactions` freezes a HIS encounter as a curated
`json snapshot` column built by one private `snapshot()` method in its service
(`CaseHospitalTransactionService.php:197-236`), nested rows as plain arrays inside it.

### Phase 1 — Schema

One migration on `assessments`:

| Column | Type | Why |
| --- | --- | --- |
| `uis_snapshot` | json nullable | The curated frozen copy. Named `uis_snapshot`, not `snapshot`: this codebase already calls the whole assessment a "snapshot". |
| `uis_snapshot_at` | timestamp nullable | When the copy was taken. |
| `uis_snapshot_by` | FK users nullOnDelete | Who took or refreshed it. |
| `interviewed_at` | datetime nullable | The intake interview date and time. |
| `interviewed_by` | FK users nullOnDelete | The worker who conducted the intake. |
| `household_size` | unsignedInteger nullable | Makes the per-capita maths reproducible. The API already exposes `household_size`, but as a live count. |

Backfill in the same migration (the `create_fund_sources_table` precedent of calling app code
from a migration): for every intake row (`social_case_status IS NULL`), capture the snapshot
from the patient's current data, set `household_size` from the live count, and set
`interviewed_at` / `interviewed_by` from `encounter_date ?? created_at` and `created_by`.

### Phase 2 — `UisSnapshotService`

One place that defines the shape, reused by create, refresh and the migration.

- `capture(Patient $patient, ?CarbonInterface $asOf): array`
  - `patient`: full name + name parts, sex, birthdate, **`age` as of the interview date** (so
    it never drifts), place_of_birth, civil_status, religion, nationality, citizenship,
    educational_attainment, occupation, monthly_income, permanent_address, present_address,
    composed_address, contact_number, hospital_id, mswd_id, philhealth_no (resolved here,
    not in the Blade).
  - `family_members`: `{name, relationship, birthdate, sex, civil_status, age,
    educational_attainment, occupation, monthly_income}` per member.
  - `household_size`: `familyMembers + 1`, as `CalculateMswdClassificationAction` counts it.
- `refresh(Assessment $assessment, User $worker): Assessment` — re-captures, stamps
  `uis_snapshot_at` / `uis_snapshot_by`, and re-runs the classification against the new
  household size.

Mode/fund **labels** are resolved at capture time and kept on the snapshot, so renaming a
Library entry no longer changes an old sheet.

### Phase 3 — Freeze at creation

- `AssessmentService::create()` already resolves `$patient` (`AssessmentService.php:46`):
  capture there, inside the existing transaction, and persist `household_size`,
  `interviewed_at` (default `encounter_date ?? now()`) and `interviewed_by` (`created_by`).
- `update()` and `recalculateClassification()` **do not** re-snapshot, so correcting an
  informant's name months later leaves the patient data frozen.
- `CalculateMswdClassificationAction` gains an optional `householdSize` and prefers it over
  the live `familyMembers()->count()`, so an old assessment's per-capita income stops moving
  with today's family. The live count stays as the fallback for rows without one.
- `uis_snapshot` is kept **out of the activity log** — the blob would swamp the audit trail.
  `AuditCoverageTest` asserts only `logOnlyDirty` / `submitEmptyLogs`, so it stays green.

### Phase 4 — Render from the snapshot

- `UnifiedIntakeSheetPdfService::render()` builds its view data from the snapshot when
  present and falls back to the live patient when it is null (the blank form, `?blank=1`).
  The snapshot's patient is passed as a plain object so the Blade's `$p?->last_name` style
  keeps working and the Blade diff stays small.
- Blade changes: the Section II loop source, `$philhealthNo` (pre-resolved), `$age` (from the
  snapshot), the interview date/time (`interviewed_at`, not `$printedAt`) and the
  "Interviewed by" signature (`interviewed_by`, not `$printedBy`). Section V keeps reading
  `$assistanceLines` live.
- `PatientUisController` returns the snapshot and the stored `household_size` instead of the
  live count, so the on-screen sheet and the PDF cannot disagree — the same reason
  `UisExpenseSlots` is shared today.

### Phase 5 — Refresh endpoint

`POST /assessments/{assessment}/uis-snapshot/refresh`, permission `cases.update`,
single-action `RefreshUisSnapshotController`, annotated in `Http/Docs/`.

### Phase 6 — Frontend (done)

- `uisSheetData()` in `features/cases/lib/uis-sheet-data.ts` mirrors the server's
  `UisSnapshotService::sheetData()`: the frozen copy when there is one, today's patient
  record otherwise. The on-screen sheet and the PDF read the same shape, for the same reason
  the expense slots are computed in one place.
- `uis-sheet.tsx` renders Section I, the §II family table and the household size from it,
  rather than the live `patient` prop. The empty family row distinguishes "none at the
  intake" from "none on file".
- A "Refresh from patient record" button (gated on `cases.update`, hidden once the
  assessment is a social case study) sits in a banner that says when the copy was taken and
  who last refreshed it, with a confirm dialog that warns a reprint will stop matching an
  issued copy.
- `adaptUisSnapshot()` maps the blob to camelCase types; `useRefreshUisSnapshot()` invalidates
  the assessment and patient-UIS caches.

## Known limitations (stated, not fixed here)

- **"Re-Assess" in the UIS tab is an in-place `PUT`**, not a new row
  (`uis-tab.tsx:1051-1078`), so it overwrites the previous assessment. The snapshot keeps its
  patient data frozen, but the edited fields are still overwritten. Only
  `POST /cases/{case}/reassess` creates a linked child.
- `PatientUisController` shows only the **latest intake per encounter**, so a superseded
  assessment has no UI to reprint from, and `GET /cases/{case}/uis` still resolves the case's
  latest intake.
- The backfill freezes old rows from **today's** data.
- No PDF copy of a print is archived (the SCSR does archive into `documents`). The snapshot
  reproduces the sheet; it does not prove what was handed over.

## Verification

- `tests/Feature/UisSnapshotTest.php`: an intake freezes the patient and family at creation;
  adding, editing or soft-deleting a family member afterwards does not change its PDF or its
  `/patients/{id}/uis` row; editing demographics does not change them; the age does not drift
  when the print date moves; a second intake on a new encounter carries the new data while the
  first keeps the old; the refresh endpoint replaces the copy, stamps who and when, and is
  refused without `cases.update`; an expense write recomputes against the **frozen** household
  size; `interviewed_at` / `interviewed_by` print instead of the print date and printing user;
  a row with a null snapshot still renders (blank form); the migration backfills an existing
  intake.
- Update the assertions that depend on live reads: `CaseUisPrintTest.php:112` and `:397`,
  `PatientUisTest.php:133,167,174`, `AssessmentExpenseApiTest.php:126`.
- `npx tsc -p tsconfig.app.json --noEmit && npm run lint && composer test`, plus
  `vendor/bin/pint`.
- Manual: print a UIS, add a family member, reprint the same assessment and confirm the sheet
  is unchanged; refresh and confirm the member then appears.
