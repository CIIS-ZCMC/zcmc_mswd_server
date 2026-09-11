# MSWD Server — Social Case Plan

The Social Case Study Report (SCSR) as the case manager's centrepiece document,
and the caseload workflow built around it. Four server phases, each independently
verifiable and revertable.

The client half lives in `zcmc_mswd_client/docs/SOCIAL_CASE_PLAN.md` (Phases E–F).
**Phase A ships on its own** and is consumable by the client's existing
`social-case-tab.tsx` immediately. Phases B and C ship as API-only surfaces —
the client cannot route to a case at all today, so read the Phase F gate before
sequencing them.

**Status legend:** ☐ not started · ◐ in progress · ☑ done

| Phase | Side | Status |
|-------|------|--------|
| A. SCSR authoring, lifecycle, sign-off + PDF | server | ☑ done — 420 passed, 2026-09-11 |
| B. Caseload queue | server | ☐ |
| C. Progress notes / follow-ups | server | ☐ |
| D. Reporting + case summary PDF | server | ☐ |
| E. Types, adapter, SCSR tab rewrite | client | ☐ |
| F. Case route + caseload screen | client | ☐ blocked |

**Recommended sequencing: A → E → (client routing project) → B, C → F.**

---

## Background — what exists today

The SCSR is the formal narrative a social worker authors, a section head signs,
and the hospital files. Nothing in either repo implements it.

**The nearest thing is `assessments`** (`2026_07_07_082057`): `case_id`,
`created_by`, `classification` (NOT NULL), four socioeconomic columns
(`total_family_income`, `housing_type`, `utilities_access`) and five narrative
`text` columns (`presenting_problem`, `family_background`, `social_functioning`,
`assessment_notes`, `intervention_plan`), plus `AssessmentExpense` children. That
covers roughly half an SCSR.

**The client already renders a read-only tab** titled "Social Safety Net Case
Study Report" (`src/features/patients/components/tabs/social-case-tab.tsx`),
derived entirely from latest Case + latest Assessment by `patients-adapter.ts`,
with `recommendedAssistance` and `approvedAmount` hard-coded to `NOT_ON_FILE`.

So today a case manager can record an assessment but cannot produce, review, sign
or print the document their job is measured by, and cannot see their own caseload
at all.

### The problems this plan closes

1. **No SCSR exists.** Five of the ten sections of a real report have no column,
   there is no lifecycle (draft → review → signed), no sign-off, no control
   number, and no printable artifact.
2. **A case manager cannot see their caseload.** There is no "my cases" surface;
   `GET /cases` is a generic list, and `cases.status`, `case_type`,
   `priority_level` and `date_opened` are the repository's declared filter and
   sort columns yet **all four are unindexed**.
3. **There is nowhere to record case progress.** `CaseActivity` is the
   system-generated milestone chronology; `Intervention` models a service
   actually delivered. Neither fits "phoned the daughter, still no funds,
   following up Monday".
4. **`assessment_expenses` has no API.** A model, a resource and
   `cascadeOnDelete` — but no service, controller, FormRequest, DTO or route. The
   only write path is `UnifiedIntakeSheetService::createExpenses()`.
5. **`Assessment` hard-deletes.** The table has `deleted_at`; the model never
   mixes in `SoftDeletes` (recorded in `API_CONTRACT_SYNC_PLAN.md`).
6. **An intake draft created without an assessment can never be finalized.**
   `UnifiedIntakeSheetService::update()` writes the assessment only when
   `assessment_id` is already set, and nothing can attach one later — so
   `finalize()`'s 422 is unreachable advice.

### Decisions taken before this plan

1. **Document-led.** The SCSR is the centrepiece; the workflow is built around
   producing and maintaining it.
2. **One social case per case episode** — one `cases` row, the same scoping as
   Assessment, Intervention and Diagnostic.
3. **Extend `assessments`.** No parallel `social_cases` table.
4. **Fix the three adjacent defects this module touches** (problems 4, 5 and 6
   above). Each is a prerequisite, not tidiness — see §A.4, §A.6, §A.10.
5. **Both repos** — server phases detailed here, client phases sketched.

### Decisions taken *in* this plan

6. **"One per episode" is enforced on a nullable lifecycle column, not on the
   assessment row count.** See §A.0 — the load-bearing decision.
7. **Versioning is an immutable archived PDF per finalization, not row-level
   revisions.** See §A.8.
8. **One new permission, `cases.finalize_social_case`.** See §A.5.

---

## §A.0 — Reconciling "one per episode" with `hasMany` assessments

`CaseModel::assessments()` is `hasMany`, and
`UnifiedIntakeSheetService::createDraft()` creates a **new** Assessment on every
intake — including one appended to an existing open case
(`UnifiedIntakeSheet::ATTACHABLE_CASE_STATUSES`). A case legitimately has N
assessments today.

**Rejected: a `cases.social_case_assessment_id` pointer.** Records the same fact
twice, can drift from the row it points at, and gives no database-level guarantee
the pointed-at assessment belongs to that case.

**Rejected: enforcing one assessment per case.** A unique guard on `case_id`
alone would make `createDraft()` throw the moment a second intake is appended to
an open case — breaking a shipped workflow to serve a document unrelated to it —
and every existing multi-assessment case would need repairing first.

**Chosen: a nullable `assessments.social_case_status`.** NULL means "an ordinary
intake-time assessment"; non-NULL means "this row *is* the case's SCSR" — under a
driver-branching generated-column unique guard over `case_id` that collapses to
NULL whenever the status is NULL or the row is soft-deleted. Exactly one
assessment per case may carry a non-NULL status; any number may carry NULL.

Why this wins:

- **Nothing existing breaks.** `hasMany` stays; intake appending is untouched.
- **The invariant is in the database**, using the pattern shipped twice already
  (`uniq_case_primary_watcher`, `uniq_active_patient_caretaker`), so Filament and
  artisan cannot create a second SCSR either.
- **No data repair is needed.** Every existing row gets NULL, so the index is
  satisfiable the instant it is created — unlike
  `add_accountability_to_patient_caretakers_table`, which needed
  `repairDriftedRows()`.
- **The intake tie-in becomes free.** Starting an SCSR *promotes* the case's
  existing assessment rather than creating one, so income, housing, utilities,
  classification, `presenting_problem` and the `assessment_expenses` rows carry
  over with zero copying — they are the same row.
- **The URL carries the invariant**: `/cases/{case}/social-case`, singular, never
  `/social-cases/{id}`.

An **opt-in** command `php artisan mss:promote-social-cases {--dry-run} {--case=}`
(shaped like `mss:backfill-case-watchers`) exists for migrating a specific ward's
paper backlog. **Default: do not run it** — auto-promoting every open case fills
Phase B's queue with empty drafts nobody wrote, which is worse than an empty
queue.

---

## Phase A — SCSR authoring, lifecycle, sign-off + PDF ☑

### A.1 Migration

`database/migrations/2026_09_12_010000_add_social_case_columns_to_assessments_table.php`
— **two** `Schema::table` calls; the generated column references
`social_case_status` and `deleted_at`, so those must exist first.

```php
Schema::table('assessments', function (Blueprint $table) {
    // Lifecycle. NULL = an ordinary assessment row, not the case's SCSR.
    $table->string('social_case_status')->nullable()->after('classification'); // draft|for_review|finalized
    $table->string('social_case_no')->nullable()->unique()->after('social_case_status'); // SCSR-{year}-{6}
    $table->unsignedInteger('revision')->default(1)->after('social_case_no');

    // Sign-off — the document's two signature blocks, nothing more.
    $table->foreignId('prepared_by')->nullable()->after('created_by')->constrained('users');
    $table->dateTime('prepared_at')->nullable()->after('prepared_by');
    $table->foreignId('noted_by')->nullable()->after('prepared_at')->constrained('users');
    $table->dateTime('noted_at')->nullable()->after('noted_by');
    $table->dateTime('review_requested_at')->nullable()->after('noted_at');

    // Narrative sections the existing five text columns don't cover.
    $table->string('referral_source')->nullable()->after('presenting_problem');
    $table->text('reason_for_referral')->nullable()->after('referral_source');
    $table->text('medical_history')->nullable()->after('family_background');
    $table->text('recommendation')->nullable()->after('assessment_notes');
    $table->string('recommended_assistance')->nullable()->after('recommendation');
    $table->decimal('recommended_amount', 12, 2)->nullable()->after('recommended_assistance');

    $table->index('social_case_status');
});

Schema::table('assessments', function (Blueprint $table) {
    // Same shape as uniq_case_primary_watcher / uniq_active_patient_caretaker.
    // SQLite cannot ALTER TABLE ADD a STORED generated column, only a VIRTUAL
    // one, and indexes both. (case_watchers got away with storedAs because its
    // guard is declared inside CREATE TABLE; this is an ALTER, like the
    // caretaker migration.)
    $expression = match (DB::getDriverName()) {
        'mysql' => 'IF(social_case_status IS NOT NULL AND deleted_at IS NULL, case_id, NULL)',
        default => 'CASE WHEN social_case_status IS NOT NULL AND deleted_at IS NULL THEN case_id ELSE NULL END',
    };

    $column = $table->unsignedBigInteger('social_case_guard')->nullable();

    DB::getDriverName() === 'mysql'
        ? $column->storedAs($expression)
        : $column->virtualAs($expression);

    $table->unique('social_case_guard', 'uniq_case_social_case');
});
```

`down()` drops `uniq_case_social_case`, then `social_case_guard`, then
`dropConstrainedForeignId()` for `prepared_by` / `noted_by`, then the rest.

### A.2 Where each SCSR section lives

| Section | Where it lives |
|---------|----------------|
| I. Identifying data | **Derived at render** from `case.patient` + `patientIds` + `familyMembers`. No column — the patient record mutates, and the archived PDF is what freezes it. |
| II. Source & reason for referral | **New** `referral_source`, `reason_for_referral`. On `unified_intake_sheets` today, but a case can open with no intake (`POST /cases`), and a case with three appended intakes has three referral sources of which only one opened the episode. **Snapshot** at promotion, then independently editable — the same reasoning `case_watchers` uses for `name` / `relationship`. |
| III. Problem presented | Existing `presenting_problem`. **No separate `problem_statement`** — an academic distinction, and the client already reads this key. |
| IV. Family composition & background | Existing `family_background` + the rendered `patient.familyMembers` grid. |
| V. Economic / environmental | Existing `total_family_income`, `housing_type`, `utilities_access` + the `assessment_expenses` grid (§A.10). |
| VI. Health / medical history | **New** `medical_history`. `diagnostics` holds structured clinical rows from another module; an SCSR needs the narrative, and a hospital SCSR without one is unusable. |
| VII. Social functioning | Existing `social_functioning`. |
| VIII. Assessment / analysis | Existing `assessment_notes` (what the client labels `socialWorkerNotes`). |
| IX. Recommendation | **New** `recommendation`, `recommended_assistance`, `recommended_amount`. Genuinely distinct from `intervention_plan`: the plan is what MSWD will *do*, the recommendation is what the worker asks the institution to *approve*. These retire the client's two `NOT_ON_FILE` placeholders. |
| X. Plan of intervention | Existing `intervention_plan`. |

**Sign-off is `prepared_by`/`prepared_at` + `noted_by`/`noted_at` only.** No
separate `finalized_by`/`finalized_at` pair — noting *is* finalization, `noted_at`
is the timestamp, and a third pair would be a column that never appears on the
document. `created_by` stays distinct from `prepared_by`: the former is whoever
first typed the assessment (often the intake worker), the latter the social worker
who authored the SCSR.

### A.3 Files

| File | Change |
|------|--------|
| `database/migrations/2026_09_12_010000_add_social_case_columns_to_assessments_table.php` | *(new)* — §A.1 |
| `app/Models/Assessment.php` | `+ SoftDeletes` (§A.4); `+` new columns to `$fillable` (`social_case_guard` deliberately **not** fillable); casts `prepared_at`/`noted_at`/`review_requested_at` → `datetime`, `recommended_amount` → `decimal:2`, `revision` → `integer`; `+ SOCIAL_CASE_DRAFT/FOR_REVIEW/FINALIZED` + `SOCIAL_CASE_EDITABLE_STATUSES`; `+ isSocialCase()`, `isSocialCaseEditable()`; `+ preparedBy()`, `notedBy()`; `+` the `updating` guard in §A.7 |
| `app/Models/CaseModel.php` | `+ socialCase(): HasOne` — `hasOne(Assessment::class, 'case_id')->whereNotNull('social_case_status')` |
| `app/DTOs/SocialCaseDto.php` | *(new)* — narrative + socioeconomic only, `$suppliedKeys` semantics copied verbatim from `AssessmentDto`. **Carries no lifecycle column** — `social_case_no`, `social_case_status`, `revision`, `prepared_*`, `noted_*`, `case_id`, `created_by` are service-written and can never arrive from a request body |
| `app/Services/SocialCaseService.php` | *(new)* — §A.7 |
| `app/Services/SocialCaseNumberService.php` | *(new)* — `SCSR-{year}-{6}`, shaped like `WatcherPassNumberService`, **plus a 3-attempt retry on duplicate-key `QueryException`** (see P3) |
| `app/Services/SocialCaseStudyPdfService.php` | *(new)* — structural copy of `UnifiedIntakeSheetPdfService`: `private const RELATIONS`, `render()`, `filename()` |
| `app/Http/Controllers/SocialCaseController.php` | *(new)* — `show`/`store`/`update`, `HasMiddleware` per-action gates |
| `app/Http/Controllers/{Submit,Finalize,Amend}SocialCaseController.php` | *(new)* — one `__invoke` each, per the verb-controller convention |
| `app/Http/Controllers/SocialCasePdfController.php` | *(new)* — copied from `IntakeSheetPdfController`; `?download` toggles stream/download |
| `app/Http/Requests/{Store,Update,Amend}SocialCaseRequest.php` | *(new)* — store takes optional `assessment_id`; amend takes `reason` required, max 255 |
| `app/Http/Resources/SocialCaseResource.php` | *(new)* — §A.8 |
| `app/Http/Resources/AssessmentResource.php` | `+ social_case_status` **only**, so `GET /cases/{case}/assessments` can mark which row is the SCSR. No other new column leaks here — they are null on most rows |
| `app/Services/AssessmentService.php` | `delete()` refuses when `social_case_status === finalized` (`ValidationException`, mirroring `UnifiedIntakeSheetService::cancel()`) |
| `app/Services/UnifiedIntakeSheetService.php` | the dead-end fix — §A.6 |
| `resources/views/pdf/social-case-study.blade.php` | *(new)* — §A.9 |
| `resources/views/pdf/partials/_styles.blade.php` | *(new)* — the intake template's `<style>` block extracted verbatim |
| `resources/views/pdf/unified-intake-sheet.blade.php` | style block → `@include` |
| `routes/api.php` | `+` the seven routes in §A.5 |
| `database/seeders/RolesAndPermissionsSeeder.php` | `+ 'cases.finalize_social_case'` to `PERMISSIONS`; grant to `MSS Head` and `Supervisor` (Admin has `['*']`). **Not** Case Manager |
| `app/Console/Commands/PromoteExistingSocialCases.php` | *(new)* — opt-in, `--dry-run`, `--case=` |

Plus the `assessment_expenses` surface in §A.10.

### A.4 Fix: the Assessment hard-delete — first commit of this phase

`assessments` has a `deleted_at` column but `app/Models/Assessment.php` never
mixes in `SoftDeletes`, so `AssessmentService::delete()` hard-deletes. A
prerequisite, not scope creep:

- The §A.1 guard reads `deleted_at IS NULL`. That clause is only meaningful if
  soft-deletes actually happen; today it is decorative.
- Phase A makes the assessment row the anchor of a signed document. A hard
  `DELETE` cascade-deletes its `assessment_expenses` (`cascadeOnDelete`), orphans
  the archived PDF's `Document` row, and leaves `activity_log` pointing at a
  subject that no longer exists.
- `deleted_at` already exists — this is a trait line, no migration.

**Behaviour change:** `DELETE /assessments/{assessment}` becomes a soft delete.
Record it in `API_CONTRACT_SYNC_PLAN.md`. `?trashed=with` starts working on
`AssessmentRepository` (a gain — it declares no `$filterable`), and
`Patient::latestAssessment` now excludes trashed rows for free.

### A.5 Permission and routes

Authoring, editing, submitting, reading and printing fold under the existing
`cases.view` / `cases.create` / `cases.update` that Case Manager already holds.
Only **finalize** and **amend** take the new permission — amend because unlocking
a signed document is the same authority as signing it.

This follows the catalog rule ("add new endpoints under an existing permission
unless the operation is genuinely a different authority level", per
`cases.waive_watcher`) and mirrors Case Manager already holding `intake.update`
but not `intake.finalize`.

```php
Route::middleware('permission:cases.view')->group(function () {
    Route::get('cases/{case}/social-case', [SocialCaseController::class, 'show']);
    Route::get('cases/{case}/social-case/pdf', SocialCasePdfController::class);
});
Route::post('cases/{case}/social-case', [SocialCaseController::class, 'store'])
    ->middleware('permission:cases.create');
Route::middleware('permission:cases.update')->group(function () {
    Route::put('cases/{case}/social-case', [SocialCaseController::class, 'update']);
    Route::post('cases/{case}/social-case/submit', SubmitSocialCaseController::class);
});
// Noting the report is section-head level — its own permission, like cases.waive_watcher.
Route::middleware('permission:cases.finalize_social_case')->group(function () {
    Route::post('cases/{case}/social-case/finalize', FinalizeSocialCaseController::class);
    Route::post('cases/{case}/social-case/amend', AmendSocialCaseController::class);
});
```

`RolesAndPermissionsTest` counts `PERMISSIONS` dynamically, so no test edit is
needed for the count.

### A.6 Fix: the intake dead end, and the intake tie-in

1. **Intake finalize does not seed an SCSR — pull, not push.** Auto-flagging every
   finalized intake would open Phase B's queue on hundreds of unwritten drafts.
   `SocialCaseService::start()` instead **promotes** the case's existing
   assessment (latest by default, or an explicit `assessment_id` validated to
   belong to that case). If the case has no assessment, `start()` creates one,
   which requires `classification` in the request since that column is NOT NULL.
2. **Referral fields seed from the latest *finalized* intake** (falling back to
   the latest of any status) unless the request supplies its own. A snapshot,
   never a live join. A case with no intake gets nulls the worker fills in.
3. **Fix the dead end.** Change `UnifiedIntakeSheetService::update()` to *create*
   the assessment (against `$sheet->case_id`, `created_by =
   $sheet->intake_worker_id`) and set `assessment_id` when `$dto->assessment !==
   null && $sheet->assessment_id === null`. It belongs here because this module's
   central promise — every episode can carry a social case — is false for any
   intake-created case whose draft lacked an assessment. Add one case to
   `tests/Feature/UnifiedIntakeSheetTest.php`.

### A.7 Service methods and guards

`app/Services/SocialCaseService.php`:

| Method | Guards |
|--------|--------|
| `find(CaseModel $case)` | `$case->socialCase()->firstOrFail()` → 404 |
| `start(CaseModel $case, User $author, SocialCaseDto $dto, ?int $assessmentId)` | `DB::transaction`. 422 if an SCSR already exists (not a DB 500). Validate `$assessmentId` belongs to `$case`. Seed referral fields. Assign `social_case_no`, status `draft`, `revision = 1`, `prepared_by`. `CaseActivity` `social_case_started`. Refuse on an archived case |
| `update(Assessment $scsr, SocialCaseDto $dto)` | `assertEditable()` — status ∈ `[draft, for_review]` |
| `submitForReview(Assessment $scsr, User $user)` | Requires `draft`. Sets `for_review`, `review_requested_at`, `prepared_by`, `prepared_at`. `CaseActivity` `social_case_submitted` |
| `finalize(Assessment $scsr, User $user)` | Requires `draft` **or** `for_review`. Calls `EnsureWatcherRequirementSatisfied($case, 'have its social case study finalized')`. Backfills `prepared_*` when coming from draft. Sets `noted_by`, `noted_at`, `finalized`. Archives PDF + `Document`. `CaseActivity` `social_case_finalized`. One transaction |
| `amend(Assessment $scsr, User $user, string $reason)` | Requires `finalized`. → `draft`, `revision++`, clears `noted_*` and `review_requested_at`. `CaseActivity` `social_case_amended` carrying the reason. **Prior `Document` untouched** |

**Finalize is permitted direct from `draft`.** Requiring the review step in the
schema would deadlock a one-person office and block MSS Head, who is a legitimate
signer. The review step is optional by policy, mandatory by nothing.

**Model-level immutability guard — a deliberate exception to "guards live in
services".** `PUT /assessments/{assessment}` (the pre-existing
`AssessmentController@update`) and Filament's `AssessmentsRelationManager` both
write the row directly, so a service-only lock has two holes. Add to
`Assessment::booted()`:

```php
static::updating(function (Assessment $assessment) {
    if ($assessment->getOriginal('social_case_status') !== self::SOCIAL_CASE_FINALIZED) {
        return;
    }
    // The lifecycle columns the amend path legitimately rewrites.
    $unlocked = ['social_case_status', 'revision', 'noted_by', 'noted_at',
                 'review_requested_at', 'deleted_at', 'updated_at'];
    if (array_diff(array_keys($assessment->getDirty()), $unlocked) !== []) {
        throw ValidationException::withMessages([
            'social_case_status' => 'A finalized social case study must be amended before it can be edited.',
        ]);
    }
});
```

### A.8 Versioning — archived PDFs, not row revisions

**No `assessment_revisions` table and no self-referencing `parent_id`.** The
authoritative artifact in MSWD practice is the signed document; the row is working
state — already this repo's model for the intake sheet. `Auditable` **already**
stores a field-level before/after diff of every narrative edit, so a revisions
table would be a *third* copy of the same text, and the only question it answers
that the audit log does not — "render it as it stood on 12 March" — is answered
better by the archived PDF, which also freezes the interpolated patient data.

**Amendment path.** Amend sets status back to `draft` and increments `revision`,
never touching the prior `Document`. The next finalize writes
`social-case-studies/{social_case_no}-r{revision}.pdf` and a new `Document` row.
Revisions are therefore a stack of immutable `Document` rows sharing a
`social_case_no`, already queryable through `GET /cases/{case}/documents`. **Zero
new read surface.**

`SocialCaseResource` keys:

```
id, case_id, social_case_no, social_case_status, revision,
classification, total_family_income, housing_type, utilities_access,
referral_source, reason_for_referral,
presenting_problem, family_background, medical_history, social_functioning,
assessment_notes, recommendation, recommended_assistance, recommended_amount,
intervention_plan,
created_by:{id,name}, prepared_by:{id,name}, prepared_at,
noted_by:{id,name}, noted_at, review_requested_at,
expenses (whenLoaded), expenses_total (whenLoaded),
is_editable, can_finalize,
latest_document (whenLoaded): {id, file_name, file_path, created_at},
created_at, updated_at
```

`{id, name}` follows `CaseModelResource`'s `assigned_user` shape
(`employee_name`), via `whenLoaded`.

### A.9 PDF

Copy `UnifiedIntakeSheetPdfService` exactly. `RELATIONS` covers
`case.patient.{sector,patientIds,familyMembers}`, `case.assignedUser`,
`case.watchers`, `case.patientAssistances.assistantType`,
`case.interventions.interventionType`, `expenses`, `createdBy`, `preparedBy`,
`notedBy`. `filename()` = `"{$scsr->social_case_no}-r{$scsr->revision}.pdf"`.

The blade `@include`s the extracted `partials/_styles` — `font-family: DejaVu
Sans` is **required** for `₱`. Letterhead "ZAMBOANGA CITY MEDICAL CENTER / Medical
Social Services", doc title "Social Case Study Report", rotated watermark under
`@unless($isFinal)`. Sections I–X per §A.2, closing with a two-column signature
block (**Prepared by** — Medical Social Worker / **Noted by** — Section Head) and
a footer carrying `social_case_no`, revision and generation timestamp.

Archive on finalize exactly as `UnifiedIntakeSheetService::archiveFinalizedPdf()`
does, with `document_type => 'social_case_study'`. Both `documents.case_id` and
`patient_id` are NOT NULL and both are available here.

### A.10 Fix: `assessment_expenses` gets its API surface

Not tidiness — the document cannot be finished without it. The SCSR's §V prints a
household expense table against `total_family_income`, and today the **only** way
an expense row can exist is `UnifiedIntakeSheetService::createExpenses()`. So an
SCSR on a case opened via `POST /cases` can never have expenses at all, and a
mistyped amount is uncorrectable through the API.

Follow the `patient_family_members` shape: `AssessmentExpenseDto`
(`$suppliedKeys`), a Contract + `AssessmentExpenseRepository` + one line in
`RepositoryServiceProvider::$bindings`, `AssessmentExpenseService` (every write
calls `assertParentEditable()` — reject when the parent's `social_case_status ===
finalized`), `AssessmentExpenseController` with `HasMiddleware`, two FormRequests.

```php
Route::get('assessments/{assessment}/expenses', [AssessmentExpenseController::class, 'index']);
Route::post('assessments/{assessment}/expenses', [AssessmentExpenseController::class, 'store']);
Route::put('assessment-expenses/{expense}', [AssessmentExpenseController::class, 'update']);
Route::delete('assessment-expenses/{expense}', [AssessmentExpenseController::class, 'destroy']);
```

`AssessmentExpense` is **already** in `AuditCoverageTest` and already has a
two-hop `activityOwner()` — no audit work needed. It keeps **no** `softDeletes()`
(a line item under a soft-deletable parent; `cascadeOnDelete` never fires after
§A.4).

**Blast radius.** `assessments` gains fourteen nullable columns plus a generated
column; every existing row keeps working, because all new columns are nullable or
defaulted and `social_case_guard` is NULL everywhere on day one. The intake flow,
`AssessmentController`, `PatientResource::latest_assessment` and both Filament
relation managers are read-compatible unchanged. Two genuine behaviour changes:
`DELETE /assessments/{id}` becomes a soft delete, and a finalized SCSR rejects
writes through `PUT /assessments/{assessment}` and through Filament. The extracted
`_styles.blade.php` touches the intake PDF — `UnifiedIntakeSheetPdfTest` renders
the view and asserts on its HTML, so it covers the refactor.

**Gate.** `composer test` — full suite green. Locked by
`tests/Feature/SocialCaseStudyTest.php` *(new)*: start promotes the latest
assessment; start with an explicit `assessment_id`; start on a case with no
assessment; a second start 422s; **the DB guard rejects a second flagged row
inserted directly via `Assessment::create()`, bypassing the service**; referral
fields seed from the latest finalized intake and are overridable;
draft→review→finalize; finalize direct from draft backfills `prepared_by`;
finalize 422s when the watcher requirement blocks; a finalized SCSR rejects both
`PUT /cases/{case}/social-case` and `PUT /assessments/{assessment}`; amend
increments `revision` and reopens; `cases.finalize_social_case` is required for
finalize and amend and Case Manager is forbidden both; **an intake appended to a
case that already has a finalized SCSR still succeeds** (the regression this
design exists to prevent); `SCSR-{year}-{6}` format and uniqueness; the `delete()`
guard; `assertSoftDeleted`. Plus `SocialCaseStudyPdfTest.php` (mirrors
`UnifiedIntakeSheetPdfTest`) and `AssessmentExpenseApiTest.php` *(new)*.

---

## Phase B — Caseload queue ☐

**A dedicated `GET /my-caseload`, not `GET /cases?filter[assigned_user_id]=me`.**
`BaseRepository::applyFilters()` passes filter values straight into `where()`, so
`=me` would need a magic-string special case inside the generic filter path —
exactly the ad-hoc query parsing the architecture forbids, and it would leak into
every repository. A dedicated route is also the established shape for anything
context-bearing (`PatientCaretakeController`, `CaseWatcherStatusController`).
`GET /cases?filter[assigned_user_id]=<id>` keeps working unchanged for a
supervisor inspecting one worker's list.

```
GET /my-caseload                                    permission:cases.view
  ?status=open,ongoing (default)
  &social_case_status=none|draft|for_review|finalized
  &search= &sort= &direction= &page= &per_page=
```

Returns `CaseModelResource::collection($paginator)->additional(['meta' =>
['buckets' => [...]]])`, buckets computed in **one grouped query**, not per row.

| File | Change |
|------|--------|
| `database/migrations/2026_09_12_020000_add_caseload_indexes_to_cases_table.php` | *(new)* — `['assigned_user_id','status']`, `['status','date_opened']`, `case_type`, `priority_level`. All are declared filter/sort columns on `CaseModelRepository` and **all are unindexed today** |
| `app/Repositories/CaseModelRepository.php` | `+ 'is_protective'`, `+ 'admission_type'` to `$filterable`; `+ 'socialCase'` to `$listWith`; `+ paginateCaseload()` using `whereHas('socialCase', …)` / `whereDoesntHave('socialCase')` for `none` |
| `app/Repositories/Contracts/CaseModelRepositoryInterface.php` | `+ paginateCaseload()` |
| `app/Services/CaseModelService.php` | `+ caseload()`, `+ caseloadBuckets()` (one `selectRaw` grouped query) |
| `app/Http/Controllers/MyCaseloadController.php` | *(new)* |
| `app/Http/Resources/CaseModelResource.php` | `+ social_case` — a **flat lite shape** (`id`, `social_case_no`, `social_case_status`, `revision`, `review_requested_at`, `noted_at`) under `whenLoaded('socialCase')`, not the full resource; twenty narrative columns per list row is not acceptable |
| `routes/api.php` | `+ Route::get('my-caseload', …)->middleware('permission:cases.view')` |

**Blast radius.** Purely additive — no column changes, no behaviour change to any
existing endpoint. `CaseModelResource` gains one `whenLoaded` key; nothing in the
suite uses `assertExactJson`. Deployment caveat: `ALTER TABLE cases ADD INDEX` is
online on MySQL 8 / MariaDB 10.x but briefly holds a metadata lock — use a
maintenance window if `cases` is large.

**Gate.** `php artisan test --filter=CaseloadQueueTest`, plus `composer test`.
Locked by `tests/Feature/CaseloadQueueTest.php` *(new)* — only the actor's own
cases; closed excluded by default and included on request;
`social_case_status=none` returns exactly the cases with no SCSR; `=for_review`
exactly those awaiting a signature; bucket counts match the filtered counts;
`cases.view` required; **query count constant regardless of row count** (3 vs 6
rows after a warm-up request, per the `PatientManagementTest` precedent for
Spatie's permission cache).

---

## Phase C — Progress notes / follow-ups ☐

**A new `case_progress_notes` table — not `CaseActivity`, not `Intervention`.**

- `CaseActivity` is the system-generated milestone chronology and is **not
  `Auditable` and has no `softDeletes()`**, by design as an append-only table.
  Hand-written clinical narrative there would drown the timeline *and* leave an
  edited or removed note with no audit trail — disqualifying for a record that
  can be subpoenaed.
- `Intervention` requires `intervention_type_id` against the `intervention_type`
  master list and models a *service actually delivered*, with `date_given` and
  `outcome`. "Phoned the daughter, still no funds, following up Monday" is not a
  delivered service, and forcing a type row onto it would corrupt the
  intervention counts Phase D reports on.

Each note still writes a one-line `progress_note_added` `CaseActivity`, so the
chronology stays complete without duplicating the narrative.

`database/migrations/2026_09_12_030000_create_case_progress_notes_table.php`:
`case_id`, `assessment_id` (**nullable** — a case may have no SCSR and the note
still matters), `author_id`, `note_type` (plain `string()` + model constants:
`progress|home_visit|phone_follow_up|conference|referral_follow_up|other`),
`note_date`, `narrative` text, `follow_up_on` date nullable, `follow_up_done_at`,
`follow_up_done_by`, timestamps, `softDeletes()` (an editable working record),
indexes `['case_id','note_date']` and `follow_up_on`.

New: the model (`Auditable, SoftDeletes`, `activityOwner()` hopping via
`auditParent('case')` exactly as `Intervention` does), a DTO, a Contract +
Repository + one `$bindings` line, a Service, `CaseProgressNoteController`,
`CompleteFollowUpController`, `MyFollowUpsController`, two FormRequests and a
Resource. **`tests/Feature/AuditCoverageTest.php` must gain
`CaseProgressNote::class`** or coverage silently regresses.

Guards: `create()` refuses on an archived case and defaults `assessment_id` to the
case's SCSR when one exists; `update()` / `delete()` require the actor be the
note's author **or** hold `cases.delete` (clinical narrative is attributable — a
colleague silently rewriting someone else's note is the failure mode to prevent,
and the audit log makes the supervisor override accountable);
`completeFollowUp()` refuses when `follow_up_on` is null or the note is already
done. **No new permission** — a progress note is ordinary case work, the opposite
end of the authority scale from signing the SCSR.

**Blast radius.** An entirely new table and routes; nothing existing changes
except one added entry in `AuditCoverageTest` and one new `activity_type` value in
`case_activities`, which the client renders as free text.

**Gate.** `php artisan test --filter=CaseProgressNoteTest`, plus `composer test`.
Locked by `tests/Feature/CaseProgressNoteTest.php` *(new)* — CRUD; a note
auto-links to the case's SCSR when one exists and to null when it does not; a
non-author without `cases.delete` is forbidden to edit or delete and a supervisor
is permitted; a note on an archived case 422s; `/my-follow-ups` returns only the
actor's due and overdue notes and excludes completed ones and closed cases; each
note writes exactly one `CaseActivity`; `assertSoftDeleted`; the model appears in
`AuditCoverageTest`.

---

## Phase D — Reporting + case summary PDF ☐

| Route | Permission | Returns |
|-------|-----------|---------|
| `GET /reports/social-cases` | `reports.view` | JSON aggregates over a date range: SCSR counts by `social_case_status`, `classification`, `case_type`, `admission_type` and assigned worker; median days draft→finalized; count of cases with no SCSR; overdue follow-up count |
| `GET /reports/social-cases/export` | **`reports.generate`** | The same dataset as CSV (`?format=csv`, default) or PDF |
| `GET /cases/{case}/summary-pdf` | `cases.view` | An endorsement/referral document: case header, the SCSR body, interventions, assistance and progress notes |

**Claiming `reports.generate` is right.** It currently gates exactly one thing —
voiding a DAR — which is a misuse of the name and leaves the permission
effectively unclaimed. Giving it a consistent meaning (*produce an extract*, as
opposed to *view the screen*) has a real access-control consequence: Case Manager
holds `reports.view` but **not** `reports.generate`, so bulk PHI extraction stays
with Supervisor and above while the on-screen dashboard stays available. That
mirrors `intake.finalize` and `cases.finalize_social_case`. The case summary PDF
is a *case document*, not an extract, so it sits on `cases.view` — the same
reasoning that puts the intake PDF on `intake.view`.

**Open item, to settle before building D.** Should `is_protective` cases be
excluded from aggregates for users without `audit.view_protective`?
`ActivityLogService` already applies a protective `whereNotIn` for exactly that
reason, but `cases` themselves are filtered nowhere. **Recommendation: yes,
exclude them, and add a `protective_excluded: true` marker to the response so the
number is never silently wrong.** This needs a decision, not a default.

New: `SocialCaseReportService` (one grouped query per aggregate, protective filter
per the open item), `CaseSummaryPdfService`, three `__invoke` controllers, a
Resource, and two blades that `@include partials/_styles`.

**Blast radius.** Read-only additions. The only pre-existing thing touched is the
*meaning* of `reports.generate`, which gains endpoints without losing any.

**Gate.** `php artisan test --filter=SocialCaseReportTest`, plus `composer test`.
Locked by `tests/Feature/SocialCaseReportTest.php` *(new)* — aggregate counts
match hand-built fixtures; the date range is honoured; `reports.view` is enough
for the dashboard and insufficient for the export; Case Manager is forbidden the
export; protective cases are excluded for a user without `audit.view_protective`
and included for one with it, with the marker set; the CSV has the expected header
row; the summary PDF emits `%PDF` and contains the SCSR narrative, the
interventions and the progress notes; `?download` sets content-disposition.

---

## Client phases (detail lives in `zcmc_mswd_client/docs/SOCIAL_CASE_PLAN.md`)

**Phase E — SCSR tab rewrite.** Ships against server Phase A. A new
`src/features/cases/api/social-case-api.ts` with `getSocialCase`,
`startSocialCase`, `updateSocialCase`, `submit`, `finalize`, `amend` and
`downloadSocialCasePdf`. Replace the derived `caseStudy` block in
`patients-adapter.ts` with the real resource — **retiring both `NOT_ON_FILE`
placeholders**, which is the visible payoff. Rewrite `social-case-tab.tsx` from
read-only to an editor with a status badge, section fields, a PDF button, and
`usePermission("cases.finalize_social_case")` gating the finalize action. The tab
is reached from the patient's latest case, as today.

**Phase F — case route + caseload screen. Blocked.** The client has **no
react-router at all**, no case-scoped route, and `src/features/cases/` does not
exist. A caseload screen needs a routing project first.

---

## Problems the pre-made decisions create

**P1 — "extend `assessments`" + "one per episode" costs semantic clarity.** The
§A.0 design resolves the conflict without breaking anything, but `assessments`
becomes two things in one table: an intake-time socioeconomic snapshot and an
authored legal document, with fourteen columns NULL on the large majority of rows.
Acceptable today — all nullable, nothing to backfill, and same-row promotion is
what makes the intake tie-in free. **If the SCSR later grows another ten narrative
sections, the right move is a `social_cases` table with a 1:1 `assessment_id`**,
and that escape hatch stays cheap precisely because nothing outside
`SocialCaseService` and `SocialCaseResource` reads the new columns. Recorded here
so the next person does not keep piling on.

**P2 — Phases B, C and F are blocked by the client, not by this repo.** Phase A is
consumable today by the existing tab. B and C would ship as API + Filament
surfaces with no SPA consumer until the client's routing work lands as its own
plan. **Shipping B and C before the client can route to a case means building a
queue nobody can open** — hence the recommended A → E → routing → B, C → F order.

**P3 — the control-number race is inherited.** `SCSR-{year}-{6}` uses the same
`COUNT(*) + 1` under no lock as `UIS-`, `CASE-` and `PASS-`. The unique index
turns a race into a 500; the 3-attempt retry in `SocialCaseNumberService` turns
that into a success. The same treatment should be back-ported to `nextCaseCode()`
and `nextIntakeNumber()` — flagged, out of scope.

**P4 — the intake watcher gap will be reported as a Social Case bug.** Intake
`watchers[]` sync onto `patient_watchers`, but `EnsureWatcherRequirementSatisfied`
reads `case_watchers`. `SocialCaseService::finalize()` calls that gate, so an
inpatient case whose only watcher arrived via intake will 422 at SCSR finalize
about a watcher the worker believes they already provided. Pre-existing, belongs
in `WATCHER_LOGIC_PLAN.md` — **decide whether to fix it before or with Phase A.**

**P5 — `CaseModelService::update()` bypasses every guard**, so `PUT /cases/{id}`
can flip a case to `closed` behind the watcher gate and behind an unfinalized
SCSR. Phase B's queue will make the resulting inconsistencies visible (closed
cases with a `for_review` SCSR sitting in someone's queue). Flagged, out of scope.

---

## Verification

1. `php artisan migrate:fresh --env=testing` — confirms the two-step migration and
   the generated column apply cleanly on **SQLite** (the `virtualAs` branch).
2. `composer test` — the full suite must stay green; it catches the shared-PDF
   style refactor and the soft-delete change.
3. **Verify the guard against MySQL before shipping Phase A**, not only SQLite:
   the `storedAs` branch is the production path and the test suite never exercises
   it. `PATIENT_CARETAKE_PLAN.md` records the same check as "Verified against real
   MariaDB". **Verified against real MySQL 8.0.45, 2026-09-11**: the column is
   `STORED GENERATED` as `if(((social_case_status is not null) and (deleted_at is
   null)), case_id, NULL)`; two NULL-status assessments on one case are accepted,
   a second flagged row is rejected by `uniq_case_social_case`, and soft-deleting
   the SCSR frees the guard for a replacement.
4. Manual end-to-end for Phase A: open a case via intake → `POST
   /cases/{case}/social-case` → confirm income, classification and expenses
   carried over from the intake assessment with no retyping → `PUT` narrative
   sections → `submit` as Case Manager → confirm `finalize` **403s** as Case
   Manager and succeeds as Supervisor → `GET …/pdf` renders with `₱` intact and
   both signature blocks → confirm the `Document` row and the stored file exist →
   `amend`, re-finalize, confirm **two** `Document` rows share the
   `social_case_no`.
5. Confirm the invariant §A.0 exists to protect: append a second intake to that
   same case and confirm it still succeeds.

---

## Out of scope

- **Row-level revision history** (`assessment_revisions`) — see §A.8.
- **Filament SCSR authoring UI.** The API plus the existing relation managers
  suffice for back-office correction, and the finalized-row lock protects them.
- **The intake `patient_watchers` vs `case_watchers` gate mismatch** — belongs in
  `WATCHER_LOGIC_PLAN.md`, but read P4 before shipping Phase A.
- **Back-porting the control-number retry** to `CASE-` / `UIS-`.
- **Adding guards to `CaseModelService::update()`.**
- **Re-gating the DAR void** off `reports.generate` and onto `assistance.approve`.
- **The Protective Cases module** — `is_protective` stays the boolean it is.
