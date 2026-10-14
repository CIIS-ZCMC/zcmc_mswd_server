# Turnaround Time (TAT) — Plan (server + Inertia SSR client)

MSWD needs to know how long it takes to cater a patient: from the moment the patient or watcher **arrives** at the
MSWD office to the moment the worker **finishes serving** them. The system has no record of this yet. There is no
queue, arrival, or time-in/time-out concept. `dar_entries.served_time` is a hand-typed time of day with no duration,
and `SocialCaseReportService::medianDaysToFinalize()` measures report sign-off, not service. This plan adds explicit
**Time in → Start → Complete** events per HIS encounter visit. They feed four outputs: a live queue board, a TAT panel
on the encounter, a per-employee TAT report, and a configurable target with compliance %. Ships as one issue, one
branch (`feat/turnaround-time`) and one PR.

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
| 1. Schema, `ServiceVisit` model, `queue.manage` permission | server | — | ☑ done |
| 2. Visit API: time in / start / complete / cancel, queue, encounter history | server | 1 | ☑ done |
| 3. TAT targets (Library) | server + client | 1 | ☐ |
| 4. Report service, API, CSV/PDF | server | 1, 3 | ☐ |
| 5. Client: encounter panel, queue board, report page | client | 2–4 | ☐ |
| 6. Tests & docs | both | all | ☐ |

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

## Verification

1. Run `npx tsc -p tsconfig.app.json --noEmit`, `npm run lint` and `composer test`. Everything must pass.
2. Run `php artisan migrate`, which adds the `service_visits` table and the `queue.manage` grants.
3. Check the API, as a Case Manager:
   - `POST /api/patients/{id}/service-visits` with an encounter id returns 201 and `status: waiting`.
   - A second time-in for the same encounter returns 422.
   - Start, then complete. `waiting_minutes`, `processing_minutes` and `total_minutes` are filled in.
   - `GET /api/service-visits/queue` shows the visit under `completed` for today.
4. A user without `queue.manage` gets 403 on every route.
