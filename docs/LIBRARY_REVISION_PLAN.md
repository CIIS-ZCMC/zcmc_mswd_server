# Library Revision — Plan (server + Filament + Inertia SSR client)

Revises the Library (`docs/LIBRARY_SETTINGS_PLAN.md`) so it matches how staff describe a guarantee breakdown.

- The current **Assistance Sources** list (City Mayor, City Council, Congressional, Senatorial, Governor, Others) is
  really a **Fund Source**, so it merges into the Library's Fund Sources.
- **Types of Assistance** become their own Library list.
- The Library's tables are rebuilt from a per-tab config.

The guarantee breakdown that uses these lists is planned separately in `docs/GUARANTEE_BREAKDOWN_PLAN.md`. Ships as one
issue, one branch and one PR per phase.

**Status legend:** ☐ not started · ◐ in progress · ☑ done

| Phase | Side | Depends on | Status |
|-------|------|-----------|--------|
| 1. Fund Sources absorb Assistance Sources (schema, data migration, API, Filament) | server | — | ☑ done (#218, #219) |
| 2. Types of Assistance as a Library list (seed, API CRUD, audit, Filament) | server | — | ☑ done (#220, #221) |
| 3. Library tables UI: one config-driven table per tab | client | 1, 2 | ☑ done (#222, #223) |
| 4. Remove Assistance Sources (after the breakdown moves to `fund_source_id`) | both | 3 + Breakdown phase 1 | ☑ done (#226, #227) |
| 5. Docs and verification | both | 4 | ☑ done |

**Order across both plans:**
1. Library phases 1–3
2. Guarantee Breakdown phase 1
3. Library phase 4
4. Docs for both

**All phases shipped.** Guarantee Breakdown phase 1 (#224, #225) landed between Phases 3 and 4, as planned.
The Library now has four tabs: Guarantors, Types of Assistance, Mode of Assistance and Fund Sources.

**Notes from the build:**

- **Phase 1:**
  - `DatabaseSeeder` still calls `AssistanceSourceSeeder`, against the plan, because the current breakdown form reads
    assistance sources until Guarantee Breakdown phase 1. It stops in Phase 4.
  - Until the breakdown rewrite, `PatientGuaranteeService::replaceItems()` fills `fund_source_id` from the fund source
    whose code (else name) matches the line's assistance source, so lines saved from the current form are never left
    without a fund source.
  - `FundSourceSeeder` skips the six former Assistance Sources when `requires_specify` doesn't exist yet. The
    create-table migration runs it first, and the merge migration then adds them with "Others" flagged. It uses
    `withTrashed()->firstOrCreate()` so a deleted row is never re-created over its unique code.
  - The trait method `usageCount()` is renamed `assessmentUsageCount()` (it drives the code lock). `usage_count` is now
    an accessor over `assessments_usage + guarantee_lines_usage`, which `withUsageCount()` selects.
  - The merge's `down()` drops `patient_guarantee_items.fund_source_id` only. The copied fund sources stay, since
    assessments may already use them.

- **Phase 2:**
  - The category vocabulary is enforced on create. An update may keep a type's older category (e.g. `pharmacy`
    from before the vocabulary) but can't switch to another value outside it. Filament adds the older value to its
    Select so editing doesn't blank it.
  - `usage.guarantee_lines` was 0 until breakdown lines stored a type. Since Guarantee Breakdown phase 1 it counts
    them, and `usage_count` is assistance records plus lines.
  - The API resource adds `category_label`. `assistant_types.code` has no unique index (older rows may share or lack
    codes), so uniqueness is enforced by validation.
  - The controller writes through the model directly, like the other Library controllers. The older
    `AssistantTypeService` / repository are untouched.

- **Phase 3:**
  - Built tab config definition system (`LIBRARY_TABS`, `getTabConfig`, `ASSISTANT_TYPE_CATEGORIES`) in `library-tabs.tsx`.
  - Config-driven `LookupTable` and `LookupItemDialog` dynamically adapt columns, inputs, auto-slugging, category filters,
    category badges, code locks, and usage count tooltips.
  - Added full React Query hook suites for `assistant-types` (`useAssistantTypes`, `useCreateAssistantType`,
    `useUpdateAssistantType`, `useDeleteAssistantType`, `useAssistanceTypeOptions`).
  - `LibraryPage` rendered 5 tabs with counts, including the legacy Assistance Sources notice, until Phase 4 removed
    that tab.
  - Review fixes before merging:
    - eight type errors fixed: Base UI `TooltipTrigger` takes `render`, not `asChild`; Select `onValueChange`
      passes `string | null`; `requiresSpecify` can be `null`
    - the dialog locks the code only on the server's `code_locked`; it used to also lock whenever `usage_count > 0`,
      which wrongly locked a fund source used only by breakdown lines
    - an older category outside the vocabulary stays selectable in the dialog
    - the Mode of Assistance examples match the seeded modes

- **Phase 4:**
  - Dropped `patient_guarantee_items.assistance_source_id` FK and column, and dropped `assistance_sources` table.
  - Removed server artifacts: `AssistanceSource` model, controller, requests, resource, seeder, route, OpenAPI schemas & endpoints, and Filament resource.
  - Removed client artifacts: `use-assistance-sources.ts`, `assistance-sources-manager-dialog.tsx`, legacy `assistance-sources` tab in `library-tabs.tsx`, and removed `AssistanceSource` types & adapter methods.
  - Added graceful fallback in `ActivityLogService` for past audit trail logs whose subject class no longer exists (falls back to class basename and handles basename subject_type filtering).
  - Cleaned up test suites (`AuditCoverageTest`, `ActivityOwnershipResolverTest`, `LibraryFilamentTest`, `PatientGuaranteeTest`, `FundSourceMergeTest`, and `ActivityLogEndpointTest`). All tests passing (835+ tests, 0 errors).
  - The merge migration's own tests were removed with the table they read. Phase 1's merge already ran everywhere, and
    `FundSourceMergeTest` now checks that `assistance_sources`, `patient_guarantee_items.assistance_source_id` and
    `/api/assistance-sources` are gone.
  - Review before merging: removed the leftover `isMergedNotice` tab flag; Pint tidied the test imports.

- **Phase 5:**
  - Docs: every phase is marked with its issue and PR, the notes that changed since are updated, and
    `docs/LIBRARY_SETTINGS_PLAN.md` points here.
  - Verification step 3 ran on a throwaway SQLite copy, not the dev database:
    - migrate fresh, roll back four steps to just before the merge, then seed old-style Assistance Sources and
      breakdown lines (a deleted source, a code-less "Barangay Aid!", "Others" with specify text), then migrate
      forward
    - every line got the matching fund source, "Others" kept its flag and specify text, the deleted source arrived
      deleted, the code-less one got the code `barangay_aid`, and `assistance_sources` and `assistance_source_id`
      were gone
    - all four rolled-back `down()` methods ran cleanly
  - Verification step 4 ran in the browser against that copy:
    - the Library showed four tabs with the expected counts (Fund Sources 15, City Mayor … Others with Specify,
      Types of Assistance 4) and "Used in" counts
    - creating a type worked (code auto-filled, category badge shown)
    - Filament Reference Data listed Guarantors, Types of Assistance, Modes of Assistance and Fund Sources, with no
      Assistance Sources
  - Fixes found during verification:
    - the Library's status and category filters showed the raw value ("all") and the dialog's category showed the
      raw code ("medical"); Base UI's `Select.Value` needs a formatter, which now shows "All Statuses", "All
      Categories" and "Medical"
    - Filament navigation read "Types Of Assistance" and "Mode Of Assistances"; it now reads "Types of Assistance" and
      "Modes of Assistance"
  - Not covered here: the encounter guarantee form needs a HIS encounter (SQL Server), so it was checked by tests, not
    in the browser.


## Background

- **Library lists today:**
  - **Guarantors** (`guarantors`)
  - **Mode of Assistance** (`mode_of_assistances`)
  - **Fund Sources** (`fund_sources`: MSWD, MAIP, Malasakit, PCSO, LGU-DSWD, NGO, PhilHealth, Personal), which
    assessments store by **code** for UIS §V
  - **Assistance Sources** (`assistance_sources`, with `requires_specify` for "Others"), which guarantee breakdown lines
    store by id in `patient_guarantee_items.assistance_source_id`
- **`assistant_types`** (name, code, `category`, description, active, soft deletes) already exists and is used by
  `patient_assistance.assistant_type_id`. It has a read-only API (`assistant-types` index/show), no seed data, no audit
  and no admin screen.
- The client Library (`features/library`) renders every tab through one `LookupTable` / `LookupItemDialog` pair that
  branches on `type ===` / `type !==` for each column and field.

## Decisions

1. **One Fund Source list.** Assistance Sources merge into `fund_sources`.
   - `fund_sources` gains `requires_specify`, so "Others → specify" carries over.
   - The Assistance Sources list is removed once nothing uses it.
2. **Types of Assistance reuse `assistant_types`.** They are seeded with Medicines, Hospital Bill, Laboratory /
   Diagnostics and Medical Supplies / Devices (category `medical`).
3. **Category is a fixed vocabulary:** medical, food, financial, burial, transportation, others. The values come from
   the `assistant_types` migration comment. They live in `AssistantType::CATEGORIES` with labels and are validated with
   `Rule::in`.
4. **Write permissions:**
   - Types of Assistance, Mode of Assistance and Fund Sources need `library.manage`.
   - Guarantors keep `guarantee.create`.
   - Filament keeps `settings.manage`.
5. **Usage counts include guarantee lines.** The **code lock** for Mode and Fund still depends only on assessments,
   which store the code. Lines store ids, so Types of Assistance are never code-locked.
6. **Deletes stay soft.** The UI keeps offering "Deactivate Instead" for anything in use.

## Phase 1 — Fund Sources absorb Assistance Sources (server)

- Migration `add_requires_specify_to_fund_sources` (boolean, default false).
- Data migration `merge_assistance_sources_into_fund_sources`:
  - For every `assistance_sources` row, deleted ones included:
    - If a fund source has the same code (or the same name, case-insensitive), reuse it.
    - Otherwise insert it with its code (or a slug of the name, made unique), name, `requires_specify` and
      `is_active`. `sort_order` comes after the existing rows, and `deleted_at` is copied.
  - Add a nullable `patient_guarantee_items.fund_source_id` FK to `fund_sources` and backfill it from that mapping.
  - `assistance_source_id` stays until Phase 4.
- `FundSourceSeeder` adds `city_mayor`, `city_council`, `congressional`, `senatorial`, `governor` and `others` (with
  `requires_specify = true`) so fresh installs match. `DatabaseSeeder` stops calling `AssistanceSourceSeeder`.
- `FundSource`: `requires_specify` goes in fillable and casts, and the model gets `guaranteeItems()`.
- `AssessmentCodeLookup::scopeWithUsageCount` adds guarantee lines. `usageCount()` stays assessments-only for the code
  lock. `AssessmentLookupResource` (API) exposes `code_locked` and `usage: {assessments, guarantee_lines}`.
- `FundSourceRequest` accepts `requires_specify`.
- Filament: `AssessmentLookupResource` (`app/Filament/Support`) gets an optional "Requires specify" toggle and column,
  turned on for `FundSourceResource`.
- OpenAPI: add `requires_specify`, `code_locked` and `usage` to `AssessmentLookup` (`ReferenceSchema.php`).
- **Tests:**
  - mapping by code and by name; deleted rows; a slug collision
  - every line backfilled, with "Others" keeping its specify text
  - seeders idempotent
  - `requires_specify` CRUD; `usage` values; `code_locked` ignoring lines
  - the Filament toggle

## Phase 2 — Types of Assistance (server)

- `AssistantType` becomes `Auditable` (add it to `AuditCoverageTest`).
  - Add `CATEGORIES`, an `ordered()` scope (by name), `idOptions(array $keepIds = [])` and `guaranteeItems()`.
- `AssistantTypeSeeder` (`firstOrCreate` on `code`): `medicines`, `hospital_bill`, `laboratory_diagnostics`,
  `medical_supplies_devices`. Called from `DatabaseSeeder`; the migration also seeds existing environments.
- API: `assistant-types` becomes full CRUD (`except(['create', 'edit'])`), with writes behind `library.manage`.
  - **`StoreAssistantTypeRequest` / `UpdateAssistantTypeRequest`:**
    - name: required, unique among rows not deleted
    - code: required, `^[a-z0-9_]+$`, unique across all rows
    - category: required, `Rule::in(CATEGORIES)`
    - description: nullable
    - is_active: boolean
  - `AssistantTypeResource` gains `usage_count` and `usage: {guarantee_lines, assistance_records}`.
  - `?active=1` hides retired rows. Soft delete returns 204.
- Filament: a new `AssistantTypeResource` ("Types of assistance", Reference Data group, `settings.manage`).
  - Form: name, code, category select, description, active.
  - Table: name, code, category badge, status, used in; trashed filter and restore.
- OpenAPI: `AssistantTypeDocs` gets the write operations and the request schema.
- **Tests:** CRUD, category and code validation, uniqueness, permissions (`library.manage` writes, everyone reads),
  audit, `usage` values, and the Filament list, create, edit and restore.

## Phase 3 — Library tables UI (client)

Each list gets a **tab definition** in `features/library/lib/library-tabs.tsx`: columns, form fields, filters, default
sort and write permission. `LookupTable` and `LookupItemDialog` render from that definition instead of `type`
branches. The current look stays: senior-friendly sizing, labelled Edit / Delete buttons and "Deactivate Instead".

Tabs, in the order a breakdown is entered:

| Tab | DB table | Columns (in order) | Form fields | Extra filter | Default sort | Writes |
|---|---|---|---|---|---|---|
| **Guarantors** | `guarantors` | Name · Address · Status · Used in · Actions | Name*, Address, Active | — | Name | `guarantee.create` |
| **Types of Assistance** | `assistant_types` | Name · Code · Category · Description · Status · Used in · Actions | Name*, Code*, Category* (select), Description, Active | Category | Name | `library.manage` |
| **Mode of Assistance** | `mode_of_assistances` | Order · Name · Code · Status · Used in · Actions | Name*, Code*, Display order, Active | — | Order, then name | `library.manage` |
| **Fund Sources** | `fund_sources` | Order · Name · Code · Specify · Status · Used in · Actions | Name*, Code*, Display order, Requires specify, Active | — | Order, then name | `library.manage` |

- **On every tab:**
  - search (name, code, address or description)
  - status filter (All / Active / Inactive)
  - a count in the tab label
  - inactive rows dimmed with an "Inactive" badge
  - empty, loading and "no matches" states
  - Actions only with the tab's write permission
  - the table scrolls horizontally inside its card on narrow screens, with no page scroll
- **Code:** auto-filled from the name while adding. Shown read-only with a lock badge when `code_locked` is true.
- **Used in:** a "N records" badge with a tooltip listing what uses it, from `usage`.
- **Category:** a Select in the form and a badge in the table.
- **Files:**
  - new `lib/library-tabs.tsx`
  - refactor `components/lookup-table.tsx`, `components/dialogs/lookup-item-dialog.tsx` and
    `components/library-page.tsx`
  - `types/library.types.ts`: `LibraryTabKey` gains `"assistance-types"`; add the `AssistanceType`, `LookupUsage` and
    `codeLocked` types
  - `api/library-api.ts`, `api/library-adapter.ts` and `hooks/use-library.ts`: assistant-type CRUD and options; fund
    `requiresSpecify`; `usage`
  - `hooks/use-lookup-options.ts`: new `useAssistanceTypeOptions`. `LookupOption` gains `id` and `requiresSpecify`.
- Until Phase 4 the old **Assistance Sources** tab stays as a fifth tab, labelled "Being merged into Fund Sources", so
  the current breakdown form still works.
- **Checks:** `tsc -p tsconfig.app.json`, `npm run lint`, `npm run build`.

## Phase 4 — Remove Assistance Sources (both)

Runs **after** Guarantee Breakdown phase 1 has moved breakdown lines to `fund_source_id`.

- Migration: drop `patient_guarantee_items.assistance_source_id` (FK and column), then drop `assistance_sources`.
  `down()` recreates the empty structure; the data already lives in `fund_sources`.
- **Server:** delete the `AssistanceSource` model, controller, requests, resource, seeder, routes, OpenAPI entries and
  the Filament `AssistanceSourceResource`. Fold any still-relevant cases from `AssistanceSourceCrudTest` into
  `LibraryApiTest`.
- **Client:** delete the `assistance-sources-manager-dialog.tsx` and `use-assistance-sources` hooks and API, the
  Assistance Sources tab and its key in `invalidateLibraryCaches`.
- **Audit history:** past `activity_log` rows keep `subject_type = App\Models\AssistanceSource`. Check that the audit
  log UI and `ActivityOwnershipResolver` handle a missing class (subject null). If they don't, map the old class to a
  label. Covered by a test.

## Phase 5 — Docs and verification

- Mark phases here as they ship, and add a note to `docs/LIBRARY_SETTINGS_PLAN.md` pointing at this revision.
- Keep unrelated uncommitted work out of these commits: `docs/ENCOUNTER_PRINTABLES_PLAN.md`, the hospital and
  encounter UI edits, and the UIS print CSS.
- **Note:** UIS §V's fund-source dropdown will also list City Mayor and the other former Assistance Sources, plus
  "Others". Assessments have no specify field, which is acceptable.

## Verification

1. `composer test`.
2. `npx tsc -p tsconfig.app.json --noEmit` (only the three existing errors), `npm run lint` (0 errors), `npm run build`.
3. On a copy of the dev database, run `php artisan migrate`. Every guarantee line should have a `fund_source_id`
   matching its old source; "Others" lines should keep their specify text; deleted sources should arrive deleted.
4. `composer dev`:
   - **Library:** Guarantors, Types of Assistance (the four seeded), Mode of Assistance and Fund Sources (now including
     City Mayor … Others with Specify). Add, edit, deactivate and delete on each tab. The code lock and the "Used in"
     tooltip are correct.
   - **Filament Reference Data:** Types of assistance, and Fund sources with Requires specify.
   - **After Phase 4:** Assistance Sources is gone from the Library and Filament, and the audit log still shows its old
     entries.
