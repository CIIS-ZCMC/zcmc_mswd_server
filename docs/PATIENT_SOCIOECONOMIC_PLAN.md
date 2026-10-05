# Patient Socio-Economic Module — Server Plan (zcmc_mswd_server)

Backend of the patient-page **Socio-Economic** tab: a **standalone, patient-level** module (socio-economic profile,
living conditions, list of expenses). The client half is `zcmc_mswd_client/docs/PATIENT_SOCIOECONOMIC_PLAN.md`; client
phases are gated on the server phases here.

**Status legend:** ☐ not started · ◐ in progress · ☑ done

| Phase | Depends on | Status |
|-------|-----------|--------|
| S1. Schema: `patient_socioeconomic_profiles` + `patient_socioeconomic_expenses` | — | ☑ done |
| S2. Models, audit ownership, patient-merge support, permissions | S1 | ☑ done |
| S3. API: overview, show, store, update, destroy (+ OpenAPI) | S2 | ☑ done |
| S4. Tests incl. the independence guard | S3 | ☑ done |
| S5. Docs (`CLAUDE.md`, this file) | S4 | ☑ done |

## Background — why this is a rework

The first cut (#183) made `GET /patients/{patient}/socioeconomic` a read model over the intake `Assessment` and its
`assessment_expenses`, with writes going through the assessment endpoints. That makes the module depend on cases: a
patient with no case has no profile, and edits ride on UIS data. The module must instead be its own patient-level
store. #183's endpoint has no consumers (the client tab is not built), so it is **replaced**, not versioned.

## Decisions

1. **Own tables, patient-scoped.** Data lives in new tables keyed by `patient_id`. Existing tables are unchanged.
2. **Dated, append-only records.** Each "update" is a new record (`recorded_on`); the newest by
   `recorded_on desc, id desc` is *current*; the rest are history/trend. Typo corrections use `PUT` on a record.
3. **Fully independent of the UIS/assessment.** No FK or read in either direction. The UIS keeps its own snapshot and
   its own MSWD classification. A later opt-in "prefill the UIS from the profile" is out of scope.
4. **No classification here.** MSWD classification is a case/UIS concept. The module computes only per-capita income
   `(income − expenses) / household_size`.
5. **No "Problem Presented".** That is a per-encounter UIS section.
6. **Own permissions** `socioeconomic.view | create | update | delete`.

## Boundary rules (enforced by a test)

- No table or column references `cases`, `assessments` or `assessment_expenses`.
- The module's source files do not import `Assessment`, `AssessmentExpense`, `CaseModel`,
  `CalculateMswdClassificationAction` or any assessment service.
- Allowed shared helper, because it is case-agnostic: `App\Support\UisExpenseSlots` (ANNEX B expense slots).
  Vocabulary constants for tenure/light/water are **duplicated** in `App\Support\SocioeconomicVocabulary`, not imported
  from `Assessment`.

## Phase S1 — Schema

New create-table migrations only (the repo's one-create-per-table style).

`patient_socioeconomic_profiles`

| Column | Notes |
|---|---|
| `id`, `timestamps`, `softDeletes` | |
| `patient_id` | FK `patients`, RESTRICT |
| `recorded_on` | date |
| `recorded_by` | FK `users` |
| `total_family_income` | decimal(12,2) null |
| `other_income_sources` | json null |
| `house_tenure` | string null (`owned` \| `rented`) |
| `housing_type`, `utilities_access` | string null, free text |
| `light_source`, `water_source` | json null (vocabulary arrays) |
| `remarks` | text null |
| `household_size` | unsigned smallint — family members + 1 **at record time** |
| `net_per_capita_income` | decimal(12,2) null — computed on write |
| index | `(patient_id, recorded_on, id)` |

`patient_socioeconomic_expenses`: `id`, `profile_id` FK RESTRICT, `expense_type` string(255), `amount` decimal(12,2),
`timestamps`.

## Phase S2 — Models, audit, merge, permissions

- `App\Models\PatientSocioeconomicProfile` (`Auditable`, `SoftDeletes`; `belongsTo patient`; `hasMany expenses`;
  decimal/array/date casts) and `PatientSocioeconomicExpense` (`Auditable`). `Patient::socioeconomicProfiles()`.
- `activityOwner()`: profile → `['patient_id' => patient_id, 'case_id' => null]`; expense → one hop via its profile.
  Update the two locked tests: `AuditCoverageTest` (model lists) and `ActivityOwnershipResolverTest` (a dataset row per
  resolver — its reflection guard fails otherwise).
- `PatientMergeService::REASSIGNABLE` gains `'socioeconomic_profiles' => PatientSocioeconomicProfile::class`, so a merge
  moves the records and an unmerge reverses it.
- `RolesAndPermissionsSeeder`: add `socioeconomic.view|create|update|delete`; grant `view` wherever `intake.view` is
  granted, `create|update` wherever `patients.update` is, `delete` to MSS Head (Admin has `*`).

## Phase S3 — API (patient-scoped; no case in any URL)

| Route | Permission | Purpose |
|---|---|---|
| `GET /patients/{patient}/socioeconomic` | `socioeconomic.view` | overview (below) |
| `GET /socioeconomic-profiles/{profile}` | `socioeconomic.view` | one record in full (history row) |
| `POST /patients/{patient}/socioeconomic-profiles` | `socioeconomic.create` | new dated record, nested `expenses[]` |
| `PUT /socioeconomic-profiles/{profile}` | `socioeconomic.update` | correct a record; `expenses[]`, when present, **replaces** the lines in one transaction |
| `DELETE /socioeconomic-profiles/{profile}` | `socioeconomic.delete` | soft delete |

Files: `PatientSocioeconomicController` (overview, rewritten), `SocioeconomicProfileController`
(show/store/update/destroy), `SocioeconomicProfileService` (transaction, household snapshot, per-capita),
`StoreSocioeconomicProfileRequest` / `UpdateSocioeconomicProfileRequest`, `SocioeconomicProfileResource`,
`SocioeconomicProfileDto`, `PatientSocioeconomicDocs` + schema. Routes go next to `patients/{patient}/uis` in
`routes/api.php`.

Validation: `recorded_on` date, not in the future; `total_family_income` numeric ≥ 0; `house_tenure` /
`light_source.*` / `water_source.*` `Rule::in` the vocabulary; `expenses.*.expense_type` string max 255,
`expenses.*.amount` numeric ≥ 0; `recorded_by` is the authenticated user (never from the body).

Overview response `{ data }`:

```
patient   { occupation, monthly_income, educational_attainment, civil_status }
household { size, members_count, earners_count, members_income_total, members[…] }      // live, from family members
current   { id, recorded_on, recorded_by{id,name}, income{ total_family_income, net_per_capita_income,
            other_income_sources[] }, living{ housing_type, house_tenure, light_source[], water_source[],
            utilities_access }, remarks, household_size, household_changed,
            expenses{ lines[{id,expense_type,amount}], slots{…UisExpenseSlots keys}, total,
                      expense_to_income_ratio } } | null
history[] { id, recorded_on, total_family_income, net_per_capita_income, expenses_total, household_size,
            house_tenure }                                                             // newest first, max 10
```

`household_changed` = the current record's `household_size` ≠ today's live size (informational). `expenses.total` sums
every line (unmatched lines are not lost); the ratio is `null` when income is null/0. Constant query count
(patient members; profiles limited to 10 with `withSum`; current record's lines).

## Phase S4 — Tests (`tests/Feature/SocioeconomicProfileTest.php`, replacing `PatientSocioeconomicTest`)

A patient with **no cases at all** can create, read, edit and delete (headline test); create → current + history order
and cap; household snapshot and `household_changed` after adding a family member; nested expenses create / replace /
clear; slots equal `UisExpenseSlots`, total counts unmatched lines, ratio null without income; per-capita math;
validation (bad vocab, negative amount, future date); soft delete drops the record from current/history; patient
isolation; 401/403 per permission; query-count guard; merge moves profiles; audit rows carry `patient_id` with null
`case_id`; **independence guard** (module sources contain no `Assessment`/`CaseModel` references).
Existing `AssessmentExpenseApiTest`, `PatientUisTest`, `CaseUisPrintTest` stay untouched and green; full
`php artisan test` green.

## Phase S5 — Docs

This file. Do not commit a regenerated
`storage/api-docs/api-docs.json` (the committed file has drifted; regenerating rewrites ~1,200 unrelated lines).

## Notes from building it

- **Services return arrays, not DTO/Resource classes.** `PatientSocioeconomicService::present()` shapes one record
  (the same payload for `current`, `show`, `store` and `update`) and `overview()` the tab; there is no
  `SocioeconomicProfileDto` / `SocioeconomicProfileResource`, matching `PatientUisController`'s style.
- **`other_income_sources` is a list of `{source, amount}`** (the shape the UIS already uses), not plain strings.
- **A `PUT` keeps the household-size snapshot.** A changed household is recorded as a new dated profile, so the old
  record stays interpretable; `household_changed` tells the client when to offer one.
- **Routes sit outside the `patients.*` groups** so access depends only on `socioeconomic.*`. A user with
  `socioeconomic.view` but no `patients.view` can read the overview.
- **Existing databases need the permissions seeded** (`php artisan db:seed --class=RolesAndPermissionsSeeder`); view is
  granted with `intake.view`, create/update with `patients.update`, delete to MSS Head (and Admin via `*`).
- **No `CLAUDE.md` exists in the server repo**, so that part of S5 does not apply.
- Final state: 678 tests passing (2314 assertions); the independence guard lives in `SocioeconomicProfileTest`.

## Verification

`php artisan test`; with a patient who has **zero cases**, exercise all five endpoints; check an `activity_log` row for
a profile write has `patient_id` set and `case_id` null; merge two patients and confirm their profiles follow.

## Non-goals

Linking to or prefilling the UIS; MSWD classification; Problem Presented; Filament admin screens; a profile PDF; a
master expense list (`expense_type` stays free text); changing the UIS/assessment endpoints.
