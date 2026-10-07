# Library Settings — Plan (server + Filament + Inertia SSR client)

Lets staff manage the lists behind the dropdowns: **guarantors**, **mode of assistance**, **fund source** and
**assistance source** (the guarantor breakdown types). The lists can be edited in both Filament `/admin` and a new
**Library** page in the React app, and every dropdown reads its options from them. Builds on the Patient Guarantor
module (`docs/PATIENT_GUARANTOR_PLAN.md`) and breakdown types (`docs/GUARANTOR_BREAKDOWN_TYPES_PLAN.md`). Ships as one
issue, one branch and one PR per phase, as the work was split in practice.

**Status legend:** ☐ not started · ◐ in progress · ☑ done

| Phase | Side | Depends on | Status |
|-------|------|-----------|--------|
| 1. Lookup tables, models, seeders, `library.manage` permission | server | — | ☑ done (#206, #207) |
| 2. Library API: create / update / delete for all four lists | server | 1 | ☑ done (#208, #209) |
| 3. Assessments read mode of assistance and fund source from the lookups | server | 1, 2 | ☑ done (#210, #211) |
| 4. Filament resources for all four lists | server | 1 | ☑ done (#212, #213) |
| 5. Client Library page (manage the lists) | client | 2 | ☑ done (#214) |
| 6. Client dropdowns use API options | client | 2, 3 | ☑ done (#214) |
| 7. Client tests, verification, close-out | client | 5, 6 | ☑ done (#214) |

**All phases shipped.** Phases 5–7 went out together as one issue and PR (#214). Notes from the build:

- Pint removed an unused import and a blank line in `AssessmentModuleTest` while formatting Phase 3.
- `storage/api-docs/api-docs.json` is not committed. Regenerating it shows large unrelated drift, and earlier PRs left
  it out too. `php artisan l5-swagger:generate` runs cleanly.
- The old client labels were longer ("MSWD Fund", "MAIP (DOH)"). The seeded names follow the UIS PDF ("MSWD", "MAIP"),
  so the dropdowns now show those. Staff can rename them in the Library.
- The Library page reuses the existing assistance-source hooks, so the "Manage Breakdown Types" dialog and the Library
  tab stay in sync.
- The intake dialog fetches inactive options too (`useModeOfAssistanceOptions(false)`), so a retired value shows its name
  with "(inactive)" instead of the raw code. A value that was deleted shows as stored.
- The Library hooks are imported from `features/library/hooks/use-lookup-options`, not the feature barrel, so the cases
  and patients features do not pull in the whole Library page.
- The Library link moved from the sidebar's view buttons to a book icon in the header (next to the theme toggle), and the
  page got larger text, an intro note per tab, and Edit / Delete buttons with labels. Delete is still a soft delete: the
  dialog says records that use the option keep showing it, and offers **Deactivate Instead**.
- There is no JS test runner. The client was checked with `tsc -p tsconfig.app.json` (only the three errors that were
  already in `app.tsx`, `ssr.tsx` and `use-auth.ts`), `npm run lint` (0 errors) and `npm run build` (client and SSR). The
  `/library` route is covered by `LibraryPageTest`.

## Background

- **Guarantors** (`guarantors`) and **assistance sources** (`assistance_sources`, the breakdown types) were already
  lookup tables. Assistance sources had full API CRUD and a "Manage Breakdown Types" dialog. Guarantors were read-only
  in the API.
- **Mode of assistance** (`assessments.recommendation_mode`) and **fund source** (`assessments.fund_source`) were
  hardcoded enums, duplicated in `Assessment::RECOMMENDATION_MODES` / `FUND_SOURCES` (PHP) and
  `assessment-constants.ts` (TS).
- There is no Library or settings page in the React app. The only admin UI for the lookups was Filament.

## Decisions

1. **New tables** `mode_of_assistances` and `fund_sources`: `id, name, code (unique), is_active, sort_order,
   timestamps, softDeletes`. They are seeded from the old enum keys and labels, by the migration and by seeders keyed on
   `code`.
2. **No foreign key and no data migration.** Assessments keep storing the `code` string. Validation checks that the code
   belongs to a row that is active and not deleted. On update, the value the record already stores is always accepted,
   so retiring an option never blocks saving the records that use it.
3. **A code cannot change while an assessment stores it**, because the assessment would stop resolving to its row.
   This is enforced in the API and in Filament.
4. **Guarantors** reuse the existing table. **Assistance sources** keep their API, dialog and `guarantee.create` gate.
5. **Permissions:**
   - Guarantor and assistance-source writes keep using `guarantee.create`.
   - Mode of assistance and fund source writes use the new `library.manage` (Admin, MSS Head, Supervisor).
   - The Library page and its nav link are gated by `library.manage`.
   - Filament stays gated by `settings.manage`.
6. **Deletes are soft.** Responses carry `usage_count`; the UI prefers deactivating over deleting. A deleted row can be
   restored in Filament.
7. **Filament and the client write to the same tables**, so a change in either shows up in the other and in the
   dropdowns.

## Phase 1 — Lookup tables, models, seeders, permission ☑

- Migrations `2026_10_09_010000_create_mode_of_assistances_table`, `…010100_create_fund_sources_table` (each also runs
  its seeder for existing environments) and `…010200_add_library_permission` (additive, same pattern as
  `add_guarantee_permissions`).
- Models `ModeOfAssistance` and `FundSource`: `Auditable`, `SoftDeletes`. Both are in `AuditCoverageTest`.
- `ModeOfAssistanceSeeder` and `FundSourceSeeder` (`firstOrCreate` on `code`); registered in `DatabaseSeeder`.
- `library.manage` added to `RolesAndPermissionsSeeder` for Admin (all), MSS Head and Supervisor.

## Phase 2 — Library API ☑

| Method and path | Permission |
|---|---|
| `GET /guarantors`, `GET /guarantors/{id}` | any signed-in user |
| `POST /guarantors`, `PUT /guarantors/{id}`, `DELETE /guarantors/{id}` | `guarantee.create` |
| `GET /mode-of-assistances`, `GET /fund-sources` (and `/{id}`) | any signed-in user |
| `POST`, `PUT`, `DELETE` on both | `library.manage` |

- Lists are ordered by `sort_order`, then name. `?active=1` hides retired rows.
- `usage_count`: for guarantors, patient guarantees plus assistance records; for the two new lists, assessments that
  store the code.
- Validation (shared `AssessmentLookupRequest`): name unique among rows that are not deleted; code required, unique
  across every row (deleted ones included) and `^[a-z0-9_]+$`; code locked while used.
- `AssessmentCodeLookup` trait on both models: `ordered()`, `withUsageCount()`, `usageCount()`, `options($keep)` and
  `labelFor($code)`.
- OpenAPI: `LibraryDocs`, guarantor write operations, `GuarantorRequest`, `AssessmentLookup` and
  `AssessmentLookupRequest` schemas.

## Phase 3 — Assessments read from the lookups ☑

- `StoreAssessmentRequest` (also used by re-assessment) and `UpdateAssessmentRequest` validate `recommendation_mode`
  and `fund_source` with the `SelectableLookupCode` rule (`app/Rules`).
- `unified-intake-sheet.blade.php` prints the Library name through `labelFor()`, including retired and deleted rows. A
  value that is not in the Library prints as typed.
- The Filament assessment form uses `options()`: the active rows plus the record's own stored value.
- `Assessment::RECOMMENDATION_MODES` and `FUND_SOURCES` removed. `AssessmentDto` and `AssessmentResource` pass the code
  through, so API responses are unchanged.

## Phase 4 — Filament resources ☑

- New `ModeOfAssistanceResource` and `FundSourceResource` in the Reference Data group (sort 3 and 4, `settings.manage`),
  built on an abstract `App\Filament\Support\AssessmentLookupResource`. It lives outside `Filament/Resources` so panel
  discovery does not register it.
- Form: name, code (disabled once used), sort order, Active. Table: name, code, order, active, "Used in", trashed
  filter, restore.
- `GuarantorResource` and `AssistanceSourceResource` gain the trashed filter, a restore action (table and edit page) and
  `canRestore`. The `ManagesSoftDeletedLookups` trait lets the edit page open a deleted row.

## Phase 5 — Client Library page ☑

- New feature folder `resources/js/features/library/{api,hooks,components,types}`.
- Page `resources/js/pages/Library/Index.tsx`; route `GET /library` in `routes/web.php` through a Web controller guarded
  by `library.manage`; a Library icon button in `components/layout/header.tsx` shown with
  `usePermission("library.manage")`.
- Four tabs: **Guarantors**, **Mode of Assistance**, **Fund Sources**, **Assistance Sources**.
  - A reusable list table and item dialog: name, plus code, address, sort order or "requires specify" where they apply;
    Active toggle; delete with a usage warning that suggests deactivating.
  - The code field is read-only once `usage_count > 0`.
  - Reuse the existing assistance-source api/hooks for the fourth tab. Guarantor writes show only with
    `guarantee.create`.
  - Server 422 errors show on the fields (`ApiError.errors`).
- Data layer follows `features/guarantees` (`api-client`, adapter, TanStack Query hooks).

## Phase 6 — Client dropdowns use API options ☑

- New `useModeOfAssistanceOptions` and `useFundSourceOptions` (`?active=1`, 5 minute stale time like
  `use-guarantor-options`). Library mutations invalidate every option key, including guarantors and assistance sources.
- Replace `RECOMMENDATION_MODE_OPTIONS` and `FUND_SOURCE_OPTIONS` in `intake-assessment-dialog.tsx` and `uis-sheet.tsx`;
  delete the arrays from `assessment-constants.ts`.
- A saved value whose option was retired or deleted stays visible in the Select (the server already accepts it).

## Phase 7 — Client tests, verification, close-out ☑

- There is no JS test runner. Check with `tsc -p tsconfig.app.json`, ESLint on `resources/js` and `npm run build`
  (client and SSR). `npm run typecheck` alone checks nothing, because the root `tsconfig.json` has `"files": []`.
- Mark the phases done in this file.

## Verification

1. `composer test` (807 tests with the Library page test).
2. `npm run typecheck && npm run lint && npm run build`.
3. Filament: in `/admin` > Reference Data, create, edit, retire, delete and restore each of the four lists, and confirm
   the changes show in the client Library page and dropdowns (and the reverse).
4. `composer dev`: as Admin, manage each tab in Library. Confirm the options appear and disappear in the guarantee form,
   the intake assessment dialog and the UIS sheet and PDF. Confirm a Processor has no Library nav and gets 403 on
   writes.
