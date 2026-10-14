# Turnaround Time (TAT) — Plan (server + Inertia SSR client)

MSWD needs to know how long it takes to cater a patient: from the moment the patient or watcher **arrives** at the
MSWD office to the moment the worker **finishes serving** them. The system has no record of this yet. There is no
queue, arrival, or time-in/time-out concept. `dar_entries.served_time` is a hand-typed time of day with no duration,
and `SocialCaseReportService::medianDaysToFinalize()` measures report sign-off, not service. This plan adds explicit
**Time in → Start → Complete** events per HIS encounter visit. They feed four outputs: a live queue board, a TAT panel
on the encounter, a per-employee TAT report, and a configurable target with compliance %. It was planned as one PR but
shipped as one issue and PR per phase: #253 (Phases 1–2), #255 (3), #257 (4), #259 (5), #261 (walkthrough fixes) and
the Phase 6 docs PR.

**Decisions (user):**
- **TAT = arrival → served.** A visit stores `arrived_at`, `started_at` and `completed_at`, which give three durations:
  - **waiting:** arrived → started
  - **processing:** started → completed
  - **total:** arrived → completed
- **Explicit buttons:** Time in, Start, Complete and Cancel. Every stamp comes from the server clock, never from the
  request body.
- **Unit = one visit per HIS encounter** (`patient_id` + `his_transaction_id`). An encounter may have several visits
  over time, but only **one open** (waiting or in progress) at a time.
- **Outputs:** a live queue board, a per-employee report, target compliance, and the TAT shown on the encounter.

**Defaults (not yet confirmed by the user; easy to change):**
- Durations are whole **calendar minutes**, not business hours.
- **`served_by`** is the user who clicks Start. **Complete** and **Cancel** may be done by any `queue.manage` holder,
  and each is stamped with who did it (`completed_by`, `cancelled_by`).
- **Targets** are one row per stage (waiting / processing / total), in minutes, kept in a Library tab. Compliance is the
  % of completed visits within the target.
- **Cancelled visits** are left out of the TAT figures and counted separately.
- **The HIS encounter id is not checked against HIS** when a visit is opened. This matches guarantees and intake
  assessments, so tests and local dev don't need `sqlsrv`.

**Status legend:** ☐ not started · ◐ in progress · ☑ done

| Phase | Side | Depends on | Status |
|-------|------|------------|--------|
| 1. Schema, `ServiceVisit` model, `queue.manage` permission | server | — | ☑ done (#253) |
| 2. Visit API: time in / start / complete / cancel, queue, encounter history | server | 1 | ☑ done (#253) |
| 3. TAT targets (Library) | server + client | 1 | ☑ done (#255) |
| 4. Report service, API, CSV/PDF | server | 1, 3 | ☑ done (#257) |
| 5. Client: encounter panel, queue board, report page (and its `/reports/turnaround` web route) | client | 2–4 | ☑ done (#259, #261) |
| 6. Tests & docs | both | all | ☑ done |

## Phase 1 — Schema, model, permission

- **Migration `create_service_visits_table`:**

  | Column | Type | Notes |
  |--------|------|-------|
  | `id` | bigint | |
  | `patient_id` | FK `patients` | |
  | `his_transaction_id` | unsigned bigint | HIS `psPatRegisters` id; not an FK (HIS is read-only on `sqlsrv`) |
  | `status` | string(20) | `waiting` / `in_progress` / `completed` / `cancelled` |
  | `purpose` | string(120) | nullable |
  | `remarks` | text | nullable |
  | `arrived_at` | dateTime | |
  | `started_at` | dateTime | nullable |
  | `completed_at` | dateTime | nullable |
  | `cancelled_at` | dateTime | nullable |
  | `cancel_reason` | string(255) | nullable |
  | `received_by` | FK `users` | who timed the patient in |
  | `served_by` | FK `users` | nullable; who started serving |
  | `completed_by` | FK `users` | nullable |
  | `cancelled_by` | FK `users` | nullable |

  Plus timestamps. Indexes on `(status, arrived_at)`, `(served_by, completed_at)` and `(patient_id, his_transaction_id)`.
- **`app/Models/ServiceVisit.php`:**
  - `STATUS_*` constants plus an `OPEN_STATUSES` list.
  - `belongsTo` relations to the patient and the four users.
  - Duration helpers `waitingMinutes()`, `processingMinutes()` and `totalMinutes()`. An open stage counts up to now.
  - Scopes `open()` and `forEncounter($patientId, $transactionId)`.
  - Uses `Concerns\Auditable`, with `activityOwner()` pointing to the patient. `AuditCoverageTest` and
    `ActivityOwnershipResolverTest` are updated.
- **Permission `queue.manage`:**
  - Added to `RolesAndPermissionsSeeder` for MSS Head, Supervisor, Case Manager and Processor. Admin already has `*`.
  - An additive migration `add_queue_permission` grants it in existing environments; it is modeled on
    `add_dar_permission`.
  - `RolesAndPermissionsTest` is updated.
  - The report (Phase 4) reuses `reports.view` / `reports.generate`.

## Phase 2 — API

All routes go in `routes/api.php`, inside `auth:sanctum` and behind `permission:queue.manage`, which is set in the
controller.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/service-visits/queue?date=YYYY-MM-DD` | The day's board: `waiting` and `in_progress` (every open visit, whatever day it arrived), `completed` (visits completed that day), and `summary` counts. |
| GET | `/api/patients/{patient}/service-visits[?his_transaction_id=]` | A patient's visits, newest first, optionally narrowed to one encounter. |
| POST | `/api/patients/{patient}/service-visits` | Time in. Body: `his_transaction_id`, plus optional `purpose` and `remarks`. Returns 201. Returns 422 when the encounter already has an open visit. |
| POST | `/api/service-visits/{visit}/start` | waiting → in_progress. Sets `served_by` and `started_at`. |
| POST | `/api/service-visits/{visit}/complete` | in_progress → completed. Optional `remarks`. |
| POST | `/api/service-visits/{visit}/cancel` | waiting or in_progress → cancelled. A `cancel_reason` is required. |

- **`app/Services/ServiceVisitService.php`** holds the state machine: `timeIn`, `start`, `complete` and `cancel`.
  - An illegal transition throws a `ValidationException` on `status`, which returns 422.
  - `timeIn` runs in a transaction and locks the encounter's open rows. This blocks a double time-in from two desks.
- **`ServiceVisitResource` fields:**
  - `id`, `patient_id`, `his_transaction_id`, `status`, `purpose` and `remarks`
  - the four stamps
  - `waiting_minutes`, `processing_minutes` and `total_minutes`
  - `received_by`, `served_by`, `completed_by` and `cancelled_by`, each as `{ id, name }`
  - `cancel_reason`
  - `patient`, when loaded, in the same shape the DAR uses
- **Phase 3** adds `within_target` flags to the resource once targets exist.
- **OpenAPI:** `app/Http/Docs/ServiceVisitDocs.php`, under the `Queue` tag.

## Phase 3 — TAT targets (Library)

- **Lookup table `turnaround_targets`:**

  | Column | Notes |
  |--------|-------|
  | `stage` | unique: waiting / processing / total |
  | `minutes` | |
  | `is_active` | |

  It is seeded with placeholder values (waiting 30, processing 60, total 90) for MSWD to replace with its Citizen's
  Charter values.
- **API:** the `apiResource` pattern of `fund_sources`. Reads are open; writes need `library.manage`. Add a Filament
  resource as well.
- **Client:** a new tab in `resources/js/features/library/lib/library-tabs.tsx`.

**Done with Phase 3:**
- **Data:**
  - The `turnaround_targets` migration inserts the three default rows, so existing databases get them without a
    seeder run. `TurnaroundTargetSeeder` uses `firstOrCreate` and keeps whatever MSWD has tuned.
  - The stages are fixed, so the API is `index`/`show`/`update` only. Reads are open; `update` needs `library.manage`.
    The Filament resource is edit-only and gated by `library.manage`.
- **Compliance flags:**
  - `ServiceVisit::isWithinTarget($stage)` uses `TurnaroundTarget::activeMinutes()`, which is memoized per request.
  - `ServiceVisitResource` returns `within_target: { waiting, processing, total }`. A flag is null when the visit is
    cancelled, the stage hasn't started, or the target is inactive.
- **Client:** the Library gets a "TAT Targets" tab (`TurnaroundTargetsPanel`) with an edit dialog.
- **Tests:** `tests/Feature/TurnaroundTargetTest.php` (13 tests).

## Phase 4 — Report

`app/Services/TurnaroundReportService.php` mirrors `SocialCaseReportService`. It reuses the `range()` default and
swap, and the protective-case exclusion with its `protective_excluded` flag. It uses grouped queries.

- **Totals:**
  - completed and cancelled counts
  - avg, median and p90 per stage
  - % within target per stage
- **Per employee** (`users.employee_name` on `served_by`): count, avg, median and max total, and % within target.
- **By day:** count and average total.
- **How it's computed:** median and p90 are worked out in PHP from the plucked durations of each group. `toRows()`
  gives the CSV, and `renderPdf()` uses `pdf.turnaround`.
- **Routes:**
  - `GET reports/turnaround` (`reports.view`)
  - `GET reports/turnaround/export?format=csv|pdf` (`reports.generate`)
  - the web page `GET /reports/turnaround`

**Done with Phase 4** (supersedes the plan above where they differ):
- **`TurnaroundReportService::summary()`:**
  - Returns `{ from, to, protective_excluded, targets, completed, cancelled, stages, by_employee, by_day }`.
  - Each of `stages.{waiting,processing,total}` and every `by_employee` and `by_day` row carries the same block:
    `{ count, avg, median, p90, max, within_target_pct }`.
  - Worker and day rows measure the **total** turnaround.
  - `within_target_pct` is null when the stage's target is inactive.
- **Counting rules:**
  - A visit counts on the day it was **completed**; cancelled visits count on the day they were cancelled.
  - p90 is nearest-rank.
- **How it's computed:** the range's completed visits are loaded once and every figure is computed in PHP. This
  replaces the grouped queries planned above: medians and percentiles have no portable SQL form, and the volume is
  small.
- **Protective exclusion:** a visit has no case of its own, so the filter works at the patient. Any protective case,
  even a deleted one, keeps that patient's visits out unless the viewer holds `audit.view_protective`.
- **Routes:** `GET /api/reports/turnaround` (`reports.view`) and `GET /api/reports/turnaround/export` (`reports.generate`).
  The export is CSV by default; `format=pdf` gives the `pdf.turnaround-report` view, inline unless `download=1`.
  `from` and `to` must be `Y-m-d`. OpenAPI: `TurnaroundReportDocs`.
- **Moved to Phase 5:** the `/reports/turnaround` web page, which needs the React page.
- **Tests:** `tests/Feature/TurnaroundReportTest.php` (14 tests).

## Phase 5 — Client (`resources/js/features/queue/{api,components,hooks,types}`)

- **Encounter panel.** A `ServiceVisitPanel` in the hospital encounter view has:
  - the Time in / Start / Complete / Cancel buttons, gated by `usePermission("queue.manage")`
  - a live elapsed timer
  - past visits, with waiting, processing and total chips coloured against the target
- **Queue board.** The `GET /queue` page (`Queue/Index`) is added to the sidebar.
  - It has three columns: Waiting, In progress and Served today. Each column highlights visits that are over target.
  - It polls every 30 s.
  - The timers start only after mount, which keeps SSR safe.
- **Report page.** `turnaround-report-page.tsx` follows the layout of the social-cases report. It has:
  - a date range
  - KPI tiles
  - a per-employee table
  - a daily trend
  - CSV and PDF export
- **Time in from the board:** a button that opens a patient and encounter picker, reusing the registry's HIS search.
  **Done (issue #266, PR #267, after Phase 6):**
  - The **Time In** button sits on today's board only and needs `queue.manage`. It opens `TimeInDialog`
    (`features/queue/components/time-in-dialog.tsx`):
    1. **Patient:** a registry patient, found with `useRegistryQuickSearch` as in the DAR dialog. Patients not in the
       registry are imported first with "Search or Import Patient".
    2. **Encounter:** their HIS encounters (`useHospitalEncounters`), active first and newest first. Encounters with an
       open visit are disabled as "Already in queue".
    3. **Details:** purpose and remarks, then `useTimeInVisit`.
  - Checked in the browser: time in, the new Waiting card, "Already in queue", and the button hidden on a past date.

## Phase 6 — Tests & docs

- **Pest tests** cover the report math, using fixed `Carbon::setTestNow` stamps. They also cover the protective
  exclusion, the CSV columns, the targets CRUD and the `/queue` page.
- **Docs:** add a `queue` bullet and the new routes to `CLAUDE.md`, and update the status table above.

**Done with Phases 1–2:**
- **Results:** the full suite passed (982 tests), and Pint is clean. OpenAPI is in `app/Http/Docs/ServiceVisitDocs.php`.
- `tests/Feature/ServiceVisitTest.php` has 22 tests, covering:
  - the state machine: legal and illegal transitions, and one open visit per encounter
  - server-side stamps and durations
  - the queue contents
  - the encounter history
  - the permission gates
  - the audit row
- `RolesAndPermissionsTest`, `AuditCoverageTest` and `ActivityOwnershipResolverTest` cover the new permission and
  model.

**Done with Phase 3:**
- **Results:** the full suite passed (997 tests), and Pint is clean. OpenAPI is in `app/Http/Docs/TurnaroundTargetDocs.php` and `app/Http/Docs/ServiceVisitDocs.php`.
- `tests/Feature/TurnaroundTargetTest.php` has 13 tests, covering:
  - Seeding of Citizen's Charter stages (waiting 30, processing 60, total 90 minutes)
  - Open `GET /api/turnaround-targets` and `GET /api/turnaround-targets/{id}`
  - Gated `PUT /api/turnaround-targets/{id}` requiring `library.manage`
  - Rejection of `POST` and `DELETE` (stages are fixed)
  - `ServiceVisitResource` dynamic `within_target` flags (`waiting`, `processing`, `total`)
  - Inactive target handling and null flags on cancelled visits
  - Filament `TurnaroundTargetResource` under Reference Data
- Added `TurnaroundTargetsPanel` and "TAT Targets" tab in `resources/js/features/library`.

**Done with Phase 5 (#259, #261):**
- **Pages:**
  - `GET /queue`: `QueuePageController` renders `Queue/Index`, gated by `queue.manage`. There is a Queue button in the
    sidebar.
  - `GET /reports/turnaround`: `ReportsPageController@turnaround` renders `Reports/Turnaround`, gated by
    `reports.view`.
  - `tests/Feature/QueuePageTest.php` (14 tests) covers both pages for every role, 403 without the permission, and
    the guest redirect.
- **`features/queue`:**
  - Types, adapter, API and React Query hooks. The queue polls every 30 s, and mutations invalidate
    `["service-visits"]`.
  - `ServiceVisitPanel` has the Time in / Start / Complete / Cancel dialogs, an SSR-safe live timer, and visit history
    with `within_target` badges.
  - `QueueBoard` and `QueueCard` give the Waiting / In progress / Served today columns, with date navigation, search,
    counts, a refresh button, live timers, over-target styling, and start / complete / cancel on the cards.
- **Encounter:** the encounter dialog (`HospitalEncounterDetailDialog`) gains a **Queue & TAT** tab, with a pulse for an
  open visit. The panel is also placed in `HospitalEncounterDetail`, which nothing renders at the moment.
- **`features/reports`:**
  - `turnaround-reports-api.ts`, `use-turnaround-reports.ts` (CSV and PDF as blob downloads) and the report types.
  - `TurnaroundReportsPage` has a date range with presets, the protective-exclusion banner, KPI tiles with compliance
    bars, and the stage, worker and day tables.
  - `ReportsSubnav` switches between Social Cases and Turnaround Time.
- **Checks:** `npx tsc -p tsconfig.app.json` shows no new errors (only the three already on master in `app.tsx`,
  `ssr.tsx` and `use-auth.ts`). ESLint has 0 errors, and `npm run build` (client and SSR) succeeds.
- **Review fixes before merge:**
  - **`queue.manage` gating.** Without it, `ServiceVisitPanel` renders nothing and the encounter dialog hides its
    "Queue & TAT" tab. `usePatientVisits` takes an `enabled` flag, so neither one fetches visits it can't read; before,
    a user without the permission got 403s.
  - **Report payload.** `getTurnaroundReport` unwraps `{ data }`. `apiClient` doesn't unwrap it, so the page had been
    reading `undefined` fields.
- **Fixes after the browser walkthrough (local, as Admin):** time in, start, complete, cancel (an empty reason is blocked),
  the queue board, the report page and both exports all work. Three bugs were fixed:
  - **Queue card hospital number.** The card read `hospital_no`, but the resource sends `hospital_id` (as the DAR does),
    so it always showed "—". `ServiceVisitPatient` now matches the server shape, and the board search uses
    `hospital_id`.
  - **Queue board width.** A forced `min-w-[900px]` pushed the third column off-screen beside the sidebar. The columns
    now stack below `xl`.
  - **Encounter dialog tabs.** Five tabs don't fit "Overview & Admission" and "Diagnosis & Discharge" in the `max-w-3xl`
    dialog, so the labels overlapped. With the Queue tab shown, those two tabs drop their "… &" prefixes.

**Done with Phase 6:**
- **Tests:** the tests Phase 6 planned were already written with their phases:
  - report math with fixed `Carbon::setTestNow` stamps, the protective exclusion and the CSV columns:
    `TurnaroundReportTest`
  - the targets CRUD: `TurnaroundTargetTest`
  - the `/queue` and `/reports/turnaround` pages: `QueuePageTest`

  Across the feature that makes 63 tests (`ServiceVisitTest` 22, `TurnaroundTargetTest` 13, `TurnaroundReportTest` 14,
  `QueuePageTest` 14). The full suite has 1025.
- **`CLAUDE.md`:**
  - a `queue` entry in Feature Folders
  - `GET /queue` and `GET /reports/turnaround` in the page routes
  - the TAT targets in the `library` entry
- **This doc:** PR numbers added, the Phase 5 notes rewritten, and the board time-in marked not built.

## Verification

1. Run `npx tsc -p tsconfig.app.json --noEmit`, `npm run lint` and `composer test`. Everything must pass.
2. Run `php artisan migrate`. It adds `service_visits`, the `queue.manage` grants and `turnaround_targets` with the
   default targets.
3. Check the API, as a Case Manager:
   - `POST /api/patients/{id}/service-visits` with an encounter id returns 201 and `status: waiting`.
   - A second time-in for the same encounter returns 422.
   - Start, then complete. `waiting_minutes`, `processing_minutes` and `total_minutes` are filled in.
   - `GET /api/service-visits/queue` shows the visit under `completed` for today.
4. A user without `queue.manage` gets 403 on every route. In the app, they see no Queue button and no Queue & TAT tab,
   and no 403s show in the network tab. **Not yet checked by hand:** dev has only the admin account.
5. **Library → TAT Targets:** edit a target. Its `within_target` flags and the report's compliance % follow it.
6. **`/reports/turnaround`:** pick a range and check the stage, worker and day figures. CSV and PDF export both
   download.

**Checked in the browser (local, as Admin):** steps 3 (through the encounter's Queue & TAT tab) and 6, plus cancel and
the queue board. See the walkthrough notes under Phase 5.
