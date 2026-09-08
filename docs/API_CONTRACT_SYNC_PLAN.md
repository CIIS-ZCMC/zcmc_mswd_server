# MSWD Server — Client/Server Contract Sync Plan

Server half of the phased plan closing the gaps found in the 2026-09-08 audit of
`zcmc_mswd_client` against this repo. Four phases, each independently verifiable
and revertable.

The client half lives in `zcmc_mswd_client/docs/API_CONTRACT_SYNC_PLAN.md`
(Phases 5–8). **Phases 1–4 here ship on their own** — the client keeps working
unchanged throughout, since everything before Phase 4 is additive. Phase 7 on
the client must not land until Phase 4 here is deployed.

**Status legend:** ☐ not started · ◐ in progress · ☑ done

| Phase | Status |
|-------|--------|
| 1. Additive contract fixes | ☑ done — 17 passed, 2026-09-08 |
| 2. `AssessmentDto` null clearing | ☐ |
| 3. Latest-case / latest-assessment read surface | ☐ |
| 4. Relational filters | ☐ |

---

## Background — what the audit found on this side

Every endpoint the client calls exists, and the auth, envelope and pagination
contracts line up. No breaking mismatch. The server-side problems:

1. **Fields the client reads that the API won't accept.** The client adapter
   reads `assessment_notes`, `housing_type`, `utilities_access` and
   `social_functioning`, but neither intake request accepts them. Through the
   intake flow those columns are permanently blank — they can only be set via
   `POST /cases/{case}/assessments` or Filament.
2. **Relations eager-loaded and then discarded.** `UnifiedIntakeSheetResource`
   exposes only `intake_worker_id`, though both `show()` and the repository's
   `$listWith` load `intakeWorker`.
3. **List rows too thin to render.** `GET /intake-sheets` loads only `patient`
   and `intakeWorker`, so `case` / `assessment` are absent on list rows.
   `GET /patients` loads only `sector` (+`cases_count`), so a patient's current
   classification is unreachable without a second round trip per row.
4. **No way to filter patients by classification or intake date.**
   `PatientRepository::$filterable` is `['sector_id', 'sex']`. Two sidebar
   filters on the client have been dead since they were built as a result.
5. **`AssessmentDto` silently ignores explicit nulls**, so no API caller can
   clear an assessment field once set.

---

## Phase 1 — Additive contract fixes ☑

Zero behavioural risk. Nothing existing changes shape.

| File | Change |
|------|--------|
| `app/Http/Requests/StoreUnifiedIntakeSheetRequest.php` | + `assessment.housing_type`, `.utilities_access`, `.social_functioning`, `.assessment_notes` |
| `app/Http/Requests/UpdateUnifiedIntakeSheetRequest.php` | same four rules |
| `app/Http/Resources/UnifiedIntakeSheetResource.php` | + `intake_worker` → `{id, name}` from `employee_name`, `whenLoaded` |
| `app/Repositories/UnifiedIntakeSheetRepository.php` | `$listWith` + `'case'`, `'assessment'` |

`AssessmentDto` and the `assessments` table already carried all four fields —
validation was the only gate. An unruled key is silently dropped by
`validated()` and never reaches the model.

**Tests added** to `tests/Feature/UnifiedIntakeSheetTest.php`:

- `persists the full assessment narrative on create`
- `updates the full assessment narrative on a draft`
- `exposes the intake worker and links the case and assessment on the list`

**Gate:** `php artisan test --filter=UnifiedIntakeSheetTest` — 17 passed, 84 assertions (2026-09-08).

**Revert:** drop the commit. No client code depends on this yet.

---

## Phase 2 — `AssessmentDto` null clearing ☐

The one intentional behaviour change in this plan. Isolated on purpose.

- Rewrite `app/DTOs/AssessmentDto.php` with a supplied-keys set: `fromArray`
  records which keys were present, `toArray` emits exactly those. Drop the
  `array_filter(!== null)`.
- No signature change — the three call sites stay as they are.

**Blast radius.** Only `fromArray` is ever used — `AssessmentController@store`,
`AssessmentController@update`, `UnifiedIntakeSheetDto::fromArray`. Nothing calls
the constructor directly, and Filament writes assessments through Eloquent
without touching the DTO.

| Payload | Today | After |
|---------|-------|-------|
| key absent | not written | not written — same |
| `"assessment_notes": "text"` | written | written — same |
| `"assessment_notes": ""` | written as `""` | written as `""` — same |
| `"assessment_notes": null` | silently dropped | writes `NULL` |

Only the last row moves, and only on `PUT /assessments/{id}` and
`PUT /intake-sheets/{id}`. On create, writing `NULL` and omitting the column
produce the same row, so `store` is unaffected either way.

`case_id` and `created_by` must keep their present-only behaviour, so an update
can never reassign an assessment to another case.

**Gate:** two Pest tests per write path — an omitted key leaves the column
untouched; an explicit `null` clears it. Then
`php artisan test --filter="Assessment|CaseRecords|UnifiedIntakeSheet"`.

**Revert:** single-file revert, no schema or contract impact.

---

## Phase 3 — Latest-case / latest-assessment read surface ☐

Additive. Only `GET /patients` gains keys.

- `app/Models/Patient.php`:
  - `latestCase(): HasOne` → `latestOfMany(['date_opened' => 'max', 'id' => 'max'])`
  - `latestAssessment(): HasOneThrough` → through `CaseModel`,
    `->one()->latestOfMany()` (`HasOneThrough` uses `CanBeOneOfMany` in
    Laravel 12 — verified in vendor)
- `app/Repositories/PatientRepository.php`: `$listWith` →
  `['sector', 'latestCase', 'latestAssessment']`
- `app/Http/Resources/PatientResource.php`: `latest_assessment` via
  `AssessmentResource`; `latest_case` as a **flat lite shape** (`id`,
  `case_code`, `status`, `admission_type`, `date_opened`) — `CaseModelResource`
  nests `PatientResource`, so emitting the full resource would risk
  `patient → case → patient` recursion.

**Blast radius.** `PatientController@index` is the only consumer of the
repository list; Filament's patient table uses `Patient::query()` directly and
is unaffected. Both new keys are `whenLoaded`, so the other ten
`PatientResource` call sites gain nothing. No test in the suite uses
`assertExactJson` or `assertJsonStructure`, so added keys break nothing.

**Cost.** Two extra queries per page, not per row — one-of-many relations
eager-load with a single correlated subquery each. `cases.patient_id` and
`assessments.case_id` are both `foreignId()->constrained()`, so both are indexed.

**Gate:** tests asserting

- `GET /patients` returns both keys
- a soft-deleted case is **not** returned as latest (both `cases` and
  `assessments` use `SoftDeletes`; if the one-of-many subquery doesn't inherit
  the scope, constrain it explicitly)
- tie-break on identical `date_opened` is deterministic
- constant query count regardless of row count

---

## Phase 4 — Relational filters ☐

Depends on Phase 3's relations.

`PatientRepository::applyFilters` override — `BaseRepository::applyFilters` only
does exact `where`, so these two need their own handling:

- `filter[classification]` → `whereHas('latestAssessment', …)` — matches the
  **current** classification, not "ever had"
- `filter[intake_date]` → `whereHas('cases', fn ($q) => $q->whereDate('date_opened', $v))`

Falls through to `parent::applyFilters` for `sector_id` / `sex`.

**Gate:** a test per filter, including one asserting `classification` ignores a
superseded assessment.

**Revert:** safe — nothing sends these params yet.

---

## Verification

Per-phase gates above, then the whole suite: `php artisan test`.

End-to-end with the client (after its Phases 5–8): create an intake with all
four new assessment fields → confirm they render in the Social Case tab → clear
one via `PUT` → confirm it clears → confirm the patient sidebar pages, filters
and classification badges against real data.

## Commit boundaries

Phases 1, 2, 3, 4 as four separate commits.
