# Standalone Intake Assessment (UIS) — Plan (server + Inertia SSR client)

The UIS (Unified Intake Sheet, Annex B) is the **Intake Assessment** of one HIS encounter. Before this change it existed
only through a **case**:
- `assessments.case_id` was required.
- The UIS tab listed one row per case.
- The PDF and print log hung off the case.
- Workers were told to "Open Case first".

Now an intake is taken directly for a patient's encounter, and it shows the encounter's guarantors the way a case does.
A case can still be opened later, and it picks the intake up. Ships as one issue, branch and PR.

**Decisions (user):**
- **Anchor:** patient + HIS encounter, at most one intake per encounter (like one case per encounter).
- **Guarantors:** taken from the encounter, through the existing `patient_guarantees` (patient + `his_transaction_id`).
  They are shared with a case on the same encounter, and the guarantees schema doesn't change.
- **Case link:** optional.
  - An encounter that already has a case links its new intake straight away.
  - A case opened later on the encounter takes the intake.
  - Existing case assessments are backfilled as intakes of their case's encounter.
- **UIS section V:** prints the guarantee items on the encounter (type, amount, mode, fund, falling back to the
  guarantor's name). When there are none, it falls back to the case's patient assistances.

**Status legend:** ☐ not started · ◐ in progress · ☑ done

| Phase | Side | Status |
|-------|------|--------|
| 1. Schema: `assessments.patient_id/his_transaction_id/transaction_type/encounter_date`, nullable `case_id` (assessments, uis_print_logs) | server | ☑ done |
| 2. Intake service, endpoint, case linking, assessment-keyed UIS routes, section V guarantors, patient UIS rows | server | ☑ done |
| 3. New Intake Assessment dialog, intake-first UIS tab, sheet Guarantors sub-tab, encounter print menu | client | ☑ done |
| 4. Tests, docs, verification | both | ☑ done |

## What was built

### Data
- **Migration** `2026_10_18_010000_decouple_assessments_from_cases`:
  - `assessments` gains `patient_id` (FK), `his_transaction_id`, and the `transaction_type` / `encounter_date` labels,
    frozen at intake like `cases.transaction_type`. All four are backfilled from the case, with an index on
    (patient, encounter).
  - `case_id` becomes nullable on `assessments` and `uis_print_logs`. `social_case_guard` ignores NULLs and keeps working.
- **`Assessment`:**
  - A `creating` hook copies the patient and encounter from the case, so every case path (the Case page, Filament,
    the SCSR) keeps filling them.
  - New: `patient()` and the `intakeFor($patientId, $transactionId)` scope.
- **Print log:** a print belongs to the encounter's UIS (`patient_id` + `transaction_id`). A case's print history also
  lists the prints made before the case was opened. There is no `assessment_id` column.

### Server
- **`IntakeAssessmentService`:**
  - `create()`:
    - one intake per encounter (422 otherwise)
    - the encounter must be the patient's (`patid` = `hospital_id`; 422 if not, or if the HIS is unreachable)
    - snapshots the encounter's type and date
    - links an existing case on the encounter
  - `linkCase()` runs from `CaseModelService::create()`.
- **Endpoints:**
  - `POST /api/patients/{patient}/intake-assessments` (`IntakeAssessmentController`; `cases.create`, the same
    permission as a case's assessment). The `intake.create`/`update`/`delete` permissions stay pruned
    (`2026_10_01_010000_prune_stale_intake_permissions`).
  - `GET /api/assessments/{assessment}/uis`, `…/uis/pdf` and `…/uis/prints` (`AssessmentUisController`, `intake.view`).
    A social case study answers 404.
  - The `cases/{case}/uis*` routes are unchanged and resolve the case's intake.
- **Classification:** `CalculateMswdClassificationAction` takes the patient (household = family + 1).
  `AssessmentService` uses the assessment's patient, and checks the watcher requirement only when there is a case.
- **`UnifiedIntakeSheetPdfService`:**
  - `renderForAssessment()` / `filenameForAssessment()` (`UIS-{hospital_id}-ENC-{id}.pdf`, or the case code).
  - `assistanceLines()` builds section V.
- **`PatientUisController`:** one row per intake (the latest per encounter chain), plus a row for each case with no
  intake yet. Each row has `encounter`, an optional `case`, `guarantees` {count, total}, and `uis`.

### Client
- **API and hooks:**
  - `uis-print-api.ts` takes a `UisTarget` (`{assessmentId}` or `{caseId}`).
  - `useUisReadiness`, `useUisPrintHistory` and `usePrintUis`.
  - `useCreateIntakeAssessment`.
- **Dialogs:**
  - `IntakeAssessmentDialog` creates a standalone intake when it gets `patientId` + `transactionId` and no `caseId`.
  - `PrintUisDialog`, `UisPdfPreviewDialog` and `UisPrintHistoryTable` take `assessmentId`.
  - New `NewIntakeAssessmentDialog`: an encounter picker (already-assessed encounters disabled), then the intake form.
- **UIS tab:**
  - A "New Intake Assessment" button.
  - Rows are keyed by intake (`?uis=` deep link; old `?case=` links still work).
  - Columns: Encounter, Case (or an Open Case action on that encounter), Classification, Status, Guarantors, Prints.
- **UIS sheet:** a **Guarantors** sub-tab reusing `CaseGuarantorsTab`. Print, preview and history work by assessment.
- **Encounter Print → UIS:** prints the encounter's own intake, otherwise offers "Take Intake Assessment". It no
  longer falls back to the patient's latest case, which could belong to another encounter.
- The unused `uis-encounter-rail.tsx` was removed.

## Verification
- `php artisan test`: 955 passed. `IntakeAssessmentTest` (12) covers:
  - create without a case; one per encounter; another patient's encounter
  - validation and permission
  - auto-link to an existing case; linked when a case opens later
  - case assessments get their patient and encounter
  - UIS rows with guarantors; the PDF's section V and print log
  - case print history including earlier prints
  - SCSR 404; the migration backfill
- `npx tsc -p tsconfig.app.json`: no new errors. ESLint: no warnings in the touched files.
- Dev MySQL: migration applied; `social_case_guard` is still a stored generated column.
