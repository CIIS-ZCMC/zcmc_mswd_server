# MSWD Server — Case Module Rewrite Plan

Extend the Case Module so a case can be opened **per hospital (HIS) encounter** —
especially for in-patients — by carrying the encounter's `transaction_id` directly
on the `cases` row, recording **who opened** the case, snapshotting two HIS fields
at open time, and adding a manual **card colour**.

All changes are **additive**: nothing shipped in #140–#150 (the
`case_hospital_transactions` join table, its service, API and Filament) is removed.
The new `transaction_id` is the case's *primary* encounter for the per-encounter
open flow; the join table remains for multi-encounter linking.

**Status legend:** ☐ not started · ◐ in progress · ☑ done

| Phase | Side | Status |
|-------|------|--------|
| A. Schema — new columns on `cases` + `CardColor` enum | server | ☑ done |
| B. Model / DTO / service — populate + snapshot on open | server | ☑ done |
| C. API + Filament surfaces | server | ☑ done |
| D. Tests + verification | server | ☑ done — 612 passed, 2026-09-25 |

---

## Confirmed decisions

Resolved with the requester before planning:

1. **`created_by`** is **added alongside** `assigned_user_id` — not a rename.
   `assigned_user_id` stays the "who currently handles this case" field that the
   assignment workflow (`AssignCaseController`, `CaseModelService::assign()`,
   `case_reassigned`) and **My Caseload** (`MyCaseloadController`, caseload
   indexes) key off. `created_by` records who *opened* the case and never changes
   on reassignment.
2. **`transaction_id`** is a new **nullable** column on `cases` (the HIS
   `psPatRegisters.PK_psPatRegisters`). One encounter → one case; nullable for
   OPD / walk-in cases that have no encounter. The existing
   `case_hospital_transactions` join table is **kept** as the secondary /
   multi-encounter link.
3. **`admission_type` and `transaction_type`** are **snapshot label strings**,
   frozen at open time from the encounter — no live HIS query on every case read.
   `admission_type` reuses the existing column (populated from the encounter's
   `admission_case_type` name); `transaction_type` is a new string column (the
   encounter's `transaction_type` name).
4. **`card_color`** is a **manual** backed enum (`white`, `green`, `orange`,
   `pink`), defaulting to `white`. Meaning is defined by staff convention; no
   auto-derivation.

## Column mapping (requester's spec → `cases`)

| Requested | Column on `cases` | Notes |
|-----------|-------------------|-------|
| patient_id | `patient_id` | unchanged |
| assigned_user_id → created_by | **`created_by`** (new) | `assigned_user_id` retained; see decision 1 |
| case_code (unique) | `case_code` | unchanged, unique |
| case_type | `case_type` | unchanged |
| priority_level | `priority_level` | unchanged |
| status | `status` | unchanged |
| admission_type ← `admission_case_type` | `admission_type` | existing column; now snapshotted from the encounter |
| date_opened | `date_opened` | unchanged (defaults to now on open) |
| date_closed | `date_closed` | unchanged |
| transaction_id (HIS encounter) | **`transaction_id`** (new, nullable) | `psPatRegisters.PK_psPatRegisters`; per-encounter case |
| transaction_type ← `transaction_type` | **`transaction_type`** (new) | snapshot label string |
| card_color enum | **`card_color`** (new) | white / green / orange / pink, default white |

## Background — what exists today

- `cases` migration (`2026_07_07_081657_create_cases_table.php`) plus additive
  migrations for watcher-waiver, `is_protective`, and caseload indexes.
- `App\Models\CaseModel` — `Auditable`, `SoftDeletes`; `assignedUser()`,
  `patient()`, `hospitalTransactions()` (the join table), `activityOwner()`.
- `App\Models\Bizbox\PatientTransaction` — read-only (`sqlsrv`, `psPatRegisters`,
  PK `PK_psPatRegisters`), with `caseType()` (the `admission_case_type` lookup)
  and `transactionType()` relations; exposed via `PatientTransactionResource`
  as `admission_case_type` and `transaction_type` (each `{ id, name }`).
- `PatientTransactionService::find($id)` resolves an encounter live with its
  lookups eager-loaded (used by `CaseHospitalTransactionService::attach()`).
- `CaseModelService::create()` already defaults `assigned_user_id`, `status`,
  `date_opened`, and generates `case_code`. This is the one hook point for the
  new snapshot logic.
- Read/write surface: `CaseModelDto`, `StoreCaseModelRequest`,
  `UpdateCaseModelRequest`, `CaseModelResource`, `CaseResource` (Filament),
  `CaseSchema` (OpenAPI).

---

## Phase A — schema

### A.1 — Migration `add_transaction_and_card_columns_to_cases_table`
New file `database/migrations/2026_09_25_010000_add_transaction_and_card_columns_to_cases_table.php`:

```php
Schema::table('cases', function (Blueprint $table) {
    // Who opened the case (distinct from assigned_user_id, the current handler).
    $table->foreignId('created_by')->nullable()->after('assigned_user_id')
        ->constrained('users')->nullOnDelete();

    // HIS encounter this case was opened for (psPatRegisters.PK_psPatRegisters).
    // No FK: it lives on the sqlsrv connection. Nullable for OPD / walk-in cases.
    $table->unsignedBigInteger('transaction_id')->nullable()->after('admission_type');

    // Snapshot of the encounter's transaction_type name, frozen at open time.
    $table->string('transaction_type')->nullable()->after('transaction_id');

    // Manual triage colour; see App\Enums\CardColor.
    $table->string('card_color')->default('white')->after('transaction_type');

    $table->index('transaction_id');
    $table->index('created_by');
});
```

- Enum stored as `string()` per `docs/MIGRATIONS.md` convention (cast in the
  model), not a DB `enum()` — keeps future colour additions migration-free.
- `admission_type` is **not** added — it already exists; only its *source*
  changes (Phase B).
- `transaction_id` is indexed but **not unique**: uniqueness (one case per
  encounter) is enforced in the service guard (B.3), consistent with how the
  join table's single-case rule lives in `CaseHospitalTransactionService`.
  *(Open option: add a nullable unique index instead if the DB should enforce it.)*
- `down()` drops the two FKs (`dropConstrainedForeignId`) and the plain columns.

### A.2 — Enum `App\Enums\CardColor`
Backed string enum: `White = 'white'`, `Green = 'green'`, `Orange = 'orange'`,
`Pink = 'pink'`, with a `label()` method and a `values(): array` helper for
validation and Filament options. Mirrors the existing `RegistryStatus` enum style.

---

## Phase B — model, DTO, service

### B.1 — `CaseModel`
- Add to `$fillable`: `created_by`, `transaction_id`, `transaction_type`, `card_color`.
- Cast `card_color => CardColor::class`.
- Relations:
  - `createdBy(): BelongsTo` → `User::class, 'created_by'`.
  - `transaction()` — the live HIS encounter. **Not** an Eloquent `belongsTo`
    (cross-connection); a lazy accessor `hisTransaction()` that calls
    `PatientTransactionService::find($this->transaction_id)` when set, else null.
- `assignedUser()` and `hospitalTransactions()` stay unchanged.

### B.2 — `CaseModelDto`
Add readonly props + `fromArray`/`toArray` entries: `created_by`,
`transaction_id`, `transaction_type`, `card_color`. Keep `array_filter` on
`toArray` so unset values fall through to service defaults.

### B.3 — `CaseModelService::create()`
Extend the existing `DB::transaction` block:
1. `created_by ??= $worker->id` (alongside the existing
   `assigned_user_id ??= $worker->id`).
2. `card_color ??= CardColor::White->value`.
3. **When `transaction_id` is present:**
   - Resolve the encounter live: `PatientTransactionService::find($transactionId)`
     (404 → `ModelNotFoundException`, surfaced as a validation error).
   - Guard: reject if another **non-trashed** case already carries this
     `transaction_id` (one case per encounter) → `ValidationException`.
   - *(Optional integrity guard, matching the join-table service: the encounter's
     patient number must equal `case->patient->hospital_id`.)*
   - Snapshot from the resolved transaction's `PatientTransactionResource` shape
     (single translation point):
     - `admission_type ??=` `admission_case_type['name']`
     - `transaction_type ??=` `transaction_type['name']`
   These only fill when the caller left them blank, so an explicit override wins.
4. Create + log the existing `case_opened` milestone (unchanged).

`update()`, `assign()`, `close()`, `refer()`, `reopen()` are unchanged —
`created_by` is set once at open and never rewritten; `card_color` and the
snapshot fields are editable through the normal update path.

---

## Phase C — API + Filament

### C.1 — Requests
- `StoreCaseModelRequest`: add
  - `transaction_id` → `['nullable', 'integer']`
  - `transaction_type` → `['nullable', 'string', 'max:255']`
  - `card_color` → `['nullable', Rule::enum(CardColor::class)]`
  - `admission_type` → relax from `required` to
    `['required_without:transaction_id', 'string', 'max:255']` (the encounter
    supplies it when a transaction is given).
  - `created_by` is **not** accepted from the client — the service sets it.
- `UpdateCaseModelRequest`: allow `card_color` (and `admission_type`,
  `transaction_type`, `priority_level`, `status` as today) to be edited;
  `transaction_id` and `created_by` are immutable after open (omit from rules).

### C.2 — `CaseModelResource`
Add fields: `created_by`, `transaction_id`, `transaction_type`, `card_color`,
and a `created_by_user` block (`whenLoaded('createdBy')` → `{ id, name }`)
mirroring `assigned_user`. `admission_type` already present.

### C.3 — Filament `CaseResource`
- **Form:** a `card_color` `Select` (options from `CardColor::values()`,
  default white); a `transaction_id` field. Prefer a searchable `Select` of the
  patient's HIS encounters via `PatientTransactionService::forHospitalNumber(...)`
  (reusing the join-table attach UI's pattern) when the patient is HIS-linked,
  falling back to plain nullable input otherwise.
- **Table:** a `card_color` column rendered as a colour badge; optional
  `transaction_type` and `created_by` columns. Keep existing columns.
- Gates unchanged (`cases.create` / `cases.update` / `cases.view`).

### C.4 — OpenAPI (`CaseSchema` + regenerated `api-docs.json`)
Add the four new properties with the `card_color` enum and nullable
`transaction_id` / `transaction_type` / `created_by`.

---

## Phase D — tests + verification

### D.1 — Tests
Extend `tests/Feature/CaseManagementTest.php` (and `CaseFilamentTest.php` where
relevant):
- Opening a case sets `created_by` to the actor and defaults `card_color` to
  `white`; reassignment changes `assigned_user_id` but leaves `created_by`.
- Opening with a `transaction_id` snapshots `admission_type` from the encounter's
  `admission_case_type` and `transaction_type` from the encounter's
  `transaction_type` (mock the HIS repo, as `CaseHospitalTransactionTest` does).
- Explicit `admission_type` / `transaction_type` in the request are **not**
  overwritten by the snapshot.
- Guard: opening a second case for the same `transaction_id` is rejected.
- `card_color` rejects a value outside the enum; accepts each of the four.
- `CaseModelResource` exposes the four new fields.
- Validation: `admission_type` required only when `transaction_id` is absent.

### D.2 — Verification
- `php artisan migrate` adds the columns; `migrate:rollback` cleanly reverses.
- `php artisan test --filter=Case` green; full suite stays green (current
  baseline: 583 passed per the hospital-transaction plan).
- Manual: open an in-patient case from a HIS encounter → `admission_type` and
  `transaction_type` land as the encounter's labels, `card_color` shows white;
  set the colour; confirm reassigning the case leaves `created_by` unchanged.

---

## Non-goals
- Removing or reworking `case_hospital_transactions` (#140–#150) — it stays for
  multi-encounter linking.
- Renaming or retiring `assigned_user_id` or the assignment / caseload workflow.
- Any write to the read-only `PatientTransaction` / Bizbox layer.
- Deriving `card_color` automatically from priority or status.
- Back-filling `created_by` / `transaction_id` on historical cases (both nullable;
  a separate back-fill command can follow if wanted).
