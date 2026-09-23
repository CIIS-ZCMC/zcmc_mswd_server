# MSWD Server — Transaction Module Plan

The Bizbox (HIS) read surfaces: patient transactions, their guarantors, and the
vocabulary that describes them. Three server phases, each independently
verifiable and revertable.

This plan is **written retroactively**. Phases A and B shipped before it existed
(#106, #108); they are recorded here so the module carries the same trail as the
rest of the system, and so Phase C's blocker is written down somewhere other
than a pull request description.

There is no client half. Nothing in `zcmc_mswd_client` consumes these endpoints.

**Status legend:** ☐ not started · ◐ in progress · ☑ done

| Phase | Side | Status |
|-------|------|--------|
| A. HIS guarantor lookup | server | ☑ done — 475 passed, 2026-09-15 (#106) |
| B. PatientTransaction rename + guarantor payload | server | ☑ done — 477 passed, 2026-09-15 (#108) |
| C.1. FK relations to the lookup vocabularies | server | ☑ done — 542 passed, 2026-09-21 |
| C. Verified transaction fields | server | ☐ blocked — needs the real Bizbox schema |

**Phases A and B are complete. Phase C cannot start until someone dumps the
schema from a machine that reaches the hospital's SQL Server. §C.1 is carved out
of it as its own phase because it can ship before that dump — it wires the
lookup relations behind a schema guard, so a wrong column name degrades to a
missing JSON key instead of a 500.**

---

## Background — what exists today

The hospital runs Bizbox on SQL Server. This app reads from it and never writes
to it: `config/database.php` defines an `sqlsrv` connection, and every model
under `app/Models/Bizbox/` guards all attributes.

Five tables are mapped:

| Model | Table | What it is |
|---|---|---|
| `HospitalPatient` | `emdPatients` | The patient master; `patid` is the hospital number |
| `PatientPersonalData` | `psPersonaldata` | Names, sex, birthdate, civil status |
| `PatientTransaction` | `psPatRegisters` | **One patient encounter** |
| `PatientGuarantors` | `psGntrLedgers` | The guarantor ledger, one row per guarantor per encounter |
| `DataCenter` | `psDataCenter` | Bizbox's entity master |

Note that none of the models are named after their tables — a deliberate
divergence, since the Bizbox names are opaque outside Bizbox.

`psDataCenter` is the awkward one: both `emdPatients` and `psPersonaldata` share
its primary key, so `DataCenter::patient()` and `::personalData()` are shared-key
`hasOne`s rather than ordinary foreign-key lookups. A guarantor is an entity in
that master, which is why its *name* lives there and not on the ledger row.

### The problems this plan closed

1. **Guarantors were mapped but unreachable.** `psGntrLedgers` had a model and no
   repository, service, resource or route — the only HIS entity without the
   stack every other one had. A social worker could not see who was guaranteeing
   an admission without opening the HIS UI separately.
2. **The module's vocabulary was split down the middle.** A `psPatRegisters` row
   is an encounter — a *transaction*. `HospitalPatient::transactions()` and
   `PatientGuarantors::transaction()` said so; the service, repository, resource,
   controllers and routes still said "patient register", a name taken literally
   from the Bizbox table and used nowhere else in the domain.

### The problem this plan does *not* close

3. **Almost every column is unknown.** See the constraint below. Phase C.

---

## The constraint that shapes this module

**The Bizbox database is not reachable from a development machine.**
`SQLSRV_DATABASE` is blank in `.env`, and the SQL Server at `127.0.0.1:1433`
holds only `zcmc_uis_db` (`AssessTool`, `DARdb`, `malasakit*`, `SWStaff`).

Exactly three columns of `psPatRegisters` are proven by existing code:
`PK_psPatRegisters`, `FK_emdPatients`, `registrydate`. `psGntrLedgers` proves
only `PK_TRXNO`, `FK_psPatRegisters`, `FK_faCustomers`.

Two consequences, both load-bearing:

- **Every payload is built from the proven set only.** Ward, admission and
  discharge dates, disposition, ledger amounts — all deferred to Phase C.
  Guessing is how you ship `admissiondate` when the column is `admdate`, and the
  failure surfaces in production against a database no test can reach.
- **Every test mocks the repository.** `tests/Feature/IntakeHospitalSearchTest.php`
  established the pattern: bind a fake over the repository interface and build
  Bizbox models with `forceFill()` + `setRelation()`. No test may touch the
  `sqlsrv` connection, because on every machine that runs the suite, it isn't
  there.

`whenHas()` in the HIS resources is the safety net for this — a column that does
not exist is omitted rather than raising. It is a net, not a licence to guess.

### Decisions taken

1. **Read-only, enforced structurally.** The HIS repository interfaces
   deliberately do **not** extend `RepositoryInterface`; there is no create,
   update or delete to call. Models guard every attribute.
2. **No foreign keys to the HIS.** `patients.hospital_id` is a soft reference to
   `emdPatients.patid` and stays that way. Cross-database constraints are not
   available and would be wrong even if they were.
3. **`PatientTransaction`, not bare `Transaction`.** "Transaction" alone reads as
   financial, and Bizbox genuinely uses it that way (`psGntrLedgers`,
   `PK_TRXNO`). The qualified name keeps the encounter sense.
4. **Eager-load guarantors on the single-transaction read only.** See §B.3.

---

## §A — HIS guarantor lookup ☑

Shipped in #106. `GET /patient-transactions/{id}/guarantors`.

**§A.1 — The stack.** `PatientGuarantorRepositoryInterface` +
`PatientGuarantorRepository` (read-only), `PatientGuarantorService`,
`PatientGuarantorResource`, `PatientGuarantorController`.

**§A.2 — A guarantor has no name.** `psGntrLedgers` carries only keys. The name
lives on the linked `psDataCenter` entity, reached via `PatientGuarantors::account()`
→ `DataCenter::personalData`. `DataCenter::displayName()` mirrors
`HospitalPatient::displayName()` and falls back to `'Unnamed guarantor'`.

**§A.3 — No guarantor is not an error.** `forRegistration()` returns an empty
collection; the endpoint answers `200` with an empty `data` array. An admission
with no guarantor is ordinary. Only `find()` on a specific ledger row throws
`ModelNotFoundException`.

**§A.4 — Relations renamed while still unreferenced.**
`PatientTransaction::guarantor()` → `guarantors()` (it is a `hasMany`), and
`PatientGuarantors::guarantors()` → `account()` (a `belongsTo` returning one
entity, so the plural read as the inverse of what it is). Free to do at the time;
nothing referenced them yet.

---

## §B — PatientTransaction rename + guarantor payload ☑

Shipped in #108.

**§B.1 — Nine classes renamed**, `PatientRegister*` → `PatientTransaction*`, via
`git mv` so history follows: model, repository + interface, service, resource,
`PatientTransactionController`, `FindPatientTransactionController`, and the two
form requests.

**§B.2 — Schema identifiers untouched.** `$table = 'psPatRegisters'`,
`$primaryKey = 'PK_psPatRegisters'`, `FK_psPatRegisters`, `FK_emdPatients`.
These are Bizbox's names. Prose referring to `registrydate` still says
"registration date" for the same reason.

Endpoints became `/api/patient-transactions`, with `find` ahead of `{id}` so it
is not shadowed. The Filament field `hospital_patient` became
`hospital_transaction` — it always held a transaction key, never a patient one.

**Why this was safe:** no client consumes these endpoints. `zcmc_mswd_client/src`,
`zcmc_mswd_client/docs` and `documentation/` contain no reference to
`/patient-registers`, and `API_CONTRACT_SYNC_PLAN.md` does not mention them. A
breaking API change on paper only — and the cheapest it will ever be.

**§B.3 — Guarantors nest on a single transaction, in `find()` only.**
`PatientTransactionRepository::find()` eager-loads
`guarantors.account.personalData`; `paginate()` and `search()` deliberately do
not. A list row never shows guarantors, and `search()` feeds a Filament typeahead
where three extra SQL Server round-trips per page would be felt on every
keystroke.

`PatientTransactionResource` uses `whenLoaded('guarantors')`, so the key is
absent rather than empty on the list endpoints — and a test asserts that absence,
so a later stray `with()` cannot silently undo this decision.

---

## §C.1 — FK relations to the lookup vocabularies ☐

`psPatRegisters` carries eleven foreign keys beyond `FK_emdPatients`. Six of the
tables they point at are now mapped as models with their own read stacks
(`app/Models/Bizbox/`, `/api/hospital-*` routes); a seventh, `TransactionType`,
is mapped but has no stack. None of them is reachable from a transaction —
`PatientTransactionResource` already names the relations in `whenLoaded()` calls
and they do not exist, so every one of those keys is silently absent from every
payload.

This phase declares the relations, loads them where they are wanted, and does it
without waiting on §C.

**§C.1.1 — The relation map.** Eight `belongsTo` on `PatientTransaction`, owner
key always explicit so the mapping reads without chasing `$primaryKey`:

| FK column on `psPatRegisters` | Relation | Target model | Target PK |
|---|---|---|---|
| `FK_emdPatients` | `patient()` | `HospitalPatient` | `PK_emdPatients` |
| `FK_mscHospPlan` | `hospitalPlan()` | `HospitalPlan` | `PK_mscHospPlan` |
| `FK_mscDiscounts` | `discount()` | `Discount` | `PK_mscDiscounts` |
| `FK_mscServiceType` | `serviceType()` | `ServiceType` | `PK_mscServiceType` |
| `FK_mscHospCaseTypes` | `caseType()` | `HospitalCaseType` | `PK_mscHospCaseTypes` |
| `FK_mscPHICMemberships` | `membership()` | `Membership` | `PK_mscPHICMemberships` |
| `FK_mscHospTranTypes` | `transactionType()` | `TransactionType` | `PK_mscHospTranTypes` |
| `FK_mscAdmResults` | `admissionResult()` | `AdmissionResult` | `PK_mscAdmResults` |

`patient()` already exists. Three further FK columns — `FK_mscMedSocialService`,
`FK_mscPatientType`, `FK_ASUDischarge` — have no model and stay raw scalars on
the resource; building stacks for them is not in this phase.

**§C.1.2 — `transactionType()`, not `transaction()`.** The resource currently
reads `$this->transaction`. On a class called `PatientTransaction` that name says
"the transaction of this transaction", and `PatientGuarantors::transaction()`
already uses the word for the encounter itself. Same reasoning as decision 3
above: the qualified name is the one that survives contact with Bizbox's
vocabulary.

**§C.1.3 — Eager-loading is the part that can break.** Declaring a relation costs
nothing; no query fires until something loads it, and `whenLoaded()` omits the
key. `with()` is different — it selects the FK column, and a wrong column name is
`Invalid column name` against a database no test can reach.

Per the constraint above, only `PK_psPatRegisters`, `FK_emdPatients` and
`registrydate` are proven. All eight FK names in §C.1.1 are read off Bizbox's own
comments, not off a schema dump. So the loading goes behind a guard on the model:

```php
/** FK column => relation, for the lookup vocabularies. */
public const LOOKUPS = ['FK_mscHospPlan' => 'hospitalPlan', /* ... */];

public function scopeWithLookups($query)
{
    $columns = Cache::rememberForever(
        'bizbox.psPatRegisters.columns',
        fn () => Schema::connection('sqlsrv')->getColumnListing($this->getTable()),
    );

    return $query->with(array_values(array_intersect_key(
        self::LOOKUPS, array_flip($columns),
    )));
}
```

One cached metadata query, and a wrong guess degrades to a missing JSON key
rather than a 500 — the same net `whenHas()` gives the resources, and under the
same rule: a net, not a licence to guess. **When §C lands, delete the scope and
inline a plain `with([...])` of the verified names.**

**§C.1.4 — Where the lookups load.** Extends the §B.3 reasoning from guarantors
to vocabularies:

| Repository method | Lookups | Why |
|---|---|---|
| `find()` | yes | The detail read; already loads `guarantors.account.personalData`. |
| `getByPatientId()` | yes | Feeds the patient transactions tab, which shows per-encounter detail. Cost is per-query, not per-row. |
| `paginate()` | no | A list row shows a name and a date. Add only when a list column needs a vocabulary. |
| `search()` | never | Filament typeahead, one call per keystroke — where extra SQL Server round-trips are felt. |

**§C.1.5 — Resource wiring fixed in the same change.** The relations make four
existing mistakes in `PatientTransactionResource` live, so they are repaired
here: `discounts` renders `HospitalPlanResource` (should be `DiscountResource`);
`transaction_type` renders `HospitalCaseTypeResource` (needs the
`TransactionTypeResource` added by §C.1.6); `admission_result` renders
`HospitalCaseTypeResource` (should be `AdmissionResultResource`); and the key
`sevice_type` is misspelled.

**§C.1.6 — Two asymmetries closed first.** `ServiceType` has a repository,
service, controller and route but no row in the `his_lookups` dataset in
`tests/Feature/HisLookupTest.php` — the one HIS lookup endpoint with no coverage.
`TransactionType` has a model and nothing else, so `transactionType()` would
point at a model with no read stack behind it. Both are prerequisites.

**§C.1.7 — Tests, all mocked.** No test touches `sqlsrv`; `forceFill()` +
`setRelation()` per the established pattern.

- One assertion per lookup that the nested resource appears on `find()`.
- Every lookup key **absent** from `paginate()` and `search()` payloads, the way
  the guarantor absence test locks §B.3 in — so a later stray `with()` cannot
  silently undo §C.1.4.
- A null FK yields a null relation, not a missing model. `whenLoaded()` alone is
  not enough here: `Resource::make(null)` reaches `getKey()` on nothing, so the
  resource routes every lookup through one null-safe private helper.

Six tests in `HospitalPatientAggregateTest`, `HospitalPatientFilamentTest` and
`IntakeHospitalSearchTest` fail on this branch. They fail identically at the
merge-base (verified in a clean worktree at `a127ad0`) and are not caused by this
phase — they turn on `hospital_number` / `hospital_id` and want their own fix.

**Order of work:** §C.1.6 → relations and scope → §C.1.5 → `withLookups()` on the
two methods → tests.

**Considered and deferred:** these are small static vocabularies and each already
has a repository and service, so caching them outright and resolving IDs in the
resource would drop the round-trips to zero. `belongsTo` first — it is the
conventional shape, and it is reversible.

---

## §C — Verified transaction fields ☐ blocked

**Blocked on schema access.** Tracked as #112.

**Unblocking step** — run against a machine that reaches the Bizbox HIS:

```sql
SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME IN ('psPatRegisters', 'psGntrLedgers', 'psDataCenter',
                     'mscAdmResults', 'mscDiscounts', 'mscHospCaseTypes',
                     'mscHospPlan', 'mscHospTranTypes', 'mscPHICMemberships',
                     'mscServiceType')
ORDER BY TABLE_NAME, ORDINAL_POSITION;
```

**Scope once unblocked**

- Admission detail on `PatientTransactionResource`: ward, admission and discharge
  dates, disposition, attending physician — whichever of those exist.
- Ledger detail on `PatientGuarantorResource`: amount, coverage, status.
- Replace `PatientTransaction::scopeWithLookups()` (§C.1.3) with a plain `with()`
  of the verified FK names, and correct any of the eight that the dump disproves.
- Extend the existing mocked tests with the real column names.
- Confirm no N+1 across `guarantors.account.personalData` against a live
  connection by reading the `sqlsrv` query log — the eager-loading in §B.3 is
  structurally right but has never been proven against a real database.

---

## Deferred, deliberately

**Linking a social case to the transaction that caused it.** A case is opened in
response to one admission, and nothing records which. `cases` has no HIS column;
the only tie is `patients.hospital_id`, which returns *every* registration a
patient has ever had. So for any readmitted patient, nothing can say which
admission a case belongs to.

Designed and then set aside in favour of this module: a nullable, unique
`cases.his_transaction_id`, populated from the intake wizard — which already
searches transactions and then discards the ID it picked (`dehydrated(false)`).
One case per admission; a readmission opens a new case.

It is the prerequisite for two further features, neither of which can be built
without it: live encounter detail on a case, and an admission worklist (HIS
transactions with no case yet, so workers open cases from the ward census rather
than typing patients in by hand).

Worth its own plan doc when picked up.
