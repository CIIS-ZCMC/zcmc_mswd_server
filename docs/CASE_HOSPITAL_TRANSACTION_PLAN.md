# MSWD Server — Case ↔ Hospital Transaction Plan

Let a social worker / case manager **assess a hospital (HIS) patient
transaction** by attaching it to a local case, freezing a decision-time snapshot
of the encounter, and viewing its guarantors, details and diagnosis. The HIS
encounter itself is never copied into the database — it stays read-live; only the
MSWD-side link + snapshot persist.

**Status legend:** ☐ not started · ◐ in progress · ☑ done

| Phase | Side | Status |
|-------|------|--------|
| A. Case ↔ transaction link, snapshot, attach/detach workflow | server | ☐ |
| B. Transaction-side "assess" action + Diagnostic prefill from HIS | server | ☐ deferred |

**Phase A ships on its own.** Phase B is deferred and depends on
`TRANSACTION_MODULE_PLAN.md` §C verifying the HIS diagnosis columns.

---

## Decision — store or read?

A HIS transaction (`psPatRegisters`) is the hospital's source of truth: read it
**live**, do not duplicate it. What must persist is the **MSWD assessment** of
that encounter — which case it belongs to, who linked it, and a point-in-time
snapshot for audit. This mirrors the patient split already in the codebase:
`patients` is stored locally (linked to HIS by `hospital_id`), while HIS
demographics are read live and imported on demand.

**Confirmed decisions:**
- **Relate to a case:** a transaction **attaches to a case the worker picks**
  (an existing case, or one they create first). A case may carry several
  encounters; an encounter attaches to at most one case.
- **Snapshot:** freeze a **curated** set of HIS fields at attach time (not the
  full resource payload), the way `PatientAssistanceReport.snapshot_json`
  captures a point-in-time record.
- **Diagnosis:** the case's existing per-case **`Diagnostic`** record is
  authoritative; HIS diagnosis is shown as reference only (its columns are
  unverified — `TRANSACTION_MODULE_PLAN.md` §C is blocked on a schema dump).

## Background — what exists today

- `App\Models\Bizbox\PatientTransaction` — read-only (`sqlsrv`, `psPatRegisters`,
  PK `PK_psPatRegisters`, `$guarded=['*']`), with `guarantors` and the lookup
  vocabularies + registry status already wired on `PatientTransactionResource`.
- `CaseModel` links to a **patient** (`patient_id`), never to a transaction. No
  `his_transaction_id` / encounter reference exists anywhere on `cases`,
  `assessments` or `diagnostics`.
- The only HIS↔MSWD bridge is `patients.hospital_id` (= HIS `emdPatients.patid`).
- `PatientTransactionService::forHospitalNumber($hospitalNumber)` already resolves
  a hospital number → HIS patient → that patient's encounters.
- Case sub-records (e.g. `Diagnostic`) are `Auditable` and log a `CaseActivity`
  milestone via `CaseModelService::logMilestone()`.

This phase introduces the **first persisted link** between the two worlds.

---

## Phase A — link, snapshot, attach/detach

### A.1 — Migration: `case_hospital_transactions`
A join row (a case ↔ HIS-encounter link):
- `id`
- `case_id` → FK `cases`, `cascadeOnDelete`
- `his_transaction_id` `unsignedBigInteger` — HIS `PK_psPatRegisters`, **unique**
  (an encounter attaches to at most one case)
- `hospital_id` `unsignedBigInteger` nullable — the encounter's `patid`, for reference/search
- `snapshot` `json` — curated HIS fields frozen at attach time
- `linked_by` → FK `users`, `nullOnDelete`
- `linked_at` `timestamp`
- `timestamps`; index `case_id`

### A.2 — Models
- `App\Models\CaseHospitalTransaction` — `Auditable`; casts `snapshot => 'array'`,
  `linked_at => 'datetime'`; `belongsTo` `case()` + `linkedBy()`;
  `activityOwner()` → `['patient_id' => $this->case?->patient_id, 'case_id' => $this->case_id]`
  (reach through `auditParent('case')`, since a case soft-deletes).
- `CaseModel::hospitalTransactions()` — `hasMany(CaseHospitalTransaction::class)`.

### A.3 — Service: `App\Services\CaseHospitalTransactionService`
`attach(CaseModel $case, int|string $hisTransactionId, User $worker): CaseHospitalTransaction`,
in `DB::transaction`:
1. Resolve the encounter live: `PatientTransactionService::find($hisTransactionId)`
   (loads guarantors + lookups). 404 → `ModelNotFoundException`.
2. **Integrity guards** (throw `ValidationException`):
   - the case's patient must be HIS-linked — `case->patient->hospital_id` not null;
   - the encounter's patient number (`transaction->patient->patid`) must equal
     `case->patient->hospital_id` (no attaching another patient's encounter);
   - if `his_transaction_id` already links to a **different** case → reject;
     if it links to **this** case → return the existing link (idempotent).
3. Build the curated snapshot (A.4), create the link row (`linked_by`, `linked_at`),
   and `CaseModelService::logMilestone($case, $worker, 'hospital_transaction_linked', …)`.

`detach(CaseHospitalTransaction $link, User $worker): void` — delete + log a
`hospital_transaction_unlinked` milestone.

### A.4 — Curated snapshot
Built from the resolved transaction through the existing `PatientTransactionResource`
mapping (one translation point), keeping only:
- `registration_status` (code + label), `registration_date`
- `service_type`, `admission_case_type`, `admission_result`, `membership`,
  `discount`, `hospital_plan`, `transaction_type` (each: id + name)
- `guarantors`: `[ { name, amount } … ]` + `total`
- discharge: `discharge_number`, `discharge_date`
- diagnosis **reference only**: `impression`, `final_diagnosis` (when present)

### A.5 — API (per-action permissions like the patient/case controllers)
- `POST /api/cases/{case}/hospital-transactions` `{ his_transaction_id }` —
  `cases.update`; returns `CaseHospitalTransactionResource` (**201**).
- `GET /api/cases/{case}/hospital-transactions` — `cases.view`; list links.
- `GET /api/case-hospital-transactions/{caseHospitalTransaction}` — `cases.view`;
  the link plus a **live** re-read of the current encounter
  (`PatientTransactionResource`), so guarantors/details/diagnosis are fresh.
- `DELETE /api/case-hospital-transactions/{caseHospitalTransaction}` —
  `cases.update`; detach.
- Resources: `CaseHospitalTransactionResource` (link + snapshot, and
  `whenLoaded` live transaction on the show route).

### A.6 — Filament (case-centric, matches the "worker picks the case" flow)
A **"Hospital encounters"** relation manager on `CaseResource`:
- lists linked encounters (snapshot columns: registry status, service type,
  admission result, guarantor total, linked_at);
- **Attach** action — a searchable `Select` of the case patient's HIS encounters
  via `PatientTransactionService::forHospitalNumber($case->patient->hospital_id)`,
  calling `CaseHospitalTransactionService::attach()`; notifies on success and
  surfaces the integrity-guard messages;
- **Detach** action;
- gated: attach/detach on `cases.update`, visible on `cases.view`.
- Diagnosis is viewed/edited through the **existing** `DiagnosticsRelationManager`
  on the case — unchanged; the snapshot's HIS diagnosis is reference only.

### A.7 — Tests (`tests/Feature/CaseHospitalTransactionTest.php`, Pest, `RefreshDatabase`, mock the HIS repo)
- Attach happy path → link row + curated snapshot + `hospital_transaction_linked` milestone.
- Idempotent: attaching the same encounter to the same case returns the existing link.
- Reject: encounter of a different patient (`patid` ≠ case patient `hospital_id`).
- Reject: case patient with no `hospital_id`.
- Reject: encounter already linked to another case.
- Detach removes the link + logs the milestone.
- API: `POST` 201, `GET` list, `GET {link}` returns a live re-read, `DELETE` detaches; permission gates (`cases.view` / `cases.update`).

### A.8 — Verification
- `php artisan migrate` creates `case_hospital_transactions`.
- `php artisan test --filter=CaseHospitalTransaction` green; full suite stays green
  (current baseline 574 passed).
- Manual: open a case whose patient has a `hospital_id`, attach one of that
  patient's HIS encounters, confirm the snapshot renders and the live re-read
  shows guarantors/details; detach.

---

## Phase B — deferred

- **Transaction-side "assess" action**: from the HIS patient's transactions tab,
  an action that ensures the local `Patient` exists (reusing
  `PatientService::storeFromHospitalPatient()`), lets the worker pick/create a
  case, then attaches — the same `attach()` service, reached from the HIS side.
- **Diagnostic prefill from HIS**: once `TRANSACTION_MODULE_PLAN.md` §C verifies
  `finaldiagnosis`/`impression`, prefill a local `Diagnostic` from the encounter
  at attach time for the worker to confirm/edit.

## Non-goals
- Copying HIS clinical data into the database (diagnosis, guarantors stay read-live).
- Any change to the read-only `PatientTransaction`/Bizbox layer.
- Auto-linking or bulk-linking encounters to cases.
