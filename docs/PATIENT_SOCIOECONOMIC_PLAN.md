# Patient Socio-Economic Profile — Server Plan (zcmc_mswd_server)

Backend half of the patient-page **Socio-Economic** tab (profile, living conditions, list of expenses). The client half
is `zcmc_mswd_client/docs/PATIENT_SOCIOECONOMIC_PLAN.md`; client phases are gated on the server phases here.

**Status legend:** ☐ not started · ◐ in progress · ☑ done

| Phase | Depends on | Status |
|-------|-----------|--------|
| B1. `GET /patients/{patient}/socioeconomic` read endpoint (service, controller, route, OpenAPI) | — | ☑ done |
| B2. Tests, incl. stale-classification and edit-path consistency | B1 | ☑ done |

## Background

The socio-economic data already exists but is only visible inside the UIS tab, one encounter at a time: ANNEX B
sections II–IV on the intake `Assessment` row (`house_tenure`, `light_source[]`, `water_source[]`, `housing_type`,
`utilities_access`, `total_family_income`, `net_per_capita_income`, `other_income_sources[]`, `problem_categories[]`,
`AssessmentExpense` lines) plus patient-level facts (`Patient.occupation / monthly_income / educational_attainment`,
`PatientFamilyMember.*`). The tab needs "the patient's current standing and how it changed" in one request.

## Decisions

1. **No new tables, no migration.** The assessment row stays the source of truth; the endpoint is a read model.
2. **"Current" = the newest intake assessment** (`social_case_status IS NULL`, `latest()->latest('id')`) across the
   patient's cases — the same row the UIS endpoint and PDF use. Older ones feed `history`.
3. **Permission `intake.view`**, same as `GET /patients/{patient}/uis`.
4. **No new write endpoints.** Edits go through `PUT /assessments/{id}`, the expense routes, `PUT /patients/{id}` and
   `PUT /family-members/{id}`.
5. **Stale classification is surfaced, not auto-fixed.** `AssessmentService::recalculateClassification` runs on
   assessment/expense writes only; family-member writes do not trigger it, yet the classification divides by
   `familyMembers()->count() + 1`. The endpoint returns `classification.stale` so the client can offer a reassess.
   Recalculating on family writes is a non-goal (it would silently re-classify patients).

## Phase B1 — The endpoint

`GET /api/patients/{patient}/socioeconomic` → `PatientSocioeconomicController` (invokable, `permission:intake.view`) →
`PatientSocioeconomicService::build(Patient)`.

```
data{
  patient{ occupation, monthly_income, educational_attainment, civil_status },
  household{ size, members_count, earners_count, members_income_total, members[…] },
  current{ case{id,case_code,date_opened}, assessment_id, assessed_at,
           income{ total_family_income, net_per_capita_income, other_income_sources[] },
           classification{ calculated, final, discount_rate, has_override, stale },
           living{ housing_type, house_tenure, light_source[], water_source[], utilities_access },
           problems{ categories[], specify, presenting },
           expenses{ lines[{id,expense_type,amount}], slots{…}, total, expense_to_income_ratio } } | null,
  history[{ assessment_id, case_id, case_code, assessed_at, total_family_income, net_per_capita_income,
            classification, expenses_total, house_tenure }]   // newest first, max 10
}
```

- `household.size` = family members + 1 (as `CalculateMswdClassificationAction`). `earners_count` = members with
  `monthly_income > 0` plus the patient when they have income. `members_income_total` is the members' sum.
- `expenses.slots` is `UisExpenseSlots::slots()`; `expenses.total` sums **every** line (unmatched lines are not lost);
  `expense_to_income_ratio` is `total / income` (2 dp), `null` when income is null or 0.
- `classification.stale` = stored `net_per_capita_income` ≠ `round(max(0, income − expenses_total) / size, 2)`.
- Query set is constant: patient family members (one), intake assessments of the patient's cases limited to 10 with
  `withSum('expenses', 'amount')` and the case (one), the current assessment's expense lines (one).
- No intake assessment → `current: null`, `history: []`. A case promoted to the SCSR is excluded (as in the UIS
  endpoint). Soft-deleted cases/assessments are excluded.

Files: `app/Services/PatientSocioeconomicService.php`, `app/Http/Controllers/PatientSocioeconomicController.php`,
`routes/api.php` (next to `patients/{patient}/uis`), `app/Http/Docs/PatientSocioeconomicDocs.php`.

## Phase B2 — Tests (`tests/Feature/PatientSocioeconomicTest.php`)

Auth (401 / 403 without `intake.view`); shape for an assessed patient (slots, unmatched line counted in `total`, ratio);
household size, earners and member income total; no assessment → `current: null`; SCSR excluded; history order and
cap; reassessment chain; query-count guard; cross-patient isolation; `stale` flips after a family member is added and
clears after a reassessment; expense edit through the existing endpoint keeps `stale` false.

## Verification

`php artisan test` (new file + `PatientUisTest`, `AssessmentExpenseApiTest`, `CaseUisPrintTest` stay green); compare
`expenses.slots` with the PDF preview of the same case.

## Non-goals

Schema changes; auto-recalculating classification on family writes; changing the UIS PDF/print contract; a master
expense list; a profile PDF.
