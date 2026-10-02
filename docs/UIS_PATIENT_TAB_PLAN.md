# UIS Patient Tab — Server Plan (zcmc_mswd_server)

Backend half of the redesigned patient-page UIS tab. The client half is
`zcmc_mswd_client/docs/UIS_PATIENT_TAB_PLAN.md`; client phases are gated on the server phases here being deployed.

**Status legend:** ☐ not started · ◐ in progress · ☑ done

| Phase | Depends on | Status |
|-------|-----------|--------|
| 0. Reconcile the working tree (restore the #179 endpoint files) | — | ☑ done |
| B1. Shared expense slots (`UisExpenseSlots`) used by the PDF and the API (#180) | 0 | ☑ done |
| B2. Extend `GET /patients/{patient}/uis` (`household_size`, `expense_slots`) (#180) | B1 | ☑ done |

## Background

`GET /patients/{patient}/uis` (#178 / #179) returns every case (= hospital encounter) of a patient with its intake
assessment, readiness and print stats in one request. The patient-page UIS tab is being redesigned as an
**encounter picker + one in-page ANNEX B sheet** (client plan). For the sheet to match the printed form without the
client re-implementing print logic, the endpoint must also return the values the PDF computes:

- the **expense slots** (Food, Education, House/Lot, House help, Others, …). Today this logic is a closure inside
  `resources/views/pdf/unified-intake-sheet.blade.php` (keyword matching, summing, the "Others:" rule);
- the **household size** the classification used (the client's classification card shows "Household Size 1"
  because the server never sends it).

## Phase 0 — Reconcile the working tree

The working tree has the #179 files deleted and uncommitted: `app/Http/Controllers/PatientUisController.php`,
`tests/Feature/PatientUisTest.php`, the `routes/api.php` route line, and `UisReadinessService::build()` (the batch
summary the controller calls). This redesign **extends** that endpoint, so `git restore` those four first (or confirm
the deletion was intended before starting).

## Phase B1 — Shared expense slots

- New `app/Support/UisExpenseSlots.php`: `slots(Collection $expenses): array` returning
  `housing, food, education, transport, clothing, medical, house_help, insurance, others`
  (a float sum, or `null` when no line matches). It owns the keyword table and the rules now in the Blade closure:
  a slot sums every matching line; an "Others: …" line counts under `others` only; `housing` keywords are
  `house rent`, `house tenure`, `rent`, `inuupahan` (no bare `house` / `lot`).
- `resources/views/pdf/unified-intake-sheet.blade.php` reads the slots from this class instead of its closure.
  Printed output is unchanged — the existing `CaseUisPrintTest` slot tests (House help vs House/Lot, Others summed,
  Clothing not under House/Lot) must stay green.

## Phase B2 — Extend `PatientUisController`

Per row, inside `uis`:

- `household_size` — family members + 1, counted once per patient (not per case); also set on the embedded
  `assessment.household_size` (add the key to `AssessmentResource`, nullable, only filled where the controller supplies it).
- `expense_slots` — `UisExpenseSlots::slots($assessment->expenses)`, `null` object when there is no assessment.
- No N+1: families counted once, expenses already eager-loaded; keep the existing single query set.
- **No new delete endpoint.** The tab deletes through `DELETE /assessments/{id}` (`AssessmentService::delete`, which
  already refuses a finalized SCSR with a 422). The row's `has_social_case` tells the client to hide the action.

## Contract (what the client may rely on, per case row)

```
case{id, case_code, status, transaction_id, transaction_type, date_opened}
uis{has_assessment, assessment_id, ready, missing[], classification{…}|null, print_count, last_printed_at,
    has_social_case, household_size, expense_slots{housing, food, education, transport, clothing, medical,
    house_help, insurance, others}|null, assessment{…AssessmentResource incl. expenses and household_size}|null}
```

## Tests (Pest, extend `PatientUisTest`)

- Slots: "House help" is not counted under `housing`; two "Others" lines sum; a line with no match leaves its slot `null`.
- `household_size` equals family members + 1 and is the same for every case of the patient.
- A case whose assessment was promoted to an SCSR is flagged `has_social_case` and has `assessment: null`.
- Query-count guard with 3+ cases (no per-case query growth).
- `intake.view` gate unchanged (401 unauthenticated, 403 without the permission).
- `UisExpenseSlots` unit-level cases (keyword table, rounding to two decimals).
- Full `php artisan test` stays green.

## Verification

`php artisan test`; then hit the endpoint for a patient with three cases (assessed / not assessed / promoted to SCSR)
and compare each `expense_slots` with the PDF preview of the same case.

## Non-goals

A new write endpoint; changing the print contract (`/cases/{case}/uis/pdf`, 409 `uis_no_assessment`); per-slot light/water
bill amounts (ANNEX B has no slot for them).
