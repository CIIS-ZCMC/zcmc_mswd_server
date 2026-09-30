# UIS Expenses & Problem Presented — Server Plan (zcmc_mswd_server)

Status legend: ☐ not started · ◐ in progress · ☑ done

| Phase | Depends on | Status |
|---|---|---|
| 0 — Keep the `unified_intake_sheets` table (drop migration removed) | — | ☑ |
| 1 — Schema: checkbox columns on `assessments` | 0 | ☑ |
| 2 — API: model, DTO, requests, resource, OpenAPI, Filament | 1 | ☑ |
| 3 — Printable: sections III/IV read the stored values | 2 | ☑ |

## Context
Sections III (List of Expenses) and IV (Problem Presented) of the UIS printable only
printed expense amounts and `presenting_problem`; house tenure, light/water source and the
six problem categories were hard-coded blank boxes because nothing stored them.

## What exists
| Piece | Location |
|---|---|
| Columns `house_tenure`, `light_source[]`, `water_source[]`, `problem_categories[]`, `problem_specify` | `2026_09_30_010000_add_uis_expense_problem_columns_to_assessments_table` |
| Allowed values | `Assessment::HOUSE_TENURES / LIGHT_SOURCES / WATER_SOURCES / PROBLEM_CATEGORIES` |
| Validation | `StoreAssessmentRequest`, `UpdateAssessmentRequest` |
| Expense amounts | unchanged: `assessment_expenses`, keyword-matched in the Blade |
| Printable | `resources/views/pdf/unified-intake-sheet.blade.php` (III/IV); type of assistance printed from `patientAssistances` |
| Signature / thumb mark | intentionally blank (signed on paper) |

## Verification
`tests/Feature/CaseUisPrintTest.php` — ticked boxes render, invalid values are rejected.
