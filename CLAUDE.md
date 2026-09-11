# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`zcmc_mswd_server` — the Laravel 12 API + admin backend for the ZCMC Medical Social Welfare Department system. It serves a separate React SPA (`zcmc_mswd_client`, a sibling repo) over a token-authenticated JSON API, and ships a Filament 4 admin panel at `/admin` for back-office work on the same data.

Domain: patients → cases (episodes) → clinical records (diagnostics, assessments, interventions, documents) and financial aid (patient assistance). Plus a Unified Intake Sheet workflow and episode-scoped watchers.

## Commands

```bash
composer setup           # install, .env, key, migrate, npm install, build
composer dev             # serve + queue:listen + vite, concurrently
composer test            # config:clear then artisan test (Pest)
```

```bash
php artisan test --filter=WatcherEnforcementTest      # one test file
php artisan test tests/Feature/CaseWatcherApiTest.php # one path
php artisan test --filter="records an audit trail"    # one test by name
```

```bash
vendor/bin/pint          # formatter (Laravel Pint, no pint.json — stock preset)
php artisan migrate:fresh --seed
php artisan db:seed --class=RolesAndPermissionsSeeder
php artisan mss:backfill-case-watchers                 # see app/Console/Commands
```

Tests run on in-memory SQLite (`phpunit.xml`); app DB is MySQL. Anything that relies on MySQL-only SQL will pass locally and break in production — keep queries portable.

## Plan docs are the spec

`docs/` holds phased build plans that are the source of truth for the current work, each with a status table (`☐ / ◐ / ☑`) and a passing-test count per shipped phase:

- `WATCHER_LOGIC_PLAN.md` — episode-scoped watchers (server phases 1–5 shipped)
- `PATIENT_CARETAKE_PLAN.md` — custody + accountability (phase 1 shipped)
- `API_CONTRACT_SYNC_PLAN.md` — client/server contract alignment (all 4 shipped)
- `MIGRATIONS.md` — the original schema blueprint and its conventions

Each has a client-side counterpart in `zcmc_mswd_client/docs/`, with explicit gates saying which client phase must not land before which server phase deploys. Read the relevant plan before changing a feature it covers, and update its status table when a phase ships.

## Request flow

Every API feature follows the same chain; keep it intact when adding one.

```
route (api.php) → FormRequest → Controller → Dto::fromArray() → Service → RepositoryInterface → Model
                                    ↓
                              JsonResource
```

- **Controllers** are thin and mostly single-purpose. CRUD lives in `apiResource` controllers; every verb-like operation gets its own `__invoke` controller (`CloseCaseController`, `MergePatientController`, `ApproveAssistanceController`). Follow that when adding a transition.
- **Permissions** are declared two ways: route-group middleware in `routes/api.php` for whole-feature gates, and `HasMiddleware::middleware()` on the controller for per-action gates on `apiResource` controllers. Match whichever the neighbouring endpoints use.
- **DTOs** (`app/DTOs`) are readonly constructor-promoted objects with `fromArray()`/`toArray()`. Most `toArray()` implementations `array_filter` out nulls — which means a DTO cannot normally clear a column, because an explicit `null` and an omitted key are indistinguishable by the time the service sees them. Where clearing is required, the DTO records which keys the caller actually supplied and intersects against that list instead (`AssessmentDto::$suppliedKeys`, `PatientFamilyMemberDto::$provided`); `AssessmentDto` additionally keeps `case_id`/`created_by` present-only so an update can never null out — and thus reassign — an assessment's case. Copy that pattern rather than the blind filtering when a column needs to be nullable through the API.
- **Services** (`app/Services`) hold the business rules and invariants, and are called from controllers, Filament actions and console commands alike. Guards belong here, not in controllers — e.g. `EnsureWatcherRequirementSatisfied` is invoked from service methods precisely so Filament and artisan can't bypass it.
- **Repositories** are bound interface→implementation in `RepositoryServiceProvider::$bindings`. Services type-hint the interface. A new repository needs a Contract, an implementation extending `BaseRepository`, and a line in that array.
- **Resources** (`app/Http/Resources`) shape every response. Related data goes through `whenLoaded`/`whenCounted` — the client contract depends on these keys, so changing one is a contract change (see `API_CONTRACT_SYNC_PLAN.md`).

### List endpoints

Table screens go through `ListQuery::fromRequest()` → `BaseRepository::paginateList()`. Nothing in the query string is trusted: each repository declares `$searchable`, `$filterable`, `$sortable`, `$listWith`, `$listWithCount`, `$defaultSort`, and anything not declared is dropped. To make a column searchable/filterable/sortable, add it to the repository's array — never build ad-hoc query parsing in a controller. `search` supports `relation.column`; `per_page` is capped at 100.

## Auth and RBAC

- API auth is **Sanctum bearer tokens**: `POST /api/login` with `employee_number` + `password` issues one; everything else sits behind `auth:sanctum`.
- Authorization is **spatie/laravel-permission**, all rows stored under the **`web` guard** (`RolesAndPermissionsSeeder::GUARD`). The request's active guard under token auth is `sanctum`, which maps to no model — never store roles/permissions under `config('auth.defaults.guard')`.
- The permission catalog is `RolesAndPermissionsSeeder::PERMISSIONS`, grouped by aggregate: sub-records fold into their parent (`patients.*` covers ids/watchers/family/caretakers; `cases.*` covers activities/diagnostics/assessments/interventions/documents). Add new endpoints under an existing permission unless the operation is genuinely a different authority level — `cases.waive_watcher` is separate because waiving is section-head level.
- `users.role` is a denormalized display cache only; the Spatie tables are the source of truth. Call `User::syncRoleCache()` after changing roles.
- Filament panel access is gated by `User::canAccessPanel()` → active + `panel.access`.

## Audit trail

Models use the `App\Models\Concerns\Auditable` trait (wrapping spatie/laravel-activitylog) for an append-only field-level trail. `tests/Feature/AuditCoverageTest.php` asserts that every model in the caretake scope uses it — **add new domain models to that list**, or the coverage silently regresses.

Note the two distinct "activity" concepts on a case: `CaseModel::auditLogs()` is the automatic field diff; `CaseModel::activities()` is the curated `CaseActivity` milestone timeline. `*History*` controllers read the former across a record and everything it owns (see `PatientService::history()`).

## Hospital (Bizbox/HIS) integration

`app/Models/Bizbox/*` are **read-only** models on the `sqlsrv` connection pointing at the hospital's SQL Server HIS (`SQLSRV_*` in `.env`). They are `$guarded = ['*']`, `$timestamps = false`, and this app never writes to them. Schema translation to this app's `patients` columns happens in one place — `HospitalPatient::toPatientAttributes()`. Keep it there.

Route ordering matters: `hospital-patients/find` is registered before `hospital-patients/{id}` so it isn't shadowed.

## Testing conventions

Pest 3, `tests/Feature` bound to `Tests\TestCase`. Note `RefreshDatabase` is **not** applied globally in `tests/Pest.php` — each test file calls `uses(RefreshDatabase::class)` itself.

There is only a `UserFactory`; domain records are built with explicit `Model::create([...])` and small file-local helper functions (see `tests/Feature/CaseManagementTest.php`). Most feature tests `$this->seed(RolesAndPermissionsSeeder::class)` in `beforeEach`, then act via `Sanctum::actingAs()` for API tests or Livewire for Filament resource tests.

## Schema conventions

From `docs/MIGRATIONS.md`, and still in force:

- Enum-like columns are plain `string()`, with the allowed values expressed as model constants (`CaseModel::STATUS_*`) or a PHP backed enum (`App\Enums\WatcherRequirement`) — not DB enums.
- `softDeletes()` on editable master data only. Append-only tables (`*_logs`, `*_reports`, `case_activities`, `diagnostic_reports`) omit it.
- Foreign keys are `RESTRICT` on delete; parents are soft-deleted, never hard-deleted.
- The `cases` table is `cases` but the model is `CaseModel` (`case` is a PHP keyword) — route params are `{case}`, and relations use explicit `'case_id'` foreign keys.

## Git

Branches are `feature/<issue#>-<slug>` off `master`, merged via PR. Commit subjects are imperative and sentence-case ("Add case_watchers backfill command and legacy-exempt flag").
