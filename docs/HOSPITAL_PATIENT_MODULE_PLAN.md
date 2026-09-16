# MSWD Server — HospitalPatient Module Plan

A dedicated, read-only surface over the Bizbox (HIS) patient master
(`emdPatients`): one place to look up a hospital patient and see, together,
their **personal data** (`psPersonaldata`) and their **transactions**
(`psPatRegisters`, with guarantors). Delivered as an aggregate JSON read and a
Filament browse UI, on top of the read stack the transaction module already
built. Three server phases, each independently verifiable and revertable.

This plan is **written alongside the work**. Phases A and B shipped as their own
PRs (#115, #117); they are recorded here so the module carries the same trail as
the rest of the system, and so Phase C's blocker is written down somewhere other
than a pull request description.

There is no client half. Nothing in `zcmc_mswd_client` consumes these endpoints
yet.

**Status legend:** ☐ not started · ◐ in progress · ☑ done

| Phase | Side | Status |
|-------|------|--------|
| A. Aggregate read — patient + personal data + transactions | server (API) | ☑ done — 487 passed, 2026-09-16 (#115) |
| B. Read-only Filament `HospitalPatientResource` (browse) | server (Filament) | ☑ done — 492 passed, 2026-09-16 (#117) |
| C. Verified HIS columns | server | ☐ blocked — needs the real Bizbox schema |

**Phases A and B are complete. Phase C cannot start until someone dumps the
schema from a machine that reaches the hospital's SQL Server** — the same
blocker the transaction module carries.

---

## Background — what exists today

The transaction module (`TRANSACTION_MODULE_PLAN.md`) mapped five Bizbox tables
and built the read stack the HIS depends on. This module reuses all of it:

| Model | Table | What it is |
|---|---|---|
| `HospitalPatient` | `emdPatients` | The patient master; `patid` is the hospital number |
| `PatientPersonalData` | `psPersonaldata` | Names, sex, birthdate, civil status |
| `PatientTransaction` | `psPatRegisters` | One patient encounter |
| `PatientGuarantors` | `psGntrLedgers` | The guarantor ledger, one row per guarantor per encounter |
| `DataCenter` | `psDataCenter` | Bizbox's entity master |

`HospitalPatient::toPatientAttributes()` is the single seam where the Bizbox
schema is translated onto this app's vocabulary (civil-status code table, gender
normalization, birthdate truncation), so callers never touch raw HIS columns.

### The problem this plan closed

The `emdPatients` stack was built for *other* features — the intake picker
searches it, and `patients.hospital_id` soft-references it. But there was no
single read that returned a HIS patient together with their personal data and
transactions, and no place in the panel to browse the master at all. A social
worker could only see HIS visits indirectly, as a "Hospital visits" section on a
*local* patient record, and only for patients already registered locally.

### The problem this plan does *not* close

Almost every column beyond the proven set is still unknown. See the constraint
below. Phase C.

---

## The constraint that shapes this module

**The Bizbox database is not reachable from a development machine.**
`SQLSRV_DATABASE` is blank in `.env`; no test may touch the `sqlsrv` connection.

This is load-bearing for the Filament resource in a way it is not for a normal
one, because **Filament tables and infolists build their own queries against the
model's connection.** A resource bound directly to `HospitalPatient` would run a
`sqlsrv` query on every list render — and throw on every dev machine and any
time production's HIS blinks.

Two consequences, both load-bearing:

- **Reads route through the services, never Filament's default Eloquent query.**
  The list uses Filament's custom-data table (`records()`) fed by
  `HospitalPatientService::paginateForPanel()`, which wraps the query in
  `try/catch (QueryException)` and returns an empty page — the same resilience
  `PatientTransactionService::forHospitalNumber()` established. A down HIS
  renders an empty table, not a 500.
- **Every test mocks the repository interfaces.** Bizbox models are built with
  `forceFill()` + `setRelation()`; no test reaches the `sqlsrv` connection.

`whenHas()`/`whenLoaded()` in the HIS resources remain the safety net for
unknown columns — a column that does not exist is omitted rather than raising.

### Decisions taken

1. **Read-only, enforced structurally.** The Filament resource has no form and
   returns `false` from `canCreate/canEdit/canDelete/canDeleteAny`; only `index`
   and `view` pages are registered. Mirrors the read-only HIS repository
   interfaces, which do not extend `RepositoryInterface`.
2. **A separate permission ability.** Gated on `hospital-patients.view`, not
   `patients.*` — browsing the raw HIS master is a distinct capability from
   managing local patients. Seeded into `MSS Head`, `Supervisor`,
   `Case Manager`, `Processor` (`Admin` via `*`).
3. **Personal data is mapped, not `whenHas`-guessed.** The API resource sources
   personal data from the `personalData` relation via `toPatientAttributes()`.
   The previous `whenHas` on the `emdPatients` model emitted nothing, because
   those columns live on `psPersonaldata`.
4. **The view page resolves through the service.** `ViewHospitalPatient`
   overrides `resolveRecord()` to call `findWithTransactions()`, eager-loading
   personal data and transactions in one read and keeping the page off the raw
   `sqlsrv` route binding (so it is testable with the repository mocked).

---

## §A — Aggregate read (API) ☑

Shipped in #115. `GET /api/hospital-patients/{id}` returns the patient, their
personal data, and their transactions (+guarantors) in one payload.

**§A.1 — The aggregate loader.** `HospitalPatientRepository::findWithTransactions()`
(+ interface) eager-loads `personalData` and
`transactions.guarantors.account.personalData`; exposed through
`HospitalPatientService` (throws `ModelNotFoundException` on a miss, like `find()`).

**§A.2 — Shape.** `HospitalPatientResource` reads names/sex/birthdate/civil
status from the `personalData` relation via `toPatientAttributes()`, adds
`display_name` and `hospital_number`, and nests `transactions` with
`whenLoaded`.

**§A.3 — The ordering fix (was §C.1).** `HospitalPatientRepository::paginate()`
ordered by `last_name`, a `psPersonaldata` column absent on `emdPatients`, which
would have errored against the real DB. It now eager-loads `personalData` and
orders by `PK_emdPatients` desc. Not blocked, so it shipped here.

**§A.4 — Tests.** Repository-mocked: nested payload, empty-transactions patient
(empty array, not an error), 404, forbidden, unauthenticated.

---

## §B — Read-only Filament resource ☑

Shipped in #117. A "Hospital Patients (HIS)" entry in the panel — searchable
list, detail view with Personal data + Transactions sections.

**§B.1 — The resource.** `HospitalPatientResource`, `$model = HospitalPatient`,
nav group "Patients". Read-only (see Decision 1). Gated on `hospital-patients.view`.

**§B.2 — The list survives an unreachable HIS.** Custom-data table (`records()`)
fed by `HospitalPatientService::paginateForPanel(search, perPage, page)`, which
try/catches `QueryException` → empty page. `paginate()` gained an optional
explicit `page` argument (backward compatible) so the custom-data table can drive
pagination. The name column is searchable; the term flows to the service.

**§B.3 — The view reads the loaded relations.** `ViewHospitalPatient::resolveRecord()`
calls `findWithTransactions()`; the infolist renders personal data and a
transactions repeater straight from the eager-loaded relations — no second HIS
round-trip — reusing the guarantor-name mapping proven on the local patient's
"Hospital visits" section. The repeater read is wrapped defensively so a stray
lazy-load against a down HIS degrades to no rows.

**§B.4 — Tests.** Filament/Livewire with the repository mocked: permission
gating + read-only, list via the resilient service, an empty list on a HIS
outage, the view showing personal data + transactions, and an empty-transactions
patient. `RolesAndPermissionsTest` updated for the new Processor ability.

---

## §C — Verified HIS columns ☐ blocked

**Blocked on schema access** — the same blocker as the transaction module's §C.

**Unblocking step** — run against a machine that reaches the Bizbox HIS:

```sql
SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME IN ('emdPatients', 'psPersonaldata', 'psPatRegisters', 'psGntrLedgers', 'psDataCenter')
ORDER BY TABLE_NAME, ORDINAL_POSITION;
```

**Scope once unblocked**

- Verified personal-data fields on the resource and the API payload: address,
  contact number, occupation — whichever exist beyond the proven names/sex/
  birthdate/civil status.
- Admission detail on the transaction rows: ward, admission and discharge dates,
  disposition (folds into the transaction module's §C).
- Hospital-number search in the browse list (today the list searches names only;
  the hospital-number typeahead lives on the intake picker).
- Extend the mocked tests with the real column names.

---

## Deferred, deliberately

- **Writing back to the HIS** — out of scope permanently; the module is read-only.
- **A "pull into local patients" action** from the browse view.
  `toPatientAttributes()` already maps an `emdPatients` record onto the local
  `patients` columns, but that is a *write* to the local DB and belongs with the
  intake/registration flow, not this read module.
- **Linking a social case to the transaction that caused it**
  (`cases.his_transaction_id`) — already deferred by the transaction module;
  unchanged here.
