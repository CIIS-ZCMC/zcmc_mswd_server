# UIS Module (Intake + Assessing) — Client Plan

Client half of the server's `zcmc_mswd_server/docs/UIS_MODULE_PLAN.md` (server issues #160–#175,
all merged). The server must be deployed first: it added assessment/family fields, recalculates the
MSWD classification on every expense write, and changed the UIS print contract.

**Status legend:** ☐ not started · ◐ in progress · ☑ done

| Phase | Depends on | Status |
|-------|-----------|--------|
| 1. Contract plumbing + types (`ApiError.code`, `fetchBlob` errors, assessment/family/readiness types) + classification display (A–D + legacy) (#56) | server | ☑ done |
| 2. Family civil status (type, adapter, dialog, family tab) | 1 | ☑ done |
| 3. UIS print flow (readiness, copies/remarks/preview/blank, 409, drop encounter endpoints) | 1 | ☑ done |
| 4. Intake assessment form (create/edit, expenses CRUD, reassess dialog fixes) | 1, 3 | ☑ done |
| 5. Docs (contract-sync pointer, CLAUDE.md) | 4 | ☑ done |

## Background — what was broken against the server

- `uis-print-api.ts` calls `/patient-transactions/{id}/uis/*`; the server only has
  `/cases/{case}/uis/*` (a case is one encounter, `cases.transaction_id`).
- The server's print endpoint 409s with `{code: "uis_no_assessment"}` for a case without an intake
  assessment (unless `?blank=1`); `ApiError` dropped the `code` and `fetchBlob` never read the body.
- No client calls for assessment create/update/expenses; classification display assumed A–D only.

## Server contract (reference)

- `GET /cases/{id}/uis` → `ApiUisReadiness` (`has_assessment`, `ready`, `missing[]`,
  `classification`, `print_count`, `last_printed_at`). `missing` is a hint, not a block.
- `GET /cases/{id}/uis/pdf?preview=1|download=1|blank=1&copies=1..20&remarks=<=255` — logs the print
  unless `preview`; 409 `uis_no_assessment` without an assessment unless `blank`.
- Assessment fields: `informant_name`, `informant_relationship`, `other_income_sources[{source,amount}]`,
  `referral_source`, `medical_history`, `recommendation`, `recommendation_mode`, `fund_source`,
  `house_tenure` (owned|rented), `light_source[]` (electricity|kerosene|candle), `water_source[]`
  (owned|public|artesian_well), `problem_categories[]` (health|economic|housing|food_nutrition|
  employment|other), `problem_specify`.
- Expense create/update/delete recalculates `net_per_capita_income`, `calculated_classification`,
  `classification` (unless overridden) and `calculated_discount_rate` — refetch, never recompute.
- `PUT /assessments/{id}` with `classification: null` reverts to the calculated classification.
- Classification codes are A, B, C1, C2, C3, D; old rows may hold `indigent|low_income|
  self_sufficient|others` (shown as "legacy", not converted).
- Family members gained free-text `civil_status`.

## Decisions

- UIS is case-only: no encounter-level print; an encounter without a case says "open a case".
- Legacy classification words are displayed, never mapped to brackets (CLAUDE.md: never invent a
  classification).
- One issue/branch/PR per phase.

## Phase 1 — Contract plumbing (done)

`ApiError.code`; `fetchBlob` sends `Accept: application/pdf, application/json` and parses JSON error
bodies; `ApiAssessment`/`ApiFamilyMember`/`ApiUisPrintLog`/`ApiUisReadiness` synced with the server
(duplicate `ApiUisPrintLog` removed); `Assessment` UI type + adapter carry the new fields and no longer
coerce an empty classification to `"D"`. Classification helpers moved to `features/cases/lib/classification.ts`
(`getClassificationBadgeText`, `getBracketColor/Label`, `formatCurrency`): A–D as before, legacy words as
"x (legacy)", missing as "Not on file". The SCSR editor's free-form classification select
(`social-case-editor.tsx`) is a separate SCSR field and is left alone.

## Phase 2 — Family civil status

- `patients/types/case-study.types.ts` `FamilyMember` += `civilStatus`; `patients-adapter.ts`
  `toFamilyMember` maps `civil_status`.
- `patients-api.ts` `CreateFamilyMemberPayload` / `UpdateFamilyMemberPayload` += `civil_status`.
- `family-member-dialog.tsx`: Select (Single · Married · Widowed · Separated · Common-law · Other),
  following the existing `RELATIONSHIP_OPTIONS` pattern. The server column is free text, so a value
  outside the list (e.g. typed in Filament) must still display and survive an edit.
- `family-tab.tsx`: Civil status column. It prints on the UIS §II grid, so it should be editable here.

## Phase 3 — UIS print flow

- `uis-print-api.ts`: remove `downloadEncounterUisPdf` / `listEncounterUisPrints` (dead routes);
  add `getCaseUisReadiness(caseId)` → `GET /cases/{id}/uis`; `downloadCaseUisPdf(caseId, {copies,
  remarks, preview, blank, filename})`. `preview` opens the blob in a new tab (the server does not log
  it); otherwise it downloads. `listCaseUisPrints` stops swallowing errors (return the query error).
- `use-uis-prints.ts`: drop the encounter hooks/keys; add `useCaseUisReadiness`
  (`uisPrintKeys.readiness(caseId)`, `enabled` on `intake.view` per the CLAUDE.md permission rule). The
  print mutation invalidates history **and** readiness (`print_count`, `last_printed_at`).
- `encounter-uis-panel.tsx`: remove the encounter branch. No case → "Open a case to print the UIS" via
  the existing `onOpenCaseNeeded`. Readiness banner: no assessment → "Assess" CTA (Phase 4) plus a
  secondary "Print blank form" (`blank=1`); `missing[]` → human labels as a non-blocking hint. Print
  dialog: copies (1–20), remarks (≤255), Preview and Print buttons. Errors come from `ApiError`:
  409 `uis_no_assessment` → the Assess CTA, 422 → `firstValidationMessage`; no more `console.error`-only.
- `case-detail-page.tsx` header "Print UIS (ANNEX B)": same options and 409 handling.
  `hospital-encounters-tab.tsx`: Print UIS only when the encounter has a case.

## Phase 4 — Intake assessment form (assessing)

- `assessment-api.ts` + `use-assessment.ts`: `createCaseAssessment` (`POST /cases/{id}/assessments`),
  `updateAssessment` (`PUT /assessments/{id}`), expenses `list/create/update/delete`
  (`/assessments/{id}/expenses`, `/assessment-expenses/{id}`). Every mutation invalidates
  `assessmentKeys.caseAssessments` / `.latestAssessment` **and** `uisPrintKeys.readiness`. The server
  recalculates classification on each expense write: refetch, never recompute client-side (the matrix
  preview in the reassess dialog stays a hint only).
- New `intake-assessment-dialog.tsx` (create + edit; hand-rolled `useState` form like
  `reassess-case-dialog.tsx`): informant name/relationship, referral source, total family income,
  other-income repeater, presenting problem + problem categories + specify, house tenure, light/water
  source, medical history, recommendation + mode + fund source, classification (optional — blank =
  calculated; MSWD codes; a legacy value stays selectable; override reason), and an expenses editor
  with per-line save then refetch. Option lists come from one constants module mirroring the server
  vocabularies (see Server contract).
- Entry points: UIS tab "Assess" / "Edit assessment"; readiness `missing` chips open the dialog. Gate
  create on `cases.create` and edit on `cases.update` (as `social-case-tab.tsx` does). Show the
  watcher-requirement 422 (`errors.watcher`) via `firstValidationMessage`.
- `reassess-case-dialog.tsx` fixes: default expense row typo `amount: "0 font-mono"`; the axios-style
  `err.response.data.message` catch → `ApiError`; and align its payload with what the server's
  `ReassessCaseController` accepts. It currently sends `household_size`, `expenses[]` and
  `classification_override`, which `StoreAssessmentRequest` does not validate — **verify first**, and if
  they are dropped, send expenses through the expense endpoints after the reassess call.

## Phase 5 — Docs

Add a pointer from `docs/API_CONTRACT_SYNC_PLAN.md`; update CLAUDE.md's UIS sentence (case-only print,
readiness, no encounter endpoint); mark every phase above ☑.

## Phase 6 — Redesigned Patient UIS Tab (done)

See `docs/UIS_PATIENT_TAB_PLAN.md`. Redesigned the `/patients/:id?tab=uis` tab with:
- Encounter picker rail (`uis-encounter-rail.tsx`) supporting deep linking `?tab=uis&case=<id>`.
- Full ANNEX B sheet (`uis-sheet.tsx`) displaying informant details, Section I–V, MSWD classification card, and print history.
- Actions: Assess/Edit, Print UIS dialog, in-page PDF preview dialog (`uis-pdf-preview-dialog.tsx`), and Delete assessment confirmation.
- Hospital encounters tab deep link to the UIS tab.

## Verification

Per phase: `npm run build` (runs `tsc -b`; plain `npm run typecheck` does not check the app sources).
Lint baseline is 73 pre-existing errors — do not add to it. There is no test runner, so drive the flow
in the browser against a local server (`php artisan migrate:fresh --seed && php artisan serve`, then
`npm run dev`):

1. Open a case with no assessment → UIS tab shows "no assessment"; printing shows the 409 message;
   "Print blank form" works and adds a history row.
2. Create an intake assessment; fields persist on reload; the readiness `missing` chips shrink.
3. Add / edit / delete an expense → classification, net per-capita income and discount update.
4. Print with copies = 2 and remarks → the history row shows both; Preview adds no row.
5. Family member civil status round-trips and appears on the printed UIS §II grid.
6. A legacy-classification row shows "(legacy)" and keeps its value through an edit.
7. An inpatient case with no watcher shows the watcher error on create, with no row written.
