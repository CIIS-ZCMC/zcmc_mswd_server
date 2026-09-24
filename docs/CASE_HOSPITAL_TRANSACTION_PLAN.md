# MSWD Server — Case ↔ Hospital Transaction Plan

Let a social worker / case manager **assess a hospital (HIS) patient
transaction** by attaching it to a local case, freezing a decision-time snapshot
of the encounter, and viewing its guarantors, details and diagnosis. The HIS
encounter itself is never copied into the database — it stays read-live; only the
MSWD-side link + snapshot persist.

**Status legend:** ☐ not started · ◐ in progress · ☑ done

| Phase | Side | Status |
|-------|------|--------|
| A. Case ↔ transaction link, snapshot, attach/detach workflow | server | ☑ done — 583 passed, 2026-09-23 (#140) |
| B.1 Transaction-side "assess" action (attach to an existing case) | server | ☑ done — #142 |
| B.2 Diagnostic prefill from HIS | server | ☑ done — 2026-09-24 |

**Phases A, B.1, B.2 shipped.** B.2 unblocked once the HIS diagnosis columns on
`psPatRegisters` (`finaldiagnosis`, `impression`) were verified against the live
database (see `TRANSACTION_MODULE_PLAN.md` §C).

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

## Phase B.1 — Transaction-side "assess" action

Reach Phase A's `attach()` from the HIS side: standing on a patient's encounter,
a worker picks one of that patient's **existing open cases** and attaches the
encounter to it. No new persistence — this is a second entry point onto the
Phase A service, plus a way to list the candidate cases.

**Confirmed decisions:** entry = **Filament action + API**; case choice = **pick
an existing open case only** (creating a case stays its own flow); **no
auto-import** — the encounter's patient must already be a local `Patient` (it is,
whenever it owns a case).

### B.1.1 — Service (extend `CaseHospitalTransactionService`)
- `localPatientFor(PatientTransaction $transaction): ?Patient` — resolve the
  encounter's patient number (`transaction->patient->patid`) to a local
  `Patient` by `hospital_id` (null when not imported).
- `assignableCasesFor(PatientTransaction $transaction): Collection` — that
  patient's **open/ongoing** cases (`CaseModel::CASELOAD_DEFAULT_STATUSES`),
  newest first; empty when the patient isn't local or has no open case.
- Assessing is then just `attach($case, $transaction->getKey(), $worker)` — its
  existing guards already enforce the patient match and single-case rule.

### B.1.2 — API
- `GET /api/patient-transactions/{id}/cases` — `cases.view`; the open cases the
  encounter can be assessed into (`CaseModelResource` collection). Empty (200,
  `[]`) when the patient isn't local / has no open case — a normal state the UI
  turns into "import the patient and open a case first."
- `POST /api/patient-transactions/{id}/assess` `{ case_id }` — `cases.update`;
  resolves the encounter live and the case, calls `attach()`, returns
  `CaseHospitalTransactionResource` (**201**). Validation: `case_id`
  `required|integer|exists:cases,id`; the `attach()` guards reject a case whose
  patient is not this encounter's patient. Single-action
  `AssessPatientTransactionController` (or two small controllers) with
  per-action permissions.

### B.1.3 — Filament
An **"Assess"** record action on the HIS `PatientTransactionsRelationManager`
(the HospitalPatient view's transactions tab):
- a `Select` of `assignableCasesFor($record)` (labelled `case_code` — patient
  name), required;
- on submit → `attach($case, $record->getKey(), auth()->user())`, notify, and
  surface the integrity-guard messages;
- visible on `cases.update`; when the patient has no open case the select is
  empty with a helper text pointing at case creation.
- (The case-side attach from A.6 is unchanged — this is the mirror surface.)

### B.1.4 — Tests (extend `CaseHospitalTransactionTest.php`)
- `assignableCasesFor` returns only the patient's open/ongoing cases; empty for a
  non-local patient or one with only closed cases.
- `GET /patient-transactions/{id}/cases` lists them; `[]` when none.
- `POST /patient-transactions/{id}/assess` attaches (201) and is idempotent;
  rejects a `case_id` whose patient differs; permission gate (`cases.update`).

### B.1.5 — Verification
- `php artisan test --filter=CaseHospitalTransaction` green; full suite stays green.
- Manual: on a HIS patient whose local record has an open case, the transactions
  tab's **Assess** action lists that case and links the encounter (visible under
  the case's "Hospital encounters" tab).

## Phase B.2 — Diagnostic prefill from HIS ☑

The `psPatRegisters` diagnosis columns were verified against the live database
(2026-09-24): `finaldiagnosis` (authoritative diagnosis) and `impression`
(description) exist; there is no attending-physician or facility column on the
transaction table.

`CaseHospitalTransactionService::attach()` now seeds a local `Diagnostic` (via
`DiagnosticService`) from the encounter on a fresh attach:
- `diagnosis_name` ← `finaldiagnosis` (prefill skipped when blank);
- `diagnosis_description` ← `impression`;
- `diagnosis_date` ← `dischdate` ?? `registrydate` ?? now;
- `attending_physician` / `facility_name` ← null (no such columns).

Guards: skipped when the encounter has no final diagnosis, and when the case
already has a `Diagnostic` of that name (no duplicates, no overwrite) — the local
`Diagnostic` stays authoritative and the worker confirms/edits from there. A
`diagnosis_added` case milestone is logged. Runs only on a fresh attach, so an
idempotent re-attach never double-seeds.

## Non-goals
- Copying HIS clinical data into the database (diagnosis, guarantors stay read-live).
- Any change to the read-only `PatientTransaction`/Bizbox layer.
- Auto-linking or bulk-linking encounters to cases.
