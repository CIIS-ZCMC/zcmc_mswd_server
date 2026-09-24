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
| C. Verified HIS columns | server | ☑ done — 2026-09-24 |

**All phases complete.** §C closed on the same basis as the transaction module's
§C: the `psPatRegisters` names were confirmed against the live database and the
maintainer confirmed the Bizbox model/resource column names are authoritative, so
no full schema dump was needed.

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

## §C — Verified HIS columns ☑

Closed 2026-09-24, on the same footing as the transaction module's §C (the
`psPatRegisters` names confirmed live; the Bizbox model/resource column names
taken as authoritative by the maintainer). What each scope item came to:

- **Personal-data fields** — already surfaced. `HospitalPatient::toPatientAttributes()`
  maps address (`empaddress`→`permanent_address`), contact number
  (`emptelefax`→`contact_number`), occupation, email, citizenship, nationality,
  place of birth and more (added during the HIS→Patient import work). These read
  through the mapper's null-tolerant `array_filter`, the same net `whenHas()` gives
  elsewhere.
- **Admission detail on transaction rows** — folded into the transaction module's
  §C (now complete). The fields that exist on `psPatRegisters` are surfaced;
  ward/admission-date/disposition were never columns.
- **Hospital-number search in the browse list** — **added here.**
  `HospitalPatientRepository::paginate()` now matches `patid` OR the
  personal-data name columns, so the "Hospital Patients (HIS)" list finds a
  patient by hospital number, not just by name.
- **Tests** — a mocked Filament test locks that a hospital-number search term
  reaches the resilient service. The `patid` SQL match itself runs only against
  `sqlsrv`, which the module's constraint keeps out of the suite.

**Not needed after all:** column data types were never dumped — the mapper's
`array_filter` + the resources' `whenHas()`/`whenLoaded()` make them unnecessary.

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
