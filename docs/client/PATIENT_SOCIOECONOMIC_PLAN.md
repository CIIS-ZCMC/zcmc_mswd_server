# List of Expenses Tab — Client Plan (zcmc_mswd_client)

Client half of the standalone, patient-level **List of Expenses** module (formerly the "Socio-Economic" tab). The server
half is `zcmc_mswd_server/docs/PATIENT_SOCIOECONOMIC_PLAN.md`. Client phases C5+ are gated on **server PR #187 merged
(S6–S8)** and **S9–S10 deployed**.

**Status legend:** ☐ not started · ◐ in progress · ☑ done

| Phase | Server gate | Status |
|-------|------------|--------|
| C0–C4. First client (household / living / free-line expenses, built on the #185 contract) | S3 | ☑ superseded by C5–C8 (never committed; it targeted the old contract) |
| C5. Contract: types, adapter, API for the new payload; constants and labels | S10 | ☑ |
| C6. The tab: List of Expenses card, Family Income card, trend, header, tab label | C5 | ☑ |
| C7. The form dialog (House/Lot rent, light/water, amounts, family income) + permissions | C6 | ☑ |
| C8. Docs and cleanup | C7 | ☑ |

## Background

The module manages a patient's **expenses** (the ANNEX B section III "List of Expenses") and the **family's income**,
and computes the **total family income**. It is patient-level and independent of cases/assessments/UIS: a patient with
no case can have a record. The first client (C0–C4) was built on the old contract — household, living-conditions and
free-text expense-line cards — and breaks against #187's payload, so it is reworked, not extended.

Tab label **List of Expenses**; the key stays `socioeconomic` (`/patients/:id?tab=socioeconomic`), after `family`, before
`watchers`, so existing links keep working. Unknown `?tab=` already falls back to `profile`.


## The form

| Item | Input |
|---|---|
| House/Lot | **Owned / Rented**; when **Rented**, an **Amount** field (monthly rent) |
| Light Source | Electricity · Kerosene · Candle (multi-select) |
| Water Source | Owned · Public · Artesian Well (multi-select) |
| Food · Transpo · Medikal · Insurance · Education · Clothing · House Help · Others (+ specify) | monthly amount each |
| **Family income** | patient + family members (auto, from the Patient/Family records) + other family sources (typed) → **Total family income** |

Labels use the wording given (Transpo, Medikal) from one constant. Amounts are monthly pesos.

## Boundary rules

- Code stays in `src/features/socioeconomic/` and imports nothing from `features/cases/`; the tab takes only `patient`
  (no `onOpenCaseNeeded`, no classification, no problem-presented, no UIS links).
- Its mutations invalidate only `socioeconomicKeys`.
- Shared option lists stay in `src/lib/socioeconomic-constants.ts`, money formatting in `src/lib/format-currency.ts`.

## Server contract (reference)

`GET /api/patients/{id}/socioeconomic` (`socioeconomic.view`) → `{ data: { current|null, live_income, history[] } }`:

```
current { id, patient_id, recorded_on, recorded_by{id,name}, remarks,
          house{ tenure, rent_amount }, light_source[], water_source[],
          expenses{ food, transport, medical, insurance, education, clothing, house_help, others, others_specify },
          total,
          income{ patient_income, family_members[{name, relationship, monthly_income}], family_members_total,
                  other_sources[{source, amount}], other_sources_total, total_family_income,
                  balance, expense_to_income_ratio, income_changed } } | null
live_income { patient_income, family_members[{id, name, relationship, monthly_income}], family_members_total, total }
history[]   { id, recorded_on, house_tenure, total, total_family_income, balance }     // newest first, max 10
```

Also: `GET /api/socioeconomic-profiles/{id}` (same shape as `current`), `POST /api/patients/{id}/socioeconomic-profiles`,
`PUT|DELETE /api/socioeconomic-profiles/{id}`. The client must handle: amounts are numbers or `null`; `house.rent_amount`
is `null` unless rented (and switching to Owned clears it — send it again when switching back); `total_family_income`,
the snapshot fields and `total` are **computed by the server and never sent**; `refresh_income: true` on `PUT`
re-reads the live family; `income_changed` is informational; `current` is `null` for a patient with no record.

## Phase C5 — Contract + constants

- `types/api.types.ts`, `types/socioeconomic.types.ts` and `api/socioeconomic-adapter.ts` are rewritten to the payload
  above: `house{tenure, rentAmount}`, `lightSource[]`, `waterSource[]`, `expenses{food, transport, medical, insurance,
  education, clothing, houseHelp, others, othersSpecify}`, `total`, `income{patientIncome, familyMembers[],
  familyMembersTotal, otherSources[{source, amount}], otherSourcesTotal, totalFamilyIncome, balance,
  expenseToIncomeRatio, incomeChanged}`, overview `liveIncome`, `history[{id, recordedOn, houseTenure, total,
  totalFamilyIncome, balance}]`. The patient / household / members / lines / slots types are removed.
  `SaveSocioeconomicInput` = `{recordedOn, houseTenure, houseRentAmount, lightSource[], waterSource[], the eight
  amounts, othersSpecify, otherIncomeSources[], remarks, refreshIncome?}`, sent as snake_case.
- `features/socioeconomic/lib/expense-item-labels.ts` (replaces `expense-slot-labels.ts`): the eight items in form order
  with the given labels — Food, **Transpo**, **Medikal**, Insurance, Education, Clothing, House Help, Others.
- `src/lib/socioeconomic-constants.ts`: drop `EXPENSE_CATEGORY_OPTIONS` (free-line list, no longer used); keep the
  tenure / light / water options and `labelFor`.
- `hooks/use-socioeconomic.ts` keeps its hook names; only the types change.

## Phase C6 — The tab ("List of Expenses")

- `patients/components/patient-detail-view.tsx`: the tab label becomes **List of Expenses** (key unchanged; icon
  `Wallet` or `Receipt`). Page and dialog titles and the empty state say "List of Expenses".
- `components/expenses-card.tsx` (rewritten): the form as read-only rows — **House/Lot** (Owned/Rented with the rent
  amount when rented), **Light Source**, **Water Source** (chips), the eight amounts (Others with its "specify" text),
  **Total expenses**.
- `components/income-card.tsx` (rewritten): patient income, family-member lines (name · relationship · amount), other
  sources, **Total family income**, then **Balance** (income − expenses) and the expense-to-income bar (hidden when the
  ratio is `null`). A neutral notice with **Update** when `income.incomeChanged`.
- `household-card.tsx` and `living-conditions-card.tsx` are removed — living conditions are part of the List of Expenses
  card, and household size is not part of this module.
- `components/trend-card.tsx` / `history-detail-sheet.tsx`: rows show date, tenure, total family income, total expenses
  and balance with change arrows; a row opens that record read-only.
- `components/socioeconomic-header.tsx`: "As of <recorded_on> · recorded by <name>" with Edit / Delete.

## Phase C7 — The form dialog (`components/dialogs/profile-form-dialog.tsx`, rewritten)

Sections in the order of the form:

- **House/Lot** radio (Owned | Rented). The **Amount** input shows **only when Rented** and is cleared when switched to
  Owned (the server clears it too).
- **Light Source** and **Water Source** checkbox groups.
- The eight amount fields; **Others** also has a "specify" text.
- **Family income:** read-only auto lines from `liveIncome` (the patient and each family member, with a "Manage family →"
  link to `?tab=family`), an editable **Other family income** repeater (source + amount), and a live **Total family
  income**, **Total expenses** and **Balance**.
- Remarks. Create and edit share the mutations; an edit has a "Refresh income from family records" switch
  (`refreshIncome`). Server 422s show per field.

**Permissions:** use only `socioeconomic.view | create | update | delete`. The current code also accepts `patients.*` as
fallbacks, which would show buttons the server refuses (the routes are gated by `socioeconomic.*` only). Buttons are
hidden, not disabled.

## Phase C8 — Docs and cleanup

Update `CLAUDE.md` (the tab is named **List of Expenses**); delete the unused `household-card.tsx`,
`living-conditions-card.tsx` and `expense-slot-labels.ts`; mark these phases done. Commit only socio-economic files.

## Reuse

`family-tab.tsx` Card/Table markup, `family-member-dialog.tsx` (linked, not embedded), `hospital-encounters-tab.tsx`
loading/error states, `usePermission` / `useAnyPermission`, `ApiError`, the shared UI primitives, `formatCurrency`.

## Verification

No test runner: `npm run build` per phase; the lint baseline must not grow; `grep -r "features/cases"
src/features/socioeconomic` returns nothing. In the browser against a local server:

1. A patient with **no case** shows the empty state; Record creates a record and the cards fill.
2. House/Lot: Owned hides the amount; Rented shows it and it counts in Total expenses; light/water multi-selects save.
3. A patient with an income and two family members with incomes: the form pre-fills their lines; adding "Other family
   income" updates **Total family income** live; the saved total matches the server.
4. Change a family member's income → the tab shows the income-changed notice; a new record (or "Refresh income") clears it.
5. Balance and the ratio bar are right; two records show the trend newest first; a row opens read-only.
6. A user with only `socioeconomic.view` sees no edit buttons; Admin sees everything; the tab reads **List of
   Expenses**; the `?tab=socioeconomic` deep link works; mobile stacks the cards.

## Non-goals

Household size, per-capita income and MSWD classification; any case or UIS link; editing family members inside the tab;
a PDF; per-bill light/water amounts.
