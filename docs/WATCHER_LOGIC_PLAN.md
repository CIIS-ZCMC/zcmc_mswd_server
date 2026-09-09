# MSS — Watcher Logic Plan (Server + Client)

Design and build plan for episode-scoped watchers, replacing the current
patient-scoped `patient_watchers` model. Covers both `zcmc_mswd_server` and
`zcmc_mswd_client`.

**Status legend:** ☐ not started · ◐ in progress · ☑ done

| Phase | Side | Status |
|-------|------|--------|
| 1. Schema — `case_watchers` + waiver columns | server | ☑ done — 209 passed, 2026-09-08 |
| 2. Requirement resolver + model invariants | server | ☑ done — 232 passed, 2026-09-09 |
| 3. Endpoints, resources, DTOs | server | ☑ done — 247 passed, 2026-09-09 |
| 4. Enforcement at transitions | server | ☑ done — 260 passed, 2026-09-09 |
| 5. Backfill + legacy flag | server | ☑ done — 268 passed, 2026-09-09 |
| 6. Types + adapter + API layer | client | ☐ |
| 7. Case-scoped Watchers tab | client | ☐ |
| 8. Requirement banner, waiver dialog, worklist filter | client | ☐ |

Phases 1–5 ship independently; the client keeps working unchanged because the
existing `patient_watchers` endpoints stay live throughout. Phase 6 must not
land before Phase 3 is deployed.

**Deployment-ordering note, updated with Phase 5:** Phases 4 and 5 are both
in `master` now, but the backfill is a **command that has to be run**, not
something that happens on deploy automatically — `php artisan
mss:backfill-case-watchers` (see §7 below). Until it's actually run against
an environment's real data, that environment is in the same state described
when this note was written for Phase 4: every existing open inpatient or ER
case with no registered watcher will 422 the first time someone tries to
close it, submit/finalize its intake, record an assessment on it, or approve
assistance against it. Run the command — `--dry-run` first to see the
counts, matching what was verified against a real MariaDB copy while
building it — before or immediately after Phase 4/5 reaches an environment
with existing case data.

---

## 1. Background — the problem with the current model

`patient_watchers` hangs off `patients`:

```php
$table->foreignId('patient_id')->constrained('patients');
$table->string('name');
$table->string('relationship')->nullable();
$table->string('contact_number')->nullable();
$table->string('address')->nullable();
$table->boolean('is_primary')->default(false);
```

Three consequences:

1. **MSS work is episode-driven** (project rule §3), but watchers are not. The
   same patient admitted in March and August gets one shared watcher list, and
   the March bantay silently appears on the August case.
2. **The requirement can't be expressed.** "Inpatient must have a watcher, OPD
   need not" is a property of the *episode* — `cases.admission_type` — and there
   is nothing on the patient-scoped row to attach it to.
3. **The client is already papering over the gap.** `watcher.types.ts` documents
   that `passNo`, `validUntil` and `status` have no backing columns and are
   filled with a "not tracked" placeholder by the adapter, while
   `watchers-tab.tsx` renders a "Issue Watcher Pass" UI for data that does not
   exist. Pass issuance is inherently per-admission — it cannot be fixed without
   the episode link.

### Assumptions made (confirm before Phase 1)

These three were open questions; the plan below assumes the following, and each
is cheap to reverse if wrong:

- **A1 — Watcher and informant are usually the same person.** Modelled as an
  `is_informant` flag on `case_watchers`, not a separate table.
- **A2 — The guarantee letter prints the watcher as claimant/receiver.** The GL
  therefore stores its own `claimant_*` snapshot, defaulted from the primary
  watcher, never a live join.
- **A3 — Watchers do rotate mid-admission.** `present_from` / `present_until`
  are included. If they turn out to be dead columns, drop them in a later
  migration and keep one primary + alternates.

---

## 2. Target model

### Two distinct concepts

**`patient_watchers` — the directory.** People known to be associated with this
patient, across all episodes. No requirement logic lives here. It exists so a
social worker doesn't retype the same spouse on every admission.

**`case_watchers` — the episode link.** Who is actually watching over *this*
admission, in what role, with what pass. All rules apply here.

### Migration — `create_case_watchers_table`

```php
Schema::create('case_watchers', function (Blueprint $table) {
    $table->id();
    $table->foreignId('case_id')->constrained('cases');
    $table->foreignId('patient_watcher_id')->nullable()
          ->constrained('patient_watchers');   // null = ad-hoc, not in directory

    // Snapshot at time of this episode — the directory row may change later.
    $table->string('name');
    $table->string('relationship');            // from master list, not free text
    $table->string('contact_number')->nullable();
    $table->string('address')->nullable();

    $table->boolean('is_primary')->default(false);
    $table->boolean('is_informant')->default(false);   // A1

    // Ward pass — the fields the client already renders but cannot store.
    $table->string('pass_number')->nullable()->unique();
    $table->date('pass_valid_until')->nullable();
    $table->string('pass_status')->default('active'); // active|expired|revoked

    // A3 — rotation within one admission.
    $table->dateTime('present_from')->nullable();
    $table->dateTime('present_until')->nullable();

    $table->foreignId('added_by')->constrained('users');
    $table->text('notes')->nullable();
    $table->timestamps();
    $table->softDeletes();

    $table->index(['case_id', 'is_primary']);
});
```

Plus the partial unique index enforcing one primary per case (MySQL 8 has no
partial index — use a generated column or enforce in the model layer; see §4):

```sql
-- MySQL 8 workaround: generated column that is NULL unless the row is the
-- live primary, then a normal unique index over it.
ALTER TABLE case_watchers
  ADD COLUMN primary_key_guard BIGINT
    GENERATED ALWAYS AS (
      IF(is_primary = 1 AND deleted_at IS NULL, case_id, NULL)
    ) STORED,
  ADD UNIQUE KEY uniq_case_primary_watcher (primary_key_guard);
```

### Migration — waiver columns on `cases`

```php
Schema::table('cases', function (Blueprint $table) {
    $table->string('watcher_waiver_reason')->nullable();
    // unidentified_patient | abandoned | unaccompanied |
    // patient_refused | under_protective_custody | other
    $table->text('watcher_waiver_note')->nullable();
    $table->foreignId('watcher_waived_by')->nullable()->constrained('users');
    $table->dateTime('watcher_waived_at')->nullable();
    $table->boolean('watcher_legacy_exempt')->default(false); // see Phase 5
});
```

### Relationship master list

Seed as reference data, exposed via the existing reference feature on the
client: `spouse, parent, child, sibling, grandparent, grandchild, relative,
guardian, friend, neighbor, employer, barangay_official, other`.

---

### Phase 1 implementation notes ☑

**Shipped:**

- Migrations `create_watcher_relationship_types_table`, `create_case_watchers_table`,
  `add_watcher_waiver_columns_to_cases_table`.
- `WatcherRelationshipType` model + `WatcherRelationshipTypeSeeder` (the 13
  values above, keyed by a `code`, `firstOrCreate` so re-seeding is a no-op) +
  a read-only `GET /watcher-relationship-types` lookup (index/show), mirroring
  the existing `intervention-types`/`assistant-types` reference endpoints
  exactly — routes, controller, resource.
- `CaseWatcher` model: fillable, casts, and `case()` / `patientWatcher()` /
  `addedBy()` relations only — no booted events or promote/demote logic yet,
  that's Phase 2's "model invariants."
- `CaseModel::watchers(): HasMany` and `PatientWatcher::caseWatchers(): HasMany`.
- The four `watcher_*` columns added to `CaseModel::$fillable` and cast
  (`watcher_waived_at` → datetime, `watcher_legacy_exempt` → boolean) — needed
  for `$case->update([...])` to reach them at all; easy to miss since
  `$fillable` silently drops unlisted keys rather than erroring.

**Correction to the plan's migration snippet:** the `IF(...)` generated-column
expression is MySQL-only. This project's test suite runs on SQLite
(`phpunit.xml`), and `RefreshDatabase` re-runs every migration against it, so
raw `IF()` would have broken all 209 tests, not just the new ones. Fixed by
branching on `DB::getDriverName()` inside the migration — MySQL keeps `IF()`,
everything else (SQLite in tests) gets the equivalent `CASE WHEN ... END` —
both defined in the same `Schema::create()` block rather than a follow-up
`Schema::table()` alter, since SQLite's `ALTER TABLE` cannot add a generated
column to an existing table.

**Verified against real MariaDB**, not just SQLite (production runs MySQL;
the local dev DB is MariaDB 10.4, which Laravel treats as the `mysql`
driver): ran the three migrations against `zcmc_mswd_server` directly,
confirmed via `SHOW CREATE TABLE case_watchers` that `primary_key_guard` came
out as a real `GENERATED ALWAYS AS (if(...)) STORED` column with the unique
index attached, then confirmed a second live primary on the same case throws
`SQLSTATE[23000] Duplicate entry` — the same invariant the SQLite-backed Pest
tests check. Rolled the three migrations back afterward, dev DB left as found.

**Deferred to later phases, not in this commit:** `WatcherRequirementService`,
promote/demote transaction logic, the "last primary can't be removed" guard,
pass-number sequencing, `is_incapacitated` on `patients`, DTOs, `Store`/`Update`
requests, `CaseWatcherController`, and all the enforcement/API-surface work in
§5–6. Those are Phases 2–3.

**Tests** (`tests/Feature/CaseWatcherTest.php`, 12 new): attribute/cast
round-trip, all three relations, `CaseModel::watchers()`, DB-level rejection
of a second live primary, allowing a new primary after the old one is
soft-deleted, multiple non-primary watchers coexisting, the same person
primary on two different cases, duplicate pass-number rejection, waiver
columns nullable-by-default and settable, seeder idempotency, and the
reference lookup (200 + 401).

`php artisan test` — 209 passed, 800 assertions (2026-09-08).

---

## 3. The requirement resolver

One function, one source of truth, consumed by request validation, transition
guards, the API resource, and the client banner. Lives in
`app/Services/WatcherRequirementService.php`.

```php
enum WatcherRequirement: string
{
    case Required    = 'required';
    case Recommended = 'recommended';
    case Optional    = 'optional';
    case Waived      = 'waived';
}
```

```php
// As shipped in Phase 2 — see "Phase 2 implementation notes" below for why
// this differs from the original sketch (no converted_to_admission, and
// watcher_legacy_exempt checked here rather than only in Phase 5).
public function resolve(CaseModel $case): WatcherRequirement
{
    // 1. A legacy case predating the cutover, or an approved waiver,
    //    overrides everything.
    if ($case->watcher_legacy_exempt) {
        return WatcherRequirement::Waived;
    }

    if ($case->watcher_waiver_reason !== null && $case->watcher_waived_at !== null) {
        return WatcherRequirement::Waived;
    }

    // 2. Legally incapable of speaking for themselves — any admission type.
    if ($this->isMinor($case->patient) || (bool) $case->patient->is_incapacitated) {
        return WatcherRequirement::Required;
    }

    // 3. Admission type.
    return match ($case->admission_type) {
        'inpatient' => WatcherRequirement::Required,
        'ER'        => WatcherRequirement::Recommended,
        'OPD'       => WatcherRequirement::Optional,
        default     => WatcherRequirement::Optional,
    };
}
```

`isMinor()` reads `patients.birthdate`, falling back to `estimated_age` when
birthdate is null (unidentified patients often have only an estimate).

Rule 2 is the one that gets missed in practice: a minor at OPD still cannot be
the interview subject or sign for assistance, so an accompanying adult is
effectively mandatory even though the admission type says optional.

`is_incapacitated` is a new nullable boolean on `patients`, set during intake.

### Derived state

```php
public function status(CaseModel $case): array
{
    $requirement = $this->resolve($case);
    $hasPrimary  = $case->watchers()->where('is_primary', true)->exists();

    return [
        'requirement' => $requirement->value,
        'has_primary' => $hasPrimary,
        'satisfied'   => $hasPrimary
                         || in_array($requirement, [
                              WatcherRequirement::Optional,
                              WatcherRequirement::Recommended,
                              WatcherRequirement::Waived,
                            ], true),
        'blocking'    => $requirement === WatcherRequirement::Required && ! $hasPrimary,
    ];
}
```

`blocking` is the single boolean every guard and every UI element keys off.

---

## 4. Model invariants (server)

Enforced in `CaseWatcher` model events and `CaseWatcherService`, not only in
form requests — Filament and seeders bypass requests.

1. **At most one live primary per case.** DB-enforced by the generated-column
   index above; the service promotes/demotes atomically in a transaction rather
   than relying on the client to send two calls.
2. **The last primary cannot be removed** while `blocking` would become true.
   Reject with 422 unless another watcher is promoted in the same request, or a
   waiver exists.
3. **Relationship must be in the master list.** `Rule::in()` off the seeded
   reference table.
4. **Pass numbers are sequential and never reused.** Same control-number service
   pattern as guarantee letters.
5. **Soft-deleting a case watcher never mutates an already-issued guarantee
   letter** — the GL holds its own snapshot (A2).
6. **Every write goes through `Auditable`**, matching the existing convention on
   `PatientWatcher` and `CaseModel`.

---

### Phase 2 implementation notes ☑

**Shipped:**

- `App\Enums\WatcherRequirement` (first enum in this codebase).
- `WatcherRequirementService::resolve()`, `::status()`, `::isMinor()` — as
  designed above, with two changes (below).
- `CaseWatcherService`: `create()` (validates `relationship` against
  `watcher_relationship_types.code`, atomically demotes an existing primary
  when the new watcher is created as primary), `promote()` (demote-then-set
  in one transaction), `remove()` (422 via `ValidationException` when
  removing the last primary would leave a `Required` case unmet),
  `issuePass()` / `revokePass()`.
- `WatcherPassNumberService::next()` — same count-based control-number
  pattern as `UnifiedIntakeSheetService::nextIntakeNumber()` /
  `nextCaseCode()` (guarantee letters, which the plan's invariant #4
  references, don't exist in this codebase yet — nothing to actually mirror
  there, so this mirrors the closest real precedent instead).
- `is_incapacitated` (nullable boolean) added to `patients` now, fillable
  and cast — the resolver needs it to exist to compile. The genuinely open
  question from §10 — whether intake should capture it, or MSS infers it
  from the case narrative — is still open; that's a client-side (Phase 6+)
  workflow decision, not a schema one.

**Two deviations from the resolver sketch in §3, made while implementing:**

1. **Dropped `converted_to_admission`.** Checked how ER→inpatient conversion
   is actually recorded: `UpdateCaseModelRequest` validates `admission_type`
   as a plain `string|max:255` with no enum constraint, and it's a normal
   `PUT /cases/{case}` field update — not a new case. So a converted case's
   `admission_type` is simply `'inpatient'` by the time `resolve()` runs,
   which already hits the `'inpatient' => Required` arm directly. A separate
   flag would never change the outcome for any real conversion, only add a
   value that has to be kept in sync for nothing — exactly the "drop the
   flag" resolution the plan's own §10 open item anticipated for this case.
2. **Pulled the `watcher_legacy_exempt` check (from §7, Phase 5) into
   `resolve()` now**, ahead of the actual backfill, since the column already
   exists from Phase 1 and it's a one-line extension of the existing
   waiver-precedence check — cheaper to add once than to reopen tested
   resolver code in Phase 5.

**Assumption flagged, not confirmed:** minor = under 18 (Philippine age of
majority, RA 6809). Not stated in the plan; if MSS uses a different
threshold in practice, it's a one-line constant change in
`WatcherRequirementService`.

**Skipped:** invariant #5 (a soft-deleted case watcher must not mutate an
already-issued guarantee letter) — guarantee letters aren't built in this
codebase yet, so there's nothing to violate. Revisit when GL exists.

**Bug caught by the swap test, fixed before merge:** `remove()` originally
trusted the passed-in model's in-memory `is_primary` attribute. A caller that
calls `promote($replacement)` (which demotes the old primary via a separate
`CaseWatcher::where(...)->update(...)` query, not through the old primary's
own model instance) and then calls `remove($oldPrimary)` on its
now-stale-in-memory copy would see `is_primary === true` and wrongly reject
the removal. Fixed by `$watcher->refresh()` at the top of `remove()`.

**Deferred to Phase 3:** `CaseWatcherController`, `StoreCaseWatcherRequest`
/ `UpdateCaseWatcherRequest`, `CaseWatcherDto`, `CaseWatcherResource`, routes,
and wiring `watcher_status` onto `CaseProfileController`. `CaseWatcherService`
above is written so Phase 3's controller is a thin wrapper over it.

**Tests:** `WatcherRequirementServiceTest.php` (14, dataset-driven truth
table: admission type × minor/incapacitated/adult × waived/legacy-exempt) and
`CaseWatcherServiceTest.php` (9: relationship validation, create-as-primary
demotion, promote demotion, blocked vs. allowed removal, waiver unblocks
removal, promote-then-remove swap, pass sequencing survives a revoke).

`php artisan test` — 232 passed, 832 assertions (2026-09-09).

---

## 5. Enforcement points — transitions, not inserts

Blocking `POST /cases` forces bad data: intake begins before the bantay is
known, so the worker will invent one to get past validation. Enforce on state
change instead.

| Action | Endpoint | Behavior when `blocking` |
|---|---|---|
| Create case / save intake draft | `POST /cases`, intake sheet save | allow; expose `watcher_status.blocking = true` |
| Submit intake sheet | `SubmitIntakeSheetController` | **422** unless waived |
| Finalize intake sheet | `FinalizeIntakeSheetController` | **422** unless waived |
| Store assessment | `POST /cases/{case}/assessments` | **422** unless waived |
| Approve assistance | `ApproveAssistanceController` | **422** unless waived |
| Generate guarantee letter | (GL controller, not yet built) | **422** unless waived |
| Close case | `CloseCaseController` | **422** unless waived |
| Reopen case | `ReopenCaseController` | allow; re-run resolver |
| Change `admission_type` (ER → inpatient) | `PUT /cases/{case}` | allow; re-run resolver, raise flag, **never** block retroactively |

Implemented as a single `EnsureWatcherRequirementSatisfied` action invoked at
the top of each guarded controller, returning a consistent 422 body:

```json
{
  "message": "This case requires a registered watcher before it can be closed.",
  "errors": {
    "watcher": ["No primary watcher is recorded for this inpatient case."]
  },
  "watcher_status": {
    "requirement": "required",
    "has_primary": false,
    "satisfied": false,
    "blocking": true
  }
}
```

The client keys its banner off `watcher_status`, so the same shape must appear
on both the 422 and on `GET /cases/{case}/profile`.

### Phase 4 implementation notes ☑

**One deliberate deviation from "invoked at the top of each guarded
controller":** `EnsureWatcherRequirementSatisfied` (`app/Actions/`) is called
from **service methods**, not controllers —
`UnifiedIntakeSheetService::submit()`/`::finalize()`,
`AssessmentService::create()`, `CaseModelService::close()`,
`PatientAssistanceService::approve()`. Every one of these methods already
guards its own transition with a service-level `ValidationException` (e.g.
`assertEditable()`, `isPending()`, `status === closed`) — none of that logic
lives in the controllers, which are thin `__invoke`-only wrappers. Putting
the watcher check anywhere else would have been the odd one out, and would
miss the same class of caller Phase 2's `CaseWatcherService` invariants were
built to catch: Filament actions or console commands that call these
services directly, bypassing controllers (and therefore any Form Request or
controller-level guard) entirely.

`WatcherRequirementNotSatisfiedException` (`app/Exceptions/`) carries the
`watcher_status` payload and defines `render()`, which Laravel calls
automatically — no change needed to the exception handler.

**Assessment scope note:** `AssessmentService::create()` is only reachable
from `AssessmentController@store` (`POST /cases/{case}/assessments`) — the
intake flow creates its assessment through the `AssessmentRepositoryInterface`
directly (`UnifiedIntakeSheetService::finalizeAssessment`), never through
`AssessmentService`. Guarding `AssessmentService::create()` therefore blocks
exactly the standalone endpoint the plan's table names, without touching
intake draft creation (§5 row 1, which must stay unblocked).

**Not implemented, and not planned as code:** the GL row (guarantee letters
don't exist in this codebase) and the "expose `watcher_status.blocking` on
case/intake-draft creation" half of row 1 — case creation and intake draft
save already return their normal resource without it; a client can always
fetch `GET cases/{case}/watcher-status` separately. Adding it to those two
creation responses touched more surface (both response shapes, more
call sites) for a UI nicety that isn't a blocking behaviour, so it's left as
optional client-side polish rather than bundled into this phase.

**Reopen and `PUT /cases/{case}` (admission_type changes) needed no code
change** — they were never guarded, "allow" was already the existing
behaviour, and `resolve()`/`status()` are computed fresh on every read, so
there's no stale cache to invalidate when admission_type changes.

**Tests** (`tests/Feature/WatcherEnforcementTest.php`, 13 new): each of the
five guarded transitions blocked on an inpatient case with no watcher, then
unblocked once a primary watcher is registered (close, approve assistance,
store assessment) or once a waiver is filed (close); an OPD case is never
blocked; the full 422 body shape (`message`, `errors.watcher`,
`watcher_status`); and confirmation that reopen and the `admission_type` PUT
never block.

`php artisan test` — 260 passed, 908 assertions (2026-09-09).

---

## 6. API surface (server, Phase 3)

Following the existing route-group and permission conventions in
`routes/api.php`:

```php
Route::middleware('permission:cases.view')->group(function () {
    Route::get('cases/{case}/watchers', [CaseWatcherController::class, 'index']);
    Route::get('cases/{case}/watcher-status', CaseWatcherStatusController::class);
});

Route::middleware('permission:cases.update')->group(function () {
    Route::post('cases/{case}/watchers', [CaseWatcherController::class, 'store']);
    Route::put('case-watchers/{caseWatcher}', [CaseWatcherController::class, 'update']);
    Route::delete('case-watchers/{caseWatcher}', [CaseWatcherController::class, 'destroy']);
    Route::post('case-watchers/{caseWatcher}/promote', PromoteCaseWatcherController::class);
    Route::post('case-watchers/{caseWatcher}/revoke-pass', RevokeWatcherPassController::class);
});

// Waiver is section-head level — its own permission, not cases.update.
Route::middleware('permission:cases.waive_watcher')->group(function () {
    Route::post('cases/{case}/watcher-waiver', StoreWatcherWaiverController::class);
    Route::delete('cases/{case}/watcher-waiver', DestroyWatcherWaiverController::class);
});
```

New pieces, mirroring the existing `PatientWatcher*` stack:
`CaseWatcher` model, `CaseWatcherDto`, `StoreCaseWatcherRequest`,
`UpdateCaseWatcherRequest`, `CaseWatcherResource`, `CaseWatcherService`,
`WatcherRequirementService`, `WatcherPassNumberService`.

`CaseProfileController` gains `watchers` and `watcher_status` on its payload so
the detail view needs no extra round trip.

`POST /cases/{case}/watchers` accepts either `patient_watcher_id` (link an
existing directory entry, snapshotting its fields) or a full inline person
(creates the directory row *and* the case link in one transaction).

### Permissions

- `cases.view` — read watchers
- `cases.update` — add/edit/remove, promote, revoke pass
- `cases.waive_watcher` — **new**, granted to section head only
- Protective cases keep their existing restricted visibility; watcher rows
  inherit the case's visibility, no separate rule.

### Phase 3 implementation notes ☑

**Shipped**, all under the route groups above (no `HasMiddleware` on the
controllers — gated the same way `PatientWatcherController`'s routes already
are, permission middleware on the route group, `authorize()` on every new
Form Request just returns `true`):

- `CaseWatcherDto` — built with the "supplied keys" null-clearing pattern from
  day one (the pattern issue #55 retrofitted onto `AssessmentDto` and
  `PatientFamilyMemberDto`), so `PUT case-watchers/{id}` can clear
  `contact_number`/`address`/`notes`/etc. with an explicit `null` without
  needing a follow-up fix later. `case_id`/`added_by` stay present-only, same
  reasoning as `AssessmentDto`'s `case_id`/`created_by`.
- `StoreCaseWatcherRequest` / `UpdateCaseWatcherRequest` / `CaseWatcherResource`
  / `CaseWatcherController` (index/store/update/destroy).
- `CaseWatcherService::create()` extended to actually do the "accepts either
  `patient_watcher_id` or a full inline person" behaviour from §6: given a
  `patient_watcher_id`, it snapshots that directory row's name/relationship/
  contact/address (request values still win if also supplied); given none, it
  creates the `PatientWatcher` directory row and the `CaseWatcher` link in the
  same transaction. `CaseWatcherService::update()` added for generic field
  edits — deliberately excludes `is_primary` (enforced by
  `UpdateCaseWatcherRequest`'s rules, which just don't declare it), so
  promotion can only ever happen through `promote()`'s atomic demote-then-set.
- `CaseWatcherStatusController` (`GET cases/{case}/watcher-status`),
  `PromoteCaseWatcherController`, `RevokeWatcherPassController`,
  `StoreWatcherWaiverController` + `DestroyWatcherWaiverController` (new
  `WatcherWaiverService`, files/clears the four waiver columns).
- `cases.waive_watcher` added to the permission catalog, granted to `MSS
  Head` (this codebase's closest match to "section head") and implicitly to
  `Admin` via its `['*']` grant. `RolesAndPermissionsTest`'s exact-count
  assertions read `count(RolesAndPermissionsSeeder::PERMISSIONS)` dynamically,
  so adding one didn't need a test update.
- `CaseProfileController` (`GET cases/{case}/profile`) now returns `watchers`
  and `watcher_status`.

**One addition beyond the plan's route list:** `IssueWatcherPassController`
(`POST case-watchers/{caseWatcher}/issue-pass`). The plan lists
`revoke-pass` but never an endpoint to issue one — Phase 8's client notes
describe an "Issue Watcher Pass" button that "actually issues one," which
has nothing to call without this. Mirrors `RevokeWatcherPassController`'s
shape; takes an optional `pass_valid_until`.

**How `watcher_status` avoids becoming a site-wide N+1:** `CaseModelResource`
is reused across ~8 call sites (list rows, `PatientResource::cases`, etc.),
so computing it unconditionally would have added an extra query to every one
of them. It's gated on `$this->whenLoaded('watchers', ...)` instead — true
only when a case was actually eager-loaded with its watchers, which today
only `CaseModelService::profile()` does. (First attempt stashed the computed
value as a dynamic attribute on the Eloquent model instead — reverted before
it shipped: Eloquent's `__set` stores an unrecognised key straight into the
attribute bag, so a later `$case->save()` on that same instance would have
tried to `UPDATE` a `watcher_status` column that doesn't exist.)

**Relationship validation happens twice, deliberately.** `Rule::exists('watcher_relationship_types', 'code')`
in the Form Requests gives a clean 422 with a field-level message for the
common HTTP path. `CaseWatcherService::assertKnownRelationship()` (from
Phase 2) stays as the real backstop — Filament and seeders don't go through
Form Requests at all.

**Tests** (`tests/Feature/CaseWatcherApiTest.php`, 15 new): index, both create
paths (inline person vs. directory link, including that the directory-link
path snapshots fields), relationship rejection, atomic demotion on
create-as-primary, explicit-null clearing on update, `is_primary` ignored on
generic update, blocked vs. allowed removal, promote, issue/revoke pass,
`watcher-status`, profile carrying `watchers`/`watcher_status` while a plain
case read does not, waiver gated on `cases.waive_watcher` specifically (not
`cases.update`), and the 403 without `cases.update` at all.

`php artisan test` — 247 passed, 884 assertions (2026-09-09).

---

## 7. Backfill (server, Phase 5)

`patient_watchers` rows already exist. Do not delete them — they become the
directory. One-time command `mss:backfill-case-watchers`:

1. For each patient with at least one case, take their `patient_watchers` rows.
2. Insert a `case_watchers` row on that patient's **most recent** case,
   copying name/relationship/contact/address, preserving `is_primary`.
3. Set `cases.watcher_legacy_exempt = true` on every case opened before the
   cutover date, so historical cases don't retroactively fail the transition
   guards.
4. `resolve()` returns `Waived` when `watcher_legacy_exempt` is true.

Idempotent, dry-runnable (`--dry-run`), and logged. No data loss; reversible by
truncating `case_watchers` and dropping the flag.

### Phase 5 implementation notes ☑

**Shipped:** `app/Console/Commands/BackfillCaseWatchers.php`
(`mss:backfill-case-watchers {--dry-run} {--before=}`) — the first custom
Artisan command in this codebase (Laravel auto-discovers `app/Console/Commands/`,
so nothing else needed registering it). `--before` sets the cutover date
(`YYYY-MM-DD`, defaults to today); everything from step 2 reuses
`Patient::latestCase()` (Phase 3) to find "most recent case."

**Idempotency mechanism:** step 2 checks for an existing `case_watchers` row
with the same `(case_id, patient_watcher_id)` pair before inserting, so a
second run creates nothing new. Step 3's `UPDATE ... WHERE watcher_legacy_exempt
= false` is naturally idempotent — re-running it against already-exempted
cases is a no-op.

**One gap the plan didn't address, resolved while building it: legacy
`relationship` values don't match the master list.** `patient_watchers.relationship`
has always been free text; `case_watchers.relationship` is meant to be a
`watcher_relationship_types.code`. A caseworker's typed-in "Wife" or "kapatid"
won't match a seeded `code` like `spouse` or `sibling`. Resolved with a
best-effort case-insensitive match against the master list's `code` or
`name`, falling back to `other` when nothing matches (logged either way, so
a data-cleanup pass can find every fallback later via the log). This keeps
the backfill from stalling on a data-quality problem it can't fully resolve
automatically, while not silently guessing wrong.

**One invariant the plan's "preserving `is_primary`" doesn't account for:**
Phase 1's "at most one live primary per case" constraint didn't exist when
the legacy `patient_watchers` rows were created, so a patient could have more
than one `is_primary = true` directory row. Copying all of them onto the same
case verbatim would violate the unique index and abort the command mid-run.
Fixed by keeping `is_primary = true` on only the first such row per patient
(iteration order), demoting the rest — the same "one primary" rule everywhere
else in this feature, just applied to backfill data instead of a live request.

**`added_by`** (required, not nullable) has no real actor for a backfilled
row, so it's set to the case's own `assigned_user_id` — the worker already
responsible for that case is the closest meaningful attribution available,
rather than inventing a "system" user that doesn't otherwise exist in this
app.

**Verified against real MariaDB**, not just SQLite: applied the four watcher
migrations plus the relationship-type seeder to the local dev DB, ran
`--dry-run` against its actual patient/case data (reported real counts with
no errors — the `whereRaw('LOWER(...) = ?')` match and `chunkById` both work
identically to SQLite), then rolled every migration back, leaving the dev DB
exactly as found.

**Tests** (`tests/Feature/BackfillCaseWatchersTest.php`, 8 new): copies onto
the most recent of several cases, demotes a second legacy primary, relationship
fallback and case-insensitive match, skips patients with no case or no
directory watchers, idempotent on a second run, `--dry-run` writes nothing,
cutoff correctly splits legacy vs. current cases, and a legacy-exempt case
resolves to `Waived` end-to-end through `WatcherRequirementService`.

`php artisan test` — 268 passed, 936 assertions (2026-09-09).

---

## 8. Client plan

### Phase 6 — types, API, adapter

- `src/features/cases/types/watcher.types.ts` — new `CaseWatcher`, replacing the
  patient-scoped `Watcher`. Delete the placeholder comment block: `passNo`,
  `validUntil` and `status` now have real backing columns, so they become
  properly typed (`passStatus: "active" | "expired" | "revoked"`).

```ts
export interface CaseWatcher {
  id: string
  caseId: string
  patientWatcherId: string | null
  fullName: string
  relationship: string
  contactNo: string | null
  address: string | null
  isPrimary: boolean
  isInformant: boolean
  passNumber: string | null
  passValidUntil: string | null
  passStatus: "active" | "expired" | "revoked"
  presentFrom: string | null
  presentUntil: string | null
  addedBy: string
  notes: string | null
}

export type WatcherRequirement =
  | "required" | "recommended" | "optional" | "waived"

export interface WatcherStatus {
  requirement: WatcherRequirement
  hasPrimary: boolean
  satisfied: boolean
  blocking: boolean
}
```

- `src/features/cases/api/case-watchers-api.ts` — the six endpoints above,
  following the `patients-api.ts` shape (`ApiEnvelope<T>`, `api-client`).
- `src/features/cases/api/case-watchers-adapter.ts` — `toCaseWatcher()`,
  `toWatcherStatus()`, in the style of `toWatcher()` in `patients-adapter.ts`.
- `src/features/cases/hooks/use-case-watchers.ts` and
  `use-case-watcher-mutations.ts` — TanStack Query, keys `["case", id,
  "watchers"]`, invalidating `["case", id, "profile"]` on every write so the
  banner and the tab never disagree.

### Phase 7 — the tab moves from patient to case

`watchers-tab.tsx` currently lives under `features/patients/components/tabs/`
and reads `patient.watchers`. It moves to `features/cases/components/tabs/` and
reads case watchers.

Table columns: Name · Relationship · Role (Primary / Informant badges) ·
Contact · Pass No. · Valid Until · Status · actions (Promote to primary, Edit,
Revoke pass, Remove).

The "Issue Watcher Pass" button stays but now actually issues one — the pass
number comes back from the server, it is not typed by the user.

`watcher-dialog.tsx` moves alongside and gains:

- A **directory picker** at the top: "Select from known contacts" listing the
  patient's `patient_watchers`, pre-filling the form on select. Falls back to
  blank entry for a new person.
- Relationship as a `Select` off reference data, not a text input.
- `isPrimary` / `isInformant` switches.
- Optional `presentFrom` / `presentUntil`.

On the patient detail view, the old Watchers tab becomes a read-only
**"Known contacts"** list — the directory — with a note that watchers are
assigned per episode.

### Phase 8 — requirement UI

**Banner** at the top of the case detail view, driven by `watcher_status`:

| requirement | hasPrimary | Banner |
|---|---|---|
| `required` | false | destructive — "This inpatient case requires a registered watcher. Assessment, assistance approval and case closing are blocked until one is added or a waiver is filed." |
| `required` | true | none |
| `recommended` | false | warning — "No watcher recorded. Recommended for ER cases." |
| `optional` | either | none |
| `waived` | either | muted — "Watcher requirement waived: {reason} — {waivedBy}, {waivedAt}." |

**Waiver dialog** — visible only when the user holds `cases.waive_watcher`.
Reason `Select` (the six enum values), required free-text note when `other`,
confirmation step. Filing a waiver clears the destructive banner and writes to
the audit trail.

**Optimistic guard** — buttons for the blocked actions (Submit intake, Save
assessment, Approve assistance, Close case) render `disabled` with a tooltip
when `blocking` is true, rather than letting the user hit a 422. The 422 handler
stays as the real gate, since `watcher_status` in cache can be stale.

**Worklist filter** — a "Missing watcher" filter on the case list and sidebar.
This is the piece the section head will actually use day to day: server-side
`?watcher_blocking=1`, computed with a `whereDoesntHave('watchers', ...)` scope
combined with the admission-type predicate. More useful than any hard error at
intake.

---

## 9. Test plan

Pest, following the existing `tests/Feature` layout.

**Resolver unit tests** — the truth table: {inpatient, ER, ER-converted, OPD} ×
{adult, minor, incapacitated} × {waived, not waived} × {legacy exempt}.

**Invariant tests**
- Two primaries on one case → rejected at DB and service level.
- Promoting a second watcher demotes the first in one transaction.
- Removing the last primary on a REQUIRED case → 422.
- Removing the last primary on an OPD case → 204.
- Pass numbers never reused after revocation.

**Transition tests** — each row of the §5 table, both the blocked path (422 with
the `watcher_status` body) and the waived path (success).

**Backfill test** — seeded legacy data, run the command twice, assert
idempotency and that legacy cases resolve to `Waived`.

**Client** — no test runner is configured in `zcmc_mswd_client`, so Phase 6–8
verification is `npm run typecheck` plus manual walkthrough of: inpatient case
with no watcher (banner + disabled actions), add watcher (banner clears),
remove it (blocked), file waiver (banner changes), OPD case (no banner).

---

## 10. Open items

- **`is_incapacitated`** on `patients` shipped in Phase 2 (nullable, defaults
  unknown/false). Still open: whether the intake sheet should carry a field
  for it, or whether MSS infers it from the case narrative — a client-side
  (Phase 6+) workflow question, not resolved by the column existing.
- ~~`converted_to_admission` on `cases` is new...~~ **Resolved in Phase 2:**
  checked the code — `admission_type` is a plain mutable field
  (`UpdateCaseModelRequest`, no enum constraint), so ER→inpatient conversion
  is a field change, not a new case. Dropped the flag; a converted case's
  `admission_type` is just `'inpatient'` by the time `resolve()` sees it.
- **Pass number format.** Guarantee letters use sequential control numbers;
  confirm whether watcher passes share that series, use their own, or are
  physical pre-printed cards whose number is transcribed. Phase 2 shipped
  `WatcherPassNumberService` with its own `PASS-{year}-{seq}` series as a
  placeholder, since GL doesn't exist yet to share a series with — revisit
  once GL is built.
- **A1 / A2 / A3** above.
