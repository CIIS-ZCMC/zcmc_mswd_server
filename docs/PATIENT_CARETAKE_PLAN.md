# MSWD Server — Patient Caretake Plan

Server half of the Patient Caretake module: **custody** (who is responsible for a
patient) and **accountability** (who created, updated or deleted patient data).
Five phases, each independently verifiable and revertable.

The client half lives in `zcmc_mswd_client/docs/PATIENT_CARETAKE_PLAN.md`
(Phases 6–9). **Phases 1–5 here ship on their own** — the client keeps working
unchanged throughout, since every change here is additive to the existing
contract. Client phase gates are listed in that document.

**Status legend:** ☐ not started · ◐ in progress · ☑ done

| Phase | Status |
|-------|--------|
| 1. Audit coverage | ☐ |
| 2. Activity ownership columns | ☐ |
| 3. Custody hardening | ☐ |
| 4. Read surfaces | ☐ |
| 5. Tests | ☐ |

---

## Background — what exists today

Both halves of this module are already half-built, independently, and neither is
reachable from the client.

**Custody.** `patient_caretakers` (`patient_id`, `user_id`, `role`,
`assigned_date`, `unassigned_date`, `is_active`, soft deletes) with
`PatientCaretakerController@index/@store`, `UnassignCaretakerController`,
`PatientCaretakerService`, DTO and repository. Eager-loaded by
`PatientService::profile()`.

**Accountability.** The `Auditable` trait (spatie/laravel-activitylog,
`logFillable` + `logOnlyDirty` + `dontSubmitEmptyLogs`, log name = snake_case
class basename) on 10 models. `GET /patients/{patient}/history` and
`GET /cases/{case}/history` merge trails through `PatientService::history()` and
`CaseModelService::history()`, rendered by `ActivityResource`.

### Decisions taken before this plan

1. **Custody stays patient-level.** No `case_id` on `patient_caretakers`. The
   per-episode handler is and remains `cases.assigned_user_id`; a caretaker row
   is a standing stewardship assignment across all of a patient's episodes.
   Handover history for an episode is read from `case_activities`
   (`previous_user_id` → `assigned_user_id`), not from caretakers.
2. **Protective-case activity is hidden, not redacted.** Users without the
   protective permission do not see those rows at all, rather than seeing a
   stub. Chosen for legal safety over audit completeness.
3. **Read/view logging is out of scope.** Only create/update/delete are
   recorded. Phase 2's schema leaves room for it — a view event is an
   `event = 'viewed'` row on the same columns — but nothing in this plan writes
   one.

### The problems this plan closes

1. **Audit coverage is patchy.** 10 of 22 models carry `Auditable`. Nine
   episode-level models that the module must cover do not.
2. **`history()` will not scale to episode reach.** Both `history()` methods
   `pluck()` ids per relation, then build a fan-out of
   `orWhere(subject_type = ? AND subject_id IN (…))` over the unindexed morph
   pair, unpaginated. At 6 subject types this is tolerable; at the ~19 needed
   for full episode reach it is one query per relation plus a 19-branch `OR`,
   returning every row ever written. A cross-patient audit page cannot be built
   on it at all.
3. **No integrity guard on custody.** Nothing prevents two active
   `social_worker` rows on one patient. `is_active` and `unassigned_date` are
   written independently and can disagree.
4. **No reassignment and no reason.** A handover is a `store` plus an unrelated
   `unassign`, with no reason recorded, no link between the two rows, and no
   record of who ended the assignment.
5. **Protective-case activity is ordinary `activity_log` data**, with no flag to
   filter on — `cases.case_type` has no protective value today.

---

## Phase 1 — Audit coverage ☐

Add `use Auditable` to the nine models the module must cover. Purely additive:
the trait only registers model event listeners, changes no schema, no contract
and no existing behaviour.

| Model | Why it is needed |
|-------|------------------|
| `Intervention` | counselling and crisis interventions — core case-note trail |
| `Diagnostic` | case-attached diagnostic records |
| `DiagnosticReport` | uploaded diagnostic files |
| `UnifiedIntakeSheet` | intake status changes, finalisation |
| `AssessmentExpense` | expense lines behind a classification |
| `PatientAssistanceLog` | assistance status transitions |
| `PatientAssistanceReport` | released/voided disbursement records |
| `PatientMerge` | merge and unmerge — the highest-blast-radius patient write |
| `Guarantor` | guarantee-letter counterparties |

Deliberately **not** audited: `User` (identity is UMIS's trail, not MSS's),
`Sector`, `AssistantType`, `InterventionType`, `WatcherRelationshipType`,
`Role`, `Permission` (master data; `roles.manage` already gates them and they
are not patient data).

`CaseActivity` is already an append-only milestone timeline written by
`CaseModelService::logMilestone()` — auditing it would double-record. It is
surfaced in the trail by Phase 4 as a first-class source, not through
`activity_log`.

**Blast radius.** Row volume in `activity_log` rises. `logOnlyDirty` +
`dontSubmitEmptyLogs` keep no-op saves out. No test asserts activity counts
today, so nothing breaks.

**Gate.** `php artisan test` — full suite green.

---

## Phase 2 — Activity ownership columns ☐

The structural change the rest of the module rests on.

### The change

Add nullable `patient_id` and `case_id` to `activity_log`, resolved from the
subject at write time. Every trail read then becomes one indexed query instead
of a fan-out:

| Read | Query |
|------|-------|
| patient trail | `where patient_id = ?` |
| case trail | `where case_id = ?` |
| inline per-record | `where subject_type = ? and subject_id = ?` |
| global audit page | paginated, filtered on indexed columns |

The alternative — a separate `activity_index` join table — is more moving parts
for the same result and needs its own consistency story. The alternative of
keeping the fan-out and adding nine more `orWhere` branches is what this phase
exists to avoid.

### Files

| File | Change |
|------|--------|
| `database/migrations/…_add_ownership_to_activity_log_table.php` | + `patient_id`, `case_id` (both `unsignedBigInteger`, nullable, **no FK** — the log must survive a hard-deleted subject); `index(['patient_id', 'id'])`, `index(['case_id', 'id'])` |
| `app/Models/Activity.php` *(new)* | extends `Spatie\Activitylog\Models\Activity`; `$fillable` += the two columns; `patient()` / `case()` relations; scopes `forPatient`, `forCase`, `forSubject` |
| `config/activitylog.php` | `activity_model` → `App\Models\Activity::class` |
| `app/Models/Concerns/Auditable.php` | + `tapActivity(Activity $activity, string $eventName)`, which calls `$this->activityOwner()` and stamps both columns; + default `activityOwner(): array` returning `['patient_id' => null, 'case_id' => null]` |
| each audited model | override `activityOwner()` per the map below |
| `database/migrations/…_backfill_activity_log_ownership.php` | chunked backfill of existing rows |

### Ownership resolution map

Each model declares its own resolution. A central registry array was rejected —
it drifts the moment a model moves.

| Model | `patient_id` | `case_id` |
|-------|--------------|-----------|
| `Patient` | `$this->id` | — |
| `PatientId` | `patient_id` | — |
| `PatientFamilyMember` | `patient_id` | — |
| `PatientWatcher` | `patient_id` | — |
| `PatientCaretaker` | `patient_id` | — |
| `PatientMerge` | `target_patient_id` | — |
| `CaseModel` | `patient_id` | `$this->id` |
| `CaseWatcher` | `case.patient_id` | `case_id` |
| `Assessment` | `case.patient_id` | `case_id` |
| `AssessmentExpense` | `assessment.case.patient_id` | `assessment.case_id` |
| `Intervention` | `case.patient_id` | `case_id` |
| `Diagnostic` | `case.patient_id` | `case_id` |
| `DiagnosticReport` | `diagnostic.case.patient_id` | `diagnostic.case_id` |
| `PatientAssistance` | `case.patient_id` | `case_id` |
| `PatientAssistanceLog` | `assistance.case.patient_id` | `assistance.case_id` |
| `PatientAssistanceReport` | `assistance.case.patient_id` | `assistance.case_id` |
| `Document` | `patient_id ?? case.patient_id` | `case_id` |
| `UnifiedIntakeSheet` | `patient_id` | `case_id` |
| `Guarantor` | — | — |

Rules the resolvers must follow:

- **Resolve through `withTrashed()`.** On a `deleted` event the parent may
  itself be soft-deleted; the trail must still be attributable.
- **Never throw.** An unresolvable owner stamps `null` and the row still lands.
  A failed resolution must not roll back the business write.
- **Prefer loaded relations.** `Document` reads its own `patient_id` column
  first and only falls back to the case. Nested resolvers
  (`AssessmentExpense`, `DiagnosticReport`, the two assistance children) cost
  one extra query per write; that is acceptable for their write volume and is
  the reason the map keeps nesting to two levels.

### Backfill

Chunk `activity_log` by id, group by `subject_type`, resolve each subject
through its model with `withTrashed()`, and update in batches. Rows whose
subject no longer exists, or whose `subject_type` is unmapped, keep `null` in
both columns — they remain visible in the global log and absent from patient and
case trails, which is correct.

Write it as a migration (not a command) so a fresh deployment and an existing
one converge. It must be idempotent: `whereNull('patient_id')->whereNull('case_id')`.

### Rewrites

`PatientService::history()` and `CaseModelService::history()` drop their
`$subjects` fan-out and become:

```php
Activity::forPatient($patient->id)->with('causer')->latest()->paginate(...)
```

Both endpoints currently return an unpaginated collection. Switching them to a
paginator is a **breaking shape change** for the client, so Phase 2 keeps them
returning `Collection` with a hard `limit`; pagination is introduced on the new
Phase 4 endpoints only, and the old two are left as-is until the client moves.

**Blast radius.** Medium — a schema change plus a backfill over the largest
table in the system. Both `history()` methods change internals but not output
shape. `ActivityResource` is untouched.

**Gate.** `php artisan test`, plus a manual check that a patient's trail count
before and after the backfill matches the old fan-out result for at least one
patient with multiple episodes.

---

## Phase 3 — Custody hardening ☐

Depends on nothing; can run in parallel with 1–2.

### Schema

| Change | Why |
|--------|-----|
| + `assigned_by` (`foreignId`, nullable, → `users`) | who made the assignment — distinct from who holds it |
| + `unassigned_by` (`foreignId`, nullable, → `users`) | who ended it |
| + `reason` (`string`, nullable) | why this assignment was made |
| + `unassigned_reason` (`string`, nullable) | why it ended — the handover note |
| + `replaced_by_id` (`foreignId`, nullable, → `patient_caretakers`) | links a row to the assignment that superseded it, so the chain is readable |
| + generated-column unique guard | at most one active caretaker per patient per role |

Nullable on all of them — existing rows have no such history and must not be
invented.

### The active-caretaker guard

Same pattern as `uniq_case_primary_watcher` in `create_case_watchers_table`: a
stored generated column that collapses to `NULL` for every inactive or
soft-deleted row, under a unique index that ignores `NULL`s.

```php
$activeGuard = match (DB::getDriverName()) {
    'mysql' => "IF(is_active = 1 AND deleted_at IS NULL, CONCAT(patient_id, '-', role), NULL)",
    default => "CASE WHEN is_active = 1 AND deleted_at IS NULL THEN patient_id || '-' || role ELSE NULL END",
};
```

MySQL is production, SQLite is the test driver — the concatenation operator
differs, hence the `match`.

### Data repair, before the index

The unique index cannot be added over inconsistent rows. A repair step in the
same migration, ordered before it:

1. Rows with `unassigned_date` set but `is_active = 1` → set `is_active = 0`.
2. Duplicate active rows per `(patient_id, role)` → keep the one with the
   latest `assigned_date` (id as tiebreak); on the rest set `is_active = 0` and
   `unassigned_date = now()`, leaving `unassigned_reason` null so the repair is
   distinguishable from a real handover.

### Service and endpoints

| File | Change |
|------|--------|
| `app/Services/PatientCaretakerService.php` | + `reassign(PatientCaretaker $current, int $userId, ?string $reason)` — one transaction: stamp `unassigned_date` / `unassigned_by` / `unassigned_reason` and `is_active = false` on the current row, create the replacement, write `replaced_by_id` back. Returns the new row. |
| | `create()` stamps `assigned_by` from the authenticated user |
| | `unassign()` (move the logic out of `UnassignCaretakerController`) stamps `unassigned_by` and accepts `unassigned_reason` |
| `app/Http/Controllers/ReassignCaretakerController.php` *(new)* | `POST /caretakers/{caretaker}/reassign` |
| `app/Http/Requests/ReassignCaretakerRequest.php` *(new)* | `user_id` required + exists; `reason` nullable string max 255 |
| `app/Http/Requests/StorePatientCaretakerRequest.php` | + `reason` |
| `app/Http/Controllers/UnassignCaretakerController.php` | accept an optional `unassigned_reason` body field |
| `app/DTOs/PatientCaretakerDto.php` | + the new fields |
| `app/Http/Resources/PatientCaretakerResource.php` | expose `assigned_by` / `unassigned_by` as `{id, name}` via `whenLoaded`, + reasons, + `replaced_by_id` |
| `routes/api.php` | new route under the existing `permission:patients.update` group |

`PatientCaretaker` already carries `Auditable`, so every custody change also
lands in the trail — with `patient_id` stamped once Phase 2 is in.

**Blast radius.** Medium. The resource gains keys (safe — no
`assertExactJson`/`assertJsonStructure` anywhere in the suite). The unique index
will reject writes that previously succeeded; that is the point, but
`PatientCaretakerService::create()` must catch the violation and throw a
`ValidationException` with a usable message rather than a 500.

**Gate.** `php artisan test`. New tests in Phase 5.

---

## Phase 4 — Read surfaces ☐

Depends on Phases 1–3.

### Protective-case gating — prerequisite

`cases.case_type` is `medical | financial | psychosocial | others` today. There
is no protective flag to filter on, and the Protective Cases module (core module
6) is not built. This phase introduces the **minimum** needed to honour decision
2, no more:

| Change | Note |
|--------|------|
| + `cases.is_protective` (`boolean`, default `false`), indexed | superseded later by the full Protective Cases module; keep it a plain boolean so that module can migrate it into a richer case type without a data rewrite |
| + permission `audit.view` | who may read the global audit log at all |
| + permission `audit.view_protective` | who may see protective-case rows in any trail |

**The rule.** For a user without `audit.view_protective`, every trail read —
patient, case, inline and global — excludes rows whose `case_id` belongs to a
case with `is_protective = true`. Implemented once as a scope on
`App\Models\Activity`, applied in the service layer (not a global scope — Filament
and the backfill must see everything).

**Known residual.** Patient-level rows (demographics, IDs, family members) are
not case-attached and stay visible, so a protective patient's *existence* and
demographic edits remain visible to anyone with `patients.view`. Closing that
belongs to the Protective Cases module, which owns patient-level restriction;
this phase does not pretend to solve it. Record it as a limitation rather than
half-solving it here.

### Endpoints

| Route | Permission | Returns |
|-------|-----------|---------|
| `GET /patients/{patient}/caretake` | `patients.view` | `{ caretakers: { active: [...], history: [...] }, recent_activity: [...] }` — the combined custody + accountability view the Caretake tab renders in one request |
| `GET /activity-log` | `audit.view` | paginated, filtered global log |
| `GET /activity-log?subject_type=&subject_id=` | `audit.view` | the inline per-record drill-down (same endpoint, narrower filter) |

`GET /activity-log` filters: `user_id` (causer), `patient_id`, `case_id`,
`subject_type` (accepts the class basename, as `ActivityResource` already
emits), `event` (`created|updated|deleted`), `date_from`, `date_to`,
`log_name`. Default sort `id desc`. Default page size 25, cap 100.

Existing `GET /patients/{patient}/history` and `GET /cases/{case}/history` stay
exactly as they are — same shape, same route — so nothing on the client breaks
before Phase 6. They pick up the protective filter and the Phase 2 query
rewrite; that is all.

### Files

| File | Change |
|------|--------|
| `app/Http/Controllers/PatientCaretakeController.php` *(new)* | the combined read |
| `app/Http/Controllers/ActivityLogController.php` *(new)* | global + inline |
| `app/Services/ActivityLogService.php` *(new)* | filter/paginate/protective-scope, shared by both controllers and by the two `history()` methods |
| `app/Http/Resources/ActivityResource.php` | + `patient_id`, `case_id`, + `subject_label` (a human string — `"Watcher: Maria Cruz"` — resolved from the subject where it still exists, so the client does not have to reverse-engineer one from `changes`) |
| `database/seeders/PermissionSeeder.php` | + `audit.view`, `audit.view_protective` |
| `routes/api.php` | new routes; `audit.*` group |

**Blast radius.** Additive. One caveat: `ActivityResource` gaining
`subject_label` means resolving the subject per row. Do it as a batched lookup
in `ActivityLogService` (group the page's rows by `subject_type`, one
`whereIn` per type, ~4–6 queries per page) — never per row inside the resource.

**Gate.** `php artisan test`. Manual: hit `GET /activity-log` as a user without
`audit.view_protective` and confirm protective rows are absent.

---

## Phase 5 — Tests ☐

| Area | Cases |
|------|-------|
| Custody guard | second active caretaker for the same patient+role is rejected with a 422, not a 500; a second active caretaker in a *different* role is allowed; a soft-deleted or inactive row does not block a new one |
| Reassign | is atomic (failure leaves the original active); stamps `unassigned_by`, `unassigned_reason`, `replaced_by_id`; the new row is active |
| Data repair | a fixture with a drifted row (`unassigned_date` set, `is_active = 1`) and a duplicate-active pair converges, and the index then applies |
| Ownership resolution | one test per resolver shape: direct (`PatientWatcher`), one-hop (`Assessment`), two-hop (`AssessmentExpense`), fallback (`Document` with and without `patient_id`), and a `deleted` event on a soft-deleted parent |
| Backfill | is idempotent; leaves orphaned rows null; a patient's trail count matches the pre-migration fan-out |
| Protective filter | a user without `audit.view_protective` sees no protective-case rows on all four reads; a user with it sees them |
| Endpoints | `GET /patients/{patient}/caretake` shape; `/activity-log` filters, pagination, and the `audit.view` gate |

**Gate.** `php artisan test` — full suite green, counts recorded in the status
table above.

---

## Out of scope

- **Read/view logging.** Excluded deliberately (decision 3).
- **The Reports tie-in.** Caseload-per-social-worker and staff-activity output
  belong to the Reports module and read from what Phases 2–4 build.
- **Episode-scoped custody.** Excluded by decision 1. If it is ever wanted, it
  is a nullable `case_id` on `patient_caretakers` plus a widened guard — the
  rest of this plan does not need to change.
- **Patient-level protective restriction.** See the residual note in Phase 4.
