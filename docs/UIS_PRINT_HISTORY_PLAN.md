# UIS Print + Print History — Server Plan (zcmc_mswd_server)

The **Unified Intake Sheet (ANNEX B) is just one printable of the MSWD system.** It
is not a stored record and has no CRUD or lifecycle. The form is rendered **on
demand from a case** (= a hospital encounter) and **every print is logged** in a
dedicated history table.

**Status legend:** ☐ not started · ◐ in progress · ☑ done

| Phase | Depends on | Status |
|-------|-----------|--------|
| 1. `uis_print_logs` table + `UisPrintLog` model | — | ☑ done |
| 2. Render ANNEX B from a case (`UnifiedIntakeSheetPdfService::renderForCase`) | — | ☑ done |
| 3. Endpoints: print (+log) & history | 1, 2 | ☑ done |
| 4. Remove the `UnifiedIntakeSheet` record, table and CRUD | 2 | ☑ done |

---

## Context

The UIS started as a stored `UnifiedIntakeSheet` record (draft → submitted →
finalized) with its own CRUD, Filament wizard and record-keyed PDF. The direction
changed: the UIS is a **printable part of the system**, like the case summary. What
matters is *that it was printed, by whom and when* — not a separately-authored
record. So the record, its table and its lifecycle were removed (phase 4); only the
printable and its print history remain.

Per-encounter is expressed through the case: a case carries `transaction_id` (the
HIS encounter, #152), so "print the UIS for encounter X" = "print the UIS for the
case whose `transaction_id = X`".

## What exists

| Piece | Where |
|---|---|
| ANNEX B form (self-contained styles, logos in `public/images/intake/`) | `resources/views/pdf/unified-intake-sheet.blade.php` |
| Renderer | `app/Services/UnifiedIntakeSheetPdfService.php` — `renderForCase()`, `filenameForCase()` |
| Print log service | `app/Services/UisPrintLogService.php` — `record()`, `history()` |
| Print log model / table | `app/Models/UisPrintLog.php`, `uis_print_logs` |
| Print endpoint | `GET /api/cases/{case}/uis/pdf` → `CaseIntakeSheetPdfController` |
| History endpoint | `GET /api/cases/{case}/uis/prints` → `CaseUisPrintHistoryController` |
| History payload | `app/Http/Resources/UisPrintLogResource.php` |
| Permission | `intake.view` (the only remaining `intake.*` permission) |

### Rendering

The Blade takes plain data — `patient`, `case`, `assessment` (nullable), `printedBy`
(the printing user, printed as "Interviewed by") and `printedAt` — and has no
dependency on a model of its own. `renderForCase()` supplies them:

- `patient` / `case` from the case, with `patient.patientIds`, `patient.familyMembers`,
  `patient.sector` and `patientAssistances.assistantType` eager-loaded;
- `assessment` = the case's latest **intake-time** assessment
  (`social_case_status IS NULL`; the SCSR is deliberately excluded), with `expenses`.

When the case has no assessment yet, those sections print blank — the sheet is a
fillable form. Fields the system does not store (informant, family civil status,
house/light/water, problem-presented boxes, mode/fund source) also print blank.

### Printing and history

`GET /cases/{case}/uis/pdf` serves the PDF and **records a `uis_print_logs` row**
(`case_id`, `patient_id`, `transaction_id` denormalized from the case,
`printed_by`, `printed_at`, `copies`, `remarks`). `?download=1` forces an attachment
(`UIS-{case_code}.pdf`); `?preview=1` renders without logging. The history endpoint
returns the case's prints newest-first.

## Removal of the intake record (phase 4)

Removed: the `UnifiedIntakeSheet` model, DTO, repository, service, requests,
resource, controllers (CRUD / submit / finalize / history / record PDF /
match-patients), swagger docs, the Filament resource, the `/api/intake-sheets/*`
routes, and `intake.create/update/finalize/delete`. The
`unified_intake_sheets` table itself is **retained** (no drop migration) so historical
rows stay queryable.

Deliberately **kept**:

- archived `documents` rows (`document_type = 'intake_sheet'`) and their PDFs under
  `intake-sheets/` — historical signed copies;
- `PatientRepository::matchByIdentity` (used by patient duplicate detection) and
  `HospitalPatient::toPatientAttributes` (used by patient import).

Behaviour changes to know about:

- SCSR `referral_source` / `reason_for_referral` are no longer pre-filled from a sheet;
  they are stored only when supplied.
- `PatientMergeService` no longer reassigns intake sheets. Old merge manifests that
  still carry an `intake_sheets` key are harmless (reversal reads only known keys).
- Production databases keep the stale `intake.create/update/finalize/delete`
  permission rows until pruned; nothing references them.

## Verification

- `php artisan test` — full suite green.
- `tests/Feature/CaseUisPrintTest.php` covers rendering (ANNEX B structure, patient /
  family / assessment data, printing user), one log row per print, `?preview=1` not
  logging, `?download=1` filename, history ordering and scoping, `intake.view`
  gating, and that neither the `unified_intake_sheets` table nor `/api/intake-sheets`
  exists.
