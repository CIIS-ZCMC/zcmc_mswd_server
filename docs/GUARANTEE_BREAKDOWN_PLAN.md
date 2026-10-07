# Guarantee Breakdown Rewrite — Plan (server + Filament + Inertia SSR client)

Each breakdown line of a patient guarantee is entered in this order: **Type of Assistance → Amount → Mode of
Assistance → Fund Source**. Every choice comes from the Library. Applies to both the client and Filament `/admin`.

The lists are prepared in `docs/LIBRARY_REVISION_PLAN.md`:
- Types of Assistance are a Library list.
- Fund Sources absorb the old Assistance Sources (City Mayor, City Council, …), including "Others → specify".

Builds on `docs/PATIENT_GUARANTOR_PLAN.md`. Ships as one issue, one branch and one PR per phase.

**Status legend:** ☐ not started · ◐ in progress · ☑ done

| Phase | Side | Depends on | Status |
|-------|------|-----------|--------|
| 1. Breakdown rewrite end to end: API, Filament guarantees screen, client form and displays (one PR) | both | Library revision phases 1–3 | ☐ not started |
| 2. Docs and verification | both | 1 | ☐ not started |

After phase 1 merges, Library revision phase 4 removes Assistance Sources and `patient_guarantee_items.assistance_source_id`.

## Background

- `patient_guarantees` holds the header (guarantor, HIS encounter, reference no., date, remarks). Its lines in
  `patient_guarantee_items` hold `assistance_source_id`, `others_specify` and `amount`. The total is the sum of the
  lines.
- Library revision phase 1 adds `patient_guarantee_items.fund_source_id` and backfills it from `assistance_source_id`.
- Writes go through `PatientGuaranteeService`. An edit that sends `items` replaces the lines, and each change is
  audited.
- Filament has no guarantee screen yet. Guarantees are recorded in the client, from a hospital encounter.

## Decisions

1. **Required on every new or edited line:** Type of Assistance, Amount, Mode of Assistance and Fund Source, plus
   Specify when the fund source requires it.
   - Old lines arrive with their Fund Source (from the backfill) but no Type or Mode. Those must be filled the next
     time that guarantee is edited.
2. **One line per Type of Assistance** per guarantee: `distinct` moves to `assistant_type_id`.
3. **Lines store foreign keys** (`assistant_type_id`, `mode_of_assistance_id`, `fund_source_id`), with `withTrashed()`
   relations.
4. **A retired option is kept on edit.** An edit may keep an option the guarantee already used, even if it was retired
   or deleted since. New choices must be active.
5. **Filament can view, edit and delete guarantees.** Recording a new one stays in the client, because it needs the
   HIS encounter.
6. **The whole change ships in one PR** (server, Filament and client), so the form never disagrees with the API.

## Phase 1 — Breakdown rewrite end to end

### Server
- Migration: nullable FKs `assistant_type_id` (to `assistant_types`) and `mode_of_assistance_id` (to
  `mode_of_assistances`) on `patient_guarantee_items`. `fund_source_id` already exists from the Library revision.
- **`PatientGuaranteeItem`:**
  - fillable gets `assistant_type_id`, `mode_of_assistance_id` and `fund_source_id`
  - new relations `assistanceType()`, `modeOfAssistance()` and `fundSource()`, all `withTrashed()`
  - `source()` stays until Library revision phase 4
- **Validation** (`StorePatientGuaranteeRequest::itemRules`, inherited by `UpdatePatientGuaranteeRequest`):

| Field | Rules |
|---|---|
| `items.*.assistant_type_id` | required, integer, **distinct**, `SelectableLookupId` |
| `items.*.amount` | required, numeric, > 0 |
| `items.*.mode_of_assistance_id` | required, integer, `SelectableLookupId` |
| `items.*.fund_source_id` | required, integer, `SelectableLookupId` |
| `items.*.others_specify` | required when the fund source `requires_specify` |

  - `assistance_source_id` is no longer accepted.
  - The new `SelectableLookupId` (`app/Rules`, modelled on `SelectableLookupCode`) accepts an id that is active and not
    deleted, or one the guarantee's current lines already use. The update request passes those ids from the bound
    guarantee.
- **`PatientGuaranteeService`:** `RELATIONS` becomes `items.assistanceType`, `items.modeOfAssistance` and
  `items.fundSource`; `replaceItems()` writes the new fields.
- **`PatientGuaranteeResource`:** each item has:
  - `assistance_type`, `mode_of_assistance` and `fund_source`, each `{id, name, code}` or null (the fund also carries
    `requires_specify`)
  - `others_specify` and `amount`
  - `source` is removed
- **OpenAPI:** update the item and request schemas in `app/Http/Docs/Schemas/AssistanceSchema.php` and the examples in
  `PatientGuaranteeDocs`.

### Filament
- A new `GuaranteesRelationManager` on `PatientResource`.
  - **Table:** Guaranteed on · Encounter (`his_transaction_id`) · Guarantor · Reference no. · Lines · Total · Recorded by.
    Filters for guarantor and trashed; restore action.
  - **Edit (modal):** guarantor (active plus the current one), reference no., guaranteed on, remarks, and a **Repeater**
    of lines in order:
    1. **Type of Assistance**: Select, `distinct()`
    2. **Amount**: numeric, > 0
    3. **Mode of Assistance**: Select, required
    4. **Fund Source**: Select, required; **Specify** appears when the fund requires it
  - Options come from `idOptions($keepIds)` on the Library models and `Guarantor`: active rows plus the ones the line
    already uses.
  - Save calls `PatientGuaranteeService::update()` via `->using()`, so rules, replace logic and audit match the API.
    Delete calls `delete()` (soft).
  - No create action. The empty state says guarantees are recorded from the encounter in the app.
  - **Permissions:** `guarantee.view` to list, `guarantee.update` to edit, `guarantee.delete` to delete.

### Client
- **Types and adapter** (`features/guarantees/types`, `api/guarantee-adapter.ts`):
  - a line is `{assistanceTypeId, assistanceTypeName, amount, modeOfAssistanceId, modeOfAssistanceName, fundSourceId,
    fundSourceName, fundRequiresSpecify, othersSpecify}`
  - the payload sends `assistant_type_id`, `amount`, `mode_of_assistance_id`, `fund_source_id` and `others_specify`
- **Options:** `useAssistanceTypeOptions`, `useModeOfAssistanceOptions(false)` and `useFundSourceOptions(false)` from
  `features/library/hooks/use-lookup-options.ts`, keyed by `id`. Each shows active options plus the line's current
  retired one as "(inactive)", using the `selectableOptions` pattern in `features/cases/lib/assessment-constants.ts`.
- **`guarantee-form-dialog.tsx`**, each line in order:
  1. **Type of Assistance**: types already used on another line are disabled
  2. **Amount (₱)**
  3. **Mode of Assistance**
  4. **Fund Source**, with **Specify** below it when required
  - **Grid:** Type 4 / Amount 2 / Mode 3 / Fund 3 on desktop, stacking on mobile.
  - **Messages:** per line in field order ("Line 2: select a Mode of Assistance"). Server 422 errors map to
    `items.N.*`.
  - **Old guarantees:** Fund is pre-filled; Type and Mode must be chosen before saving.
  - The "Manage Types" button becomes a **Manage in Library** link to `/library`, shown with `library.manage`.
- **Displays:** `features/guarantees/components/encounter-guarantees-card.tsx` and
  `features/cases/components/case-guarantors-tab.tsx` show Type of Assistance · Amount · Mode · Fund Source (with the
  specify text). Old lines show "—" for Type and Mode.

### Tests
- **API** (`PatientGuaranteeTest`):
  - store and update with all four fields
  - each missing field gives 422
  - a duplicate type is rejected
  - Specify is required for "Others"
  - a retired or deleted option is kept on edit but rejected as a new choice
  - an old line lists, and its edit requires Type and Mode
  - audit entries
- **Filament** (`Livewire::test`):
  - the list renders
  - a repeater edit saves all four fields
  - form errors for missing fields and duplicate types
  - Specify for "Others"
  - delete and restore
  - a Processor can't edit
- **Client checks:** `tsc -p tsconfig.app.json`, `npm run lint`, `npm run build`.

## Phase 2 — Docs and verification

- Mark phases here as they ship.
- Keep unrelated uncommitted work out of these commits: `docs/ENCOUNTER_PRINTABLES_PLAN.md`, the hospital and
  encounter UI edits, and the UIS print CSS.
- **Note:** the Encounter Printables slips (MAIFIP / City Mayor) may want to print Type, Mode and Fund per line later.
  That is out of scope here.

## Verification

1. `composer test`.
2. `npx tsc -p tsconfig.app.json --noEmit` (only the three existing errors), `npm run lint` (0 errors), `npm run build`.
3. `php artisan migrate`, then `composer dev`:
   - **New guarantee:** add a guarantor on an encounter. Each line asks Type → Amount → Mode → Fund, plus Specify for
     "Others". Saving is blocked until all are filled; the total is correct; the encounter card and case tab show the
     four columns.
   - **Old guarantee:** editing it shows the Fund pre-filled, and Type and Mode must be chosen before saving.
   - **Retired option:** retire a fund source or type in the Library. It disappears from new lines but stays on the
     guarantee that used it, and that guarantee can still be saved.
   - **Filament:** in `/admin` > Patients > a patient > Guarantees, edit the breakdown in the same order. The change
     shows in the client, and the reverse works too.
