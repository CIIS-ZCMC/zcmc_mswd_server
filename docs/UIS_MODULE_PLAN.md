# UIS Module (Intake + Assessing) — Server Plan (zcmc_mswd_server)

The UIS (ANNEX B) module = **intake assessment authoring + classification + printable +
print history**. The UIS is still **not a stored record**: the case's intake-time
`assessments` row (`social_case_status IS NULL`) is the source of truth, and the sheet is
rendered on demand from a case (see `UIS_PRINT_HISTORY_PLAN.md`).

**Status legend:** ☐ not started · ◐ in progress · ☑ done

| Phase | Depends on | Status |
|-------|-----------|--------|
| 0. Squash prerequisites (assessment columns, test diffs) — shipped as #160 / #161 | — | ☑ done |
| 1. Store the missing UIS fields (#162) | 0 | ☑ done |
| 2. Assessing correctness (reclassify on expense change, tests) (#164) | 0 | ☑ done |
| 3. Assess → print flow (409 / readiness / copies+remarks) (#166) | 1, 2 | ☑ done |
| 4. Cleanup (stale permissions, stale docs) (#168) | 3 | ☑ done |
| 5. Match the client's New Intake Assessment modal (#176) | 1–3 | ☑ done |

---

## Background

Today the UIS data is authored only through generic assessment CRUD, so:

- fields the form prints (informant, family civil status, other income sources,
  mode of recommendation / fund source) have nowhere to be stored and print blank;
- `StoreAssessmentRequest` / `UpdateAssessmentRequest` omit `referral_source`,
  `medical_history`, `recommendation`, which the model already has;
- the printable silently prints blank when the case has no intake assessment;
- `uis_print_logs.copies` / `remarks` are never written;
- `AssessmentService::create` classifies with expenses = 0, since expenses are added after.

## Phase 0 — Prerequisites (separate from this PR)

- `net_per_capita_income` and `calculated_discount_rate` are in no migration but are written
  by `Assessment`, `AssessmentDto`, `AssessmentService` → fold into
  `2026_07_07_082057_create_assessments_table.php`.
- Confirm the untracked `unified_intake_sheet` table migration is intended (`CaseUisPrintTest`
  asserts the table exists).
- Re-check assertions removed from `ActivityLogFilterTest`, `ActivityOwnershipTest`,
  `CustodyHardeningTest` during the squash.

## Phase 1 — Store the missing UIS fields

Edit the create migrations in place (squashed schema):

- `assessments`: `informant_name`, `informant_relationship`, `other_income_sources` (json),
  `recommendation_mode`, `fund_source`.
- `patient_family_members`: `civil_status`.

Update `Assessment` (fillable/casts, vocabulary constants like `HOUSE_TENURES`),
`AssessmentDto`, the store/update requests (including the three omitted fields),
`AssessmentResource`, and the family-member request/resource. Render the new data in
`resources/views/pdf/unified-intake-sheet.blade.php` in place of the blank boxes.

## Phase 2 — Assessing correctness

- `AssessmentExpenseController` store/update/delete recompute the parent assessment through
  `CalculateMswdClassificationAction`, respecting manual-override flags.
- Unit tests for `CalculateMswdClassificationAction`: matrix boundaries and the no-matrix
  fallback.
- Feature test for the append-only re-assessment chain (`ReassessCaseController`).

## Phase 3 — Assess → print flow

- `renderForCase` signals "no intake assessment"; the print endpoint returns
  `409 {code: uis_no_assessment}` unless `?blank=1` (blank fillable form stays available).
- `GET /api/cases/{case}/uis` — readiness summary: latest intake assessment, missing required
  sections, classification, print count.
- Print endpoint accepts and stores `copies` and `remarks` via `UisPrintLogService::record()`;
  `UisPrintLogResource` exposes them.
- Permissions unchanged: `cases.create/update` author, `intake.view` prints.

## Phase 4 — Cleanup

- Prune stale `intake.create/update/finalize/delete` permission rows in existing environments.
- Refresh `MIGRATIONS.md`, `UIS_EXPENSES_PROBLEMS_PLAN.md`, `UNIFIED_INTAKE_SHEET_PDF_PLAN.md`
  (they reference migrations removed by the squash).

## Phase 5 — Match the client's intake modal (#176)

The client's New Intake Assessment dialog posts more than the server accepted:

- **Informant details:** `informant_last_name/first_name/middle_name`, `informant_address`,
  `informant_contact_number` are stored and returned (`informant_contact` is accepted as an alias). The
  printable's Address/Contact cells print the informant's, falling back to the patient's.
- **Nested `expenses[]`** on `POST /cases/{case}/assessments` and `/reassess` are created in the same
  transaction and the classification is calculated against them in one request; the response includes
  `expenses`. (Housing/light/water amounts have no column — the modal sends them as expense lines.)
- **Vocabularies:** `recommendation_mode` and `fund_source` are validated (`Assessment::RECOMMENDATION_MODES`,
  `FUND_SOURCES`) and printed as labels; legacy free text still prints as typed.
- **UIS expense slots:** a slot sums all matching lines; House/Lot no longer swallows "House help" or
  "Clothing" (bare `house` / `lot` keywords removed); an "Others: …" line only counts under Others.
  Light/water bill amounts count toward classification but have no slot on ANNEX B.
- `GET /cases/{case}/assessments` orders by `created_at` then `id`.
- Not done server-side: the modal omits `other_income_sources` when empty, so it cannot be cleared on edit
  (the client must send `[]`); override justification is enforced by the UI only.

## Decisions

- No stored UIS record or lifecycle; the assessment row is the record.
- Reprints reflect current data (no PDF archive).
- One issue/branch/PR for this whole plan.

## Verification

- `php artisan migrate:fresh --seed`; `php artisan test` (`CaseUisPrintTest`,
  `AssessmentModuleTest`, `AssessmentExpenseApiTest`, `AuditCoverageTest`).
- New tests: classification unit, expense → reclassify, UIS 409 / `?blank=1`, readiness
  endpoint, `copies`/`remarks`, new fields round-trip and appear in the PDF.
- Fetch `/api/cases/{id}/uis/pdf?preview=1` and check ANNEX B visually.

## Non-goals

PDF archiving; stored UIS record; caretaker data on the form; reprint limits / official-copy
policy; SCSR changes.
