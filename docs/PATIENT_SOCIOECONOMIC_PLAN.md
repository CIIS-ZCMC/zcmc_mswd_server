# Patient List of Expenses Module — Server Plan (zcmc_mswd_server)

Backend of the patient-page **List of Expenses** tab (ANNEX B section III): a **standalone, patient-level** module,
independent of cases and the UIS. Internally it keeps the names `socioeconomic` (routes, `socioeconomic.*` permissions,
tables, classes) so nothing already merged or seeded breaks; only the staff-facing label is "List of Expenses". The
client half is `zcmc_mswd_client/docs/PATIENT_SOCIOECONOMIC_PLAN.md`.

**Status legend:** ☐ not started · ◐ in progress · ☑ done

| Phase | Depends on | Status |
|-------|-----------|--------|
| S1. Schema: `patient_socioeconomic_profiles` + `patient_socioeconomic_expenses` (free-text lines) | — | ☑ done (#185) |
| S2. Models, audit ownership, patient-merge support, permissions | S1 | ☑ done (#185) |
| S3. API: overview, show, store, update, destroy | S2 | ☑ done (#185) |
| S4. Tests incl. the independence guard | S3 | ☑ done (#185) |
| S5. Docs | S4 | ☑ done (#185) |
| S6. Rework schema to the fixed List of Expenses form | S5 | ☑ done |
| S7. Model, service, requests, API reshaped to the form | S6 | ☑ done |
| S8. Tests rewritten; docs | S7 | ☑ done |
| S9. Schema: family-income snapshot columns (alter migration) | S8 (#187 merged) | ☐ |
| S10. `FamilyIncome` support class; model, service, request, API, OpenAPI | S9 | ☐ |
| S11. Tests; docs | S10 | ☐ |

S1–S5 shipped the first design (free-text expense lines, income, per-capita). S6–S8 replace it with the fixed form.
S9–S11 add the **family income** half back (patient + family members + other family sources → total family income),
because the module manages the patient's expenses *and* the family's income.

## Background

The first design recorded income, a household snapshot, per-capita income and free-text expense lines. The module is
really the **List of Expenses** of the Unified Intake Sheet: a fixed set of items, not free text. This rework makes the
data match that form exactly. It stays patient-level and independent of cases/assessments/UIS (no FK or read either
way), dated and append-only (newest `recorded_on, id` = current; the rest = history), audited, soft-deleted, merged with
the patient, and gated by its own `socioeconomic.*` permissions (Admin has all via `'*'` and `Gate::before`).

## Decisions

1. **Expenses form + family income.** Dropped for good: housing-type text, utilities text, per-capita income, the
   household-size snapshot and the live-household block in the overview. Family income comes back in S9–S10.
2. **One column per item** on the profile row; the free-text expense-lines table is removed.
3. **Label-only rename.** Routes, permissions, tables, models and the client folder keep their `socioeconomic` names.
4. **Independence rules unchanged** (enforced by a test): no `case_id` / `assessment_id`, no FK to cases or assessments,
   and the module's sources never reference `Assessment`, `CaseModel` or the classification action.

## The form

| Item | Input | Stored as |
|---|---|---|
| House/Lot | option **Owned / Rented**; if Rented, show **Amount** | `house_tenure` (`owned`\|`rented`), `house_rent_amount` |
| Light Source | Electricity, Kerosene, Candle (checkboxes) | `light_source` json |
| Water Source | Owned, Public, Artesian Well (checkboxes) | `water_source` json |
| Food, Transpo, Medikal, Insurance, Education, Clothing, House Help | amount each | `food`, `transport`, `medical`, `insurance`, `education`, `clothing`, `house_help` |
| Others | amount + what it is | `others`, `others_specify` |
| Record | date, remarks | `recorded_on`, `remarks` |

Amounts are monthly pesos, `decimal(12,2)` nullable (blank = none / unknown). **Total expenses** = rent amount (only
when rented) + the eight amounts, computed and not stored. `house_rent_amount` is kept only when
`house_tenure = 'rented'` — the service clears it otherwise. Staff-facing labels, exactly: "House/Lot", "Light Source",
"Water Source", "Food", "Transpo", "Medikal", "Insurance", "Education", "Clothing", "House Help", "Others".

## Phase S6 — Schema (new alter migration)

`database/migrations/2026_10_06_010000_rework_socioeconomic_to_list_of_expenses.php` — an alter migration, not an
in-place edit, so it is safe whether or not #185 has run somewhere.

- On `patient_socioeconomic_profiles`: **add** `house_rent_amount`, `food`, `transport`, `medical`, `insurance`,
  `education`, `clothing`, `house_help`, `others` (all `decimal(12,2)` null) and `others_specify` (string 255 null);
  **drop** `total_family_income`, `other_income_sources`, `housing_type`, `utilities_access`, `household_size`,
  `net_per_capita_income`. Kept: `patient_id`, `recorded_on`, `recorded_by`, `house_tenure`, `light_source`,
  `water_source`, `remarks`, timestamps, soft deletes, the `(patient_id, recorded_on, id)` index.
- **Drop** `patient_socioeconomic_expenses`.
- `down()` recreates the dropped table and columns (data is not restored). No data migration: the module has no
  consumers or production data yet (the client tab is not built).

## Phase S7 — Model, service, requests, API

- `PatientSocioeconomicProfile`: new `$fillable` and `decimal:2` casts for the nine amounts; `EXPENSE_ITEMS` lists the
  eight plain items; `total()` = rent (rented only) + the eight items. The `expenses()` relation is removed and
  `PatientSocioeconomicExpense` is **deleted**. `activityOwner()` is unchanged.
- `SocioeconomicProfileService`: `create` / `update` take the flat fields; any tenure other than `rented` clears
  `house_rent_amount` (an update that leaves the tenure alone keeps it); `delete` unchanged.
- `PatientSocioeconomicService::overview()` — the `patient{}` and `household{}` blocks are removed:
  ```
  current   { id, patient_id, recorded_on, recorded_by{id,name}, remarks,
              house{ tenure, rent_amount }, light_source[], water_source[],
              expenses{ food, transport, medical, insurance, education, clothing, house_help,
                        others, others_specify },
              total, created_at, updated_at } | null
  history[] { id, recorded_on, house_tenure, total }        // newest first, max 10
  ```
  `GET /socioeconomic-profiles/{profile}`, `POST` and `PUT` return the same `current`-shaped record.
- `StoreSocioeconomicProfileRequest`: `recorded_on` required date ≤ today; `house_tenure` in
  `SocioeconomicVocabulary::HOUSE_TENURES`; `house_rent_amount`, the eight amounts and `others` numeric ≥ 0, nullable;
  `light_source.*` / `water_source.*` `Rule::in` the vocabulary; `others_specify` string ≤ 255; `remarks` string.
  `UpdateSocioeconomicProfileRequest` keeps its shape (all optional).
- Routes and permissions are **unchanged**. OpenAPI docs reworded to "List of Expenses".
- `App\Support\UisExpenseSlots` is no longer used by the module (the UIS still uses it); `SocioeconomicVocabulary` stays.
- Locked tests `AuditCoverageTest` and `ActivityOwnershipResolverTest` drop `PatientSocioeconomicExpense`.

## Phase S8 — Tests and docs

`tests/Feature/SocioeconomicProfileTest.php` is rewritten. **Kept:** a patient with no cases end to end; history order,
cap and same-day tie-break; soft delete; patient isolation; the permission matrix; `socioeconomic.view` without
`patients.view`; 401/404; query-count guard; merge and unmerge; audit ownership (`patient_id` set, `case_id` null);
the independence guard (also asserts the dropped table and columns are gone).
**Replaced** (income / slots / household tests) with: total = rent (rented) + the eight amounts; rent kept when
rented and cleared when owned or unset, including on update; an update that leaves the tenure alone keeps the rent;
blank amounts count as zero; validation (bad tenure / light / water, negative or non-numeric amount, over-long specify,
future or missing date); the payload carries no income / household / classification.

## Phase S9 — Family-income schema (new alter migration, after `2026_10_06_010000`)

On `patient_socioeconomic_profiles` add: `patient_income` decimal(12,2) null; `income_members` json null — a snapshot
`[{name, relationship, monthly_income}]` of the family members who have income; `other_income_sources` json null —
`[{source, amount}]` typed in this module; `total_family_income` decimal(12,2) null. `down()` drops them. No data to
carry over.

## Phase S10 — `FamilyIncome`, model, service, API

**Decisions.**

- `total_family_income` = `patient_income` + Σ family-member incomes + Σ other sources. The first two are read from
  `Patient.monthly_income` and **every** `PatientFamilyMember.monthly_income` (not only members living with the patient)
  **when the record is created** and stored as a snapshot; the third is typed here. A member with no income adds nothing.
- **Snapshots, not live reads**, so history stays interpretable. `PUT` keeps the snapshot and recomputes the total when
  `other_income_sources` is sent; `refresh_income: true` on `PUT` re-reads the live family. A changed family is
  normally a new dated record; `income_changed` tells the client.
- Derived, never stored: `balance = total_family_income − total` and `expense_to_income_ratio` (null when income is
  0/null). No household size, per-capita or classification.
- **Independence unchanged:** `FamilyIncome` reads `Patient` and `PatientFamilyMember` (patient-level records), never
  cases or assessments; the independence guard test is extended to it.

**Changes.**

- **`App\Support\FamilyIncome`** (new): `snapshot(Patient): {patient_income, income_members[], members_total, total}` — the
  single place that reads the patient and family; used at record time and by the overview for the live preview and
  `income_changed`.
- **Model:** the four columns in `$fillable`/casts (`income_members`, `other_income_sources` as `array`);
  `otherIncomeTotal()` and `incomeTotal()` (patient + Σ members + other, rounded to 2 dp).
- **Service:** `create()` stores `FamilyIncome::snapshot()` then computes `total_family_income`; `update()` keeps the
  snapshot, recomputes when `other_income_sources` is present and re-snapshots on `refresh_income`; one transaction.
- **Requests:** `other_income_sources` nullable array, `.*.source` required string ≤ 255, `.*.amount` required numeric ≥ 0;
  `refresh_income` boolean (update only). `patient_income`, `income_members` and `total_family_income` are never
  accepted from the body.
- **Presenter / overview** — every record gains:
  ```
  income{ patient_income, family_members[{name, relationship, monthly_income}], family_members_total,
          other_sources[{source, amount}], other_sources_total, total_family_income,
          balance, expense_to_income_ratio, income_changed }
  ```
  `income_changed` = snapshot patient/members income ≠ the live family's (computed in the overview and show only). The
  overview also returns `live_income{ patient_income, family_members[{id, name, relationship, monthly_income}],
  family_members_total, total }` (what the form pre-fills) and `history[]` rows add `total_family_income` and `balance`.
- Routes and `socioeconomic.*` permissions unchanged (Admin keeps access via `'*'` / `Gate::before`); OpenAPI updated.

## Phase S11 — Tests and docs

Extend `SocioeconomicProfileTest.php`: income snapshot at create (patient + members); total = patient + members + other
sources; members without income ignored; a patient with no family and no income; `PUT` keeps the snapshot after the
family changes, recomputes on `other_income_sources`, re-snapshots with `refresh_income`; `income_changed` flips after
a family income edit and clears on a new record; `balance` and the ratio (null for 0/null income); validation (blank or
negative other source; the body cannot set `total_family_income`); history rows carry income and balance; merge and
unmerge unaffected; the independence guard also covers `FamilyIncome.php`. Full `php artisan test` green. Update this
doc's notes and contract. Do not commit a regenerated `storage/api-docs/api-docs.json` (the committed file has drifted).

## Notes from building it

- **Total is computed, not stored**, so it can never drift from the amounts; `history[].total` uses the same method.
- **Switching owned → rented through an update needs the rent sent again**, because switching to owned clears it.
- **`house.rent_amount` is `null` unless rented** in every response, even if a legacy value were present.
- The shipped tables from #185 are altered in place by an additive migration; existing databases just run `migrate`.
- Final state: 675 tests passing (2302 assertions).

## Verification

`php artisan test`; with a patient who has zero cases exercise all five endpoints; an Admin and a view-only Processor
behave as before; the Rented/Owned amount rule works through the API. After S9–S10: a patient with a monthly income and two family members with incomes gets
`total_family_income` on `POST`; editing a member's income raises `income_changed`. Deploy: `php artisan migrate`, no re-seed.

## Non-goals

Per-capita income, household size and MSWD classification (UIS concepts); live-recomputed history; free-text expense lines; Problem Presented; linking to
or prefilling the UIS; renaming routes, permissions or tables; Filament screens; a PDF.
