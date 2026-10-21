# ZCMC MSWD Server (Laravel 12 + Inertia.js + React SSR)

Unified full-stack repository for the ZCMC Medical Social Work Department (MSWD) Patient Safety Net Portal. Server-renders the React UI via Inertia SSR with Sanctum cookie-session authentication, Filament admin at `/admin`, and a REST API.

## Commands

- `composer dev` — runs full dev environment (`php artisan serve`, queue worker, `vite` HMR, and `php artisan inertia:start-ssr`).
- `npm run dev` — runs Vite dev server.
- `npm run build` — builds production client bundle and SSR bundle (`vite build && vite build --ssr`).
- `npm run typecheck` — TypeScript check (`tsc --noEmit`).
- `npm run lint` — ESLint on `resources/js`.
- `npm run format` — Prettier format on `resources/js`.
- `composer test` or `php artisan test` — runs Pest PHP tests (SQLite in-memory, see `phpunit.xml`).
- Single test: `php artisan test tests/Feature/PatientWatcherApiTest.php` or `php artisan test --filter="part of test name"`.
- `vendor/bin/pint` — PHP formatter (Laravel Pint).
- `npx tsc -p tsconfig.app.json --noEmit` — the real frontend typecheck. `npm run typecheck` uses the root `tsconfig.json` and does not cover `resources/js`.
- `php artisan schedule:work` — runs the scheduler locally (daily `mss:expire-watcher-passes`, defined in `routes/console.php`).
- `php artisan inertia:start-ssr` / `php artisan inertia:stop-ssr` — manages Node SSR server process.

## Architecture

### Backend Layering (`app/`)

Request flow: `routes/api.php` → thin `Http/Controllers` (mostly single-action, e.g. `CloseCaseController`) → `Services/` (business logic) → `Repositories/` (extend `BaseRepository`, bound in `RepositoryServiceProvider`) → Eloquent `Models/`. Newer modules (guarantees, socioeconomic) skip the repository and use Eloquent in the service.
- `Http/Requests/` validate input and feed `DTOs/` (`XDto::fromArray($request->validated())`); `Http/Resources/` shape JSON output.
- `Http/Docs/` holds the L5-Swagger (OpenAPI) annotations, separate from controllers; update them with the endpoint.
- Authorization: Spatie permissions. Routes under `auth:sanctum` use `->middleware('permission:<name>')`; roles and permissions are seeded by `RolesAndPermissionsSeeder`.
- Auditing: `spatie/laravel-activitylog` via `ActivityLogService`. `AuditCoverageTest` guards coverage, so new mutating models/actions need logging.
- PDFs are DomPDF, one `*PdfService` per printable.
- `app/Filament/` is the `/admin` panel (resources and relation managers).
- The schema is defined by `database/migrations/` only.

### HIS (Bizbox) Integration

- The hospital information system is read **live** over the `sqlsrv` connection (`emdPatients`, `psPersonaldata`, `psPatRegisters` + guarantors). HIS data is never copied, except a patient imported into the MSWD registry and decision-time snapshots on cases.
- MSWD records hang off a HIS encounter via `his_transaction_id` / `transaction_id`.
- `SQLSRV_DATABASE` is blank in dev; **no test may touch the `sqlsrv` connection** — mock the repository.

### Inertia Hybrid Architecture

- **Inertia Layer (`resources/js/pages/`)**:
  - Owns routing, auth session state, shared user props (`auth.user`, `auth.roles`, `auth.permissions`), and initial page renders.
  - Page routes in `routes/web.php`: `GET /login`, `GET /` (Patients registry), `GET /patients/{patient}`, `GET /caseload`, `GET /cases/{case}`, `GET /dar`, `GET /queue`, `GET /reports`, `GET /reports/social-cases`, `GET /reports/turnaround`, `GET /audit`, `GET /library`.
  - Main persistent layout is `resources/js/components/layout/main-layout.tsx`.
- **API & TanStack Query Layer**:
  - `resources/js/lib/api-client.ts` uses Sanctum cookie sessions (`credentials: "same-origin"`, `X-XSRF-TOKEN`).
  - Feature hooks (`useQuery`, `useMutation`) manage tab-level data, CRUD operations, and cache invalidation.
- **Server-Side Rendering (SSR)**:
  - `resources/js/ssr.tsx` pre-renders pages with `ReactDOMServer.renderToString`.
  - `config/inertia.php` enables SSR with graceful CSR fallback (`throw_on_error => false`).
  - Browser state (`window`, `localStorage`, `matchMedia`) is guarded for SSR safety. Theme is synchronized to cookies to prevent first-paint flash.

## Modules

Frontend lives in `resources/js/features/<feature>/{api,components,hooks,types}`. Each module below: purpose, key rules, main backend/frontend pieces.

### Auth & Users
Session login, roles and permissions shared as Inertia props (`auth.user`, `auth.roles`, `auth.permissions`).
- Front: `features/auth` (`useAuth`, `usePermission`, `useHasRole`).
- Back: `UserService`, `RoleService`, `PermissionService`; Filament Users/Roles/Permissions.

### Patients (Registry)
MSWD patient registry with a 10-tab profile (profile, family, IDs, watchers, socioeconomic, hospital encounters, UIS, social case, documents, history).
- Patients are created by importing from HIS, keyed on `hospital_id` (`POST /hospital-patients/{id}/import`: 201 created, 200 refreshed).
- Patient merge and patient IDs are supported.
- Documents tab: PDF/JPG/PNG uploads (max 10 MB) per patient, typed from the Library Document Types list, filed under a case optionally. Files are stored on the default disk (RustFS in dev, bucket `mss`; the disk is kept per row) and read **only through the server** (`GET /patients/{id}/documents/{doc}/file`, inline or `?download=1`), never a storage path. Delete is a soft delete and keeps the file. Finalized SCSR PDFs also appear here.
- Front: `features/patients`. Back: `PatientService`, `HospitalPatientImportService`, `PatientFamilyMemberService`, `PatientIdService`, `PatientMergeService`, `DocumentService`.

### Hospital (HIS Encounters)
Read-only view of HIS patients and their transactions (encounters), with guarantors and diagnosis. The encounter dialog hosts the printables and the Queue & TAT tab.
- Front: `features/hospital`. Back: `HospitalPatientService`, `PatientTransactionService`.

### Socioeconomic
Itemized living expenses and family income per patient, with history and trend.
- Front: `features/socioeconomic`. Back: `PatientSocioeconomicService`, `SocioeconomicProfileService`, `Support/FamilyIncome`.

### Assessment & Intake (UIS)
Socio-economic classification of a patient for an encounter.
- Net Per Capita Income = (family income − household expenses) ÷ household size (patient + family members, min 1).
- Brackets A, B, C1, C2, C3, D with a computed discount (`CalculateMswdClassificationAction`, `MswdClassificationMatrix`). A worker may override the bracket with a written reason.
- Assessments are append-only snapshots; a re-assessment links to its parent (`parent_assessment_id`).
- Intake Assessment (UIS / Annex B): anchored to patient + HIS encounter, at most one per encounter; case link is optional (a case opened later picks it up).
- The UIS is a **printable, not a stored record**; every print is logged (`uis_print_logs`).
- But its patient data **is** frozen: sections I (identity) and II (family composition) are captured on `assessments.uis_snapshot` when the intake is taken, so editing the patient afterwards cannot rewrite a sheet already issued. `household_size` is frozen with it, so the per-capita income stops moving; `interviewed_at` / `interviewed_by` print instead of the print date and printing user. Section V stays **live** (a guarantee is a later decision on the same encounter). `POST /assessments/{id}/uis-snapshot/refresh` (`cases.update`) pulls current data in and records who and when. **In active development — see `docs/UIS_SNAPSHOT_PLAN.md`.**
- Front: `features/cases` (`NewIntakeAssessmentDialog`, UIS tab). Back: `AssessmentService`, `IntakeAssessmentService`, `UisReadinessService`, `UisSnapshotService`, `UnifiedIntakeSheetPdfService`, `UisPrintLogService`.

### Cases & Social Case (SCSR)
A case is opened per HIS encounter (`cases.transaction_id`), with `created_by`, `assigned_user_id` and a manual card colour. Extra encounters link through `case_hospital_transactions` with a decision-time snapshot.
- Actions: assign, refer, close, reopen, restore, reassess. Each records the worker's reason.
- Social Case Study Report: `draft → for_review → finalized`, numbered `SCSR-{year}-{6}`, signed off, amendable, printable as PDF.
- Caseload (`/caseload`), progress notes, case summary PDF.
- Front: `features/cases`. Back: `CaseModelService`, `SocialCaseService`, `SocialCaseNumberService`, `CaseProgressNoteService`, `CaseHospitalTransactionService`, `CaseSummaryPdfService`, `SocialCaseStudyPdfService`.

### Watchers
Patient watchers (people staying with the patient) assigned to open cases. **In active development — see `docs/WATCHER_MODULE_PLAN.md`.**
- `patient_watchers` holds the person's details; `case_watchers` is only the assignment (primary, informant, pass, presence, notes).
- Assign only to `open`/`ongoing` cases; once per case. Passes live on the assignment and expire daily (`mss:expire-watcher-passes`). Waivers cover the watcher requirement.
- Front: `features/patients` (Watchers tab, `watcher-dialog`, `assign-watcher-dialog`) and `features/cases` (`case-watchers-api.ts`, `case-watchers-panel`).
- Back: `PatientWatcherService`, `CaseWatcherService`, `WatcherPassNumberService`, `WatcherRequirementService`, `WatcherWaiverService`.

### Guarantees
Who guarantees a patient's bill for one HIS encounter, and the breakdown of where the money comes from.
- Breakdown line order: Type of Assistance → Amount → Mode of Assistance → Fund Source, all from the Library.
- Prints the DOH-MAIFIP Acknowledgement Slip (`GET /guarantees/{id}/acknowledgement-slip/pdf`, print-logged).
- Front: `features/guarantees`. Back: `PatientGuaranteeService`, `GuarantorService`, `AcknowledgementSlipPdfService`.

### Encounter Printables
In `hospital/components/dialogs/`:
- City Mayor Acknowledgement Slip, ZCMC-F-MSS-04 (`GET /patient-transactions/{id}/city-mayor-slip/pdf`, `CityMayorSlipPdfService`).
- Certificate of Eligibility (Indigency), Annex A (`GET /patient-transactions/{id}/indigency-certificate/pdf`, `IndigencyCertificatePdfService`; signed by the Library `mswd_head` signatory).

### Queue & Turnaround Time (TAT)
Time in → Start → Complete (or Cancel) per HIS encounter visit, stamped by the server clock.
- One open visit per encounter. `served_by` = whoever clicks Start. Cancelled visits are excluded from TAT figures.
- Targets per stage (waiting / processing / total, minutes) are set in the Library.
- Front: `features/queue` (`QueueBoard`, `ServiceVisitPanel`). Back: `ServiceVisitService`; permission `queue.manage`.

### DAR (Daily Accomplishment Report)
Manual entries by each worker: patient (registry only), activity, time served, remarks. Own entries only, one day per report; PDF (Prepared by) and CSV.
- Front: `features/dar`. Back: `DarReportService`; permission `dar.manage`.

### Reports
Social case reports and the TAT report (CSV/PDF), plus patient assistance reports.
- Front: `features/reports`. Back: `SocialCaseReportService`, `TurnaroundReportService`, `PatientAssistanceReportService`.

### Library
Reference lists managed in-app (`/library`, `library.manage`) and in Filament: guarantors, types of assistance, modes of assistance, fund sources, document types (the Docs tab dropdown), signatories printed on forms, TAT targets.
- Front: `features/library`. Back: `AssistantTypeService`, `GuarantorService`, models `FundSource`, `ModeOfAssistance`, `DocumentType`, `Signatory`, `TurnaroundTarget`.

### Audit
System-wide activity log viewer (`/audit`) and per-record history popovers.
- Front: `features/audit`. Back: `ActivityLogService`.

## UI & Styling

- shadcn/ui with `@base-ui/react` primitives (not Radix).
- Tailwind CSS v4 in `resources/css/app.css` with OKLCH theme variables.
- Fonts: `font-sans` (Roboto Variable), `font-heading` (Raleway Variable).
- Icons: `lucide-react`.

## Conventions

- Import alias: `@/` resolves to `resources/js/`.
- Prettier: no semicolons, double quotes, 2 spaces, 80 width.
- Always run `npx tsc -p tsconfig.app.json --noEmit && npm run lint && composer test` before completing tasks (plus `vendor/bin/pint` for PHP changes).
- Feature tests use `uses(RefreshDatabase::class)` per file (not global in `tests/Pest.php`) and seed what they need, e.g. `RolesAndPermissionsSeeder`, then `Sanctum::actingAs($user)`.

## Plans

- `docs/` holds only plans for work in active development. Current: `WATCHER_MODULE_PLAN.md`, `UIS_SNAPSHOT_PLAN.md`.
- Write a plan in `docs/<FEATURE>_PLAN.md` for multi-session or multi-layer work. Remove it when the feature ships, and update the module's entry above.
- Finished plans are in git history (`git log -- docs/`). The code and migrations are the source of truth.
