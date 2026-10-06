# Patient Guarantor Module — Plan (server + Inertia SSR client)

MSWD records **who guarantees a patient's hospital bill** for one hospital encounter, and the **breakdown of where the
money comes from**. Example: MAIFIP ₱3,000 = City Mayor Assistance ₱1,000 + City Council Assistance ₱1,000 +
Congressional ₱1,000. This doc covers the backend and the frontend (Inertia + React SSR) together. It ships as one issue,
one branch and one PR.

**Status legend:** ☐ not started · ◐ in progress · ☑ done

| Phase | Side | Depends on | Status |
|-------|------|-----------|--------|
| 1. Schema: `assistance_sources`, `patient_guarantees`, `patient_guarantee_items`; seeders | server | — | ☑ done |
| 2. Models, permissions, patient merge, audit ownership | server | 1 | ☑ done |
| 3. API: service, requests, routes, resources, OpenAPI; Filament lookup CRUD | server | 2 | ☑ done |
| 4. Client: `features/guarantees` + encounter card and form dialog (SSR-safe) | client | 3 | ☑ done |
| 5. Tests; docs | both | 4 | ☑ done |

**Full module shipped (Phases 1–5).** Notes from the build:

- No repository layer. `PatientGuaranteeService` works on Eloquent directly, the same as the socioeconomic module.
  Encounter lookups go through `PatientTransactionService`.
- `GuarantorSeeder` keys on `name`, because `guarantors` has no `code` column.
- `AuditCoverageTest` and `ActivityOwnershipResolverTest` now cover `PatientGuarantee` and `PatientGuaranteeItem`.
  `RolesAndPermissionsTest` expects the Processor role to have `guarantee.view`.
- `docs/MIGRATIONS.md` was not updated. It is marked as a historical draft that no longer tracks the schema.

## Background

- The only guarantor data today is the **read-only HIS ledger**. `App\Models\Bizbox\PatientGuarantors` reads
  `psGntrLedgers` on the `sqlsrv` connection. `PatientGuarantorController`, `PatientGuarantorService` and
  `PatientGuarantorResource` serve it at `GET /patient-transactions/{id}/guarantors`. The Hospital Encounters tab shows
  it in `hospital-encounter-detail.tsx` and `hospital-encounter-detail-dialog.tsx`. It has no breakdown, and MSWD
  cannot edit it.
- `guarantors` (`App\Models\Guarantor`) is a local lookup (name, address, is_active). It is used by the case-level
  `patient_assistance` and served read-only by `GuarantorController`. It has no seeder and no admin UI.
- HIS encounters are never copied into our database. `case_hospital_transactions` set the pattern: store the HIS key
  `his_transaction_id` (= `psPatRegisters.PK_psPatRegisters`) plus `hospital_id` (= `emdPatients.patid`), and read the
  encounter live.

## Decisions

1. **One record per hospital encounter.** Each record is stored locally with `patient_id` and `his_transaction_id`. An
   encounter can have several guarantors.
2. **Total = sum of the breakdown lines.** It is computed and never typed in or stored, so it cannot drift from the
   lines.
3. **Breakdown sources come from a new managed lookup**, `assistance_sources`. It includes an "Others" source that
   requires a specify text.
4. **The guarantor comes from the existing `guarantors` lookup.** Seed MAIFIP, PCSO and DSWD if they are missing.
5. **Naming.** `PatientGuarantor*` classes already exist for the HIS ledger. The new MSWD records are called
   **guarantees** in code (`PatientGuarantee`, `patient_guarantees`, `guarantee.*` permissions) and
   **"Patient Guarantor"** in the UI.
6. **Patient-owned.** Guarantees are audited, soft-deleted and moved by patient merge/unmerge. There is no FK to cases.

## Phase 1 — Schema

New migrations `database/migrations/2026_10_08_0100xx_*`:

**`assistance_sources`** (lookup)

| Column | Type |
|---|---|
| `id` | id |
| `name` | string |
| `code` | string, unique, nullable |
| `requires_specify` | bool, default false (true for "Others") |
| `is_active` | bool, default true |
| timestamps, soft deletes | |

**`patient_guarantees`** (header)

| Column | Type |
|---|---|
| `patient_id` | FK `patients` |
| `his_transaction_id` | unsignedBigInteger, indexed, **not** unique |
| `hospital_id` | unsignedBigInteger, nullable (encounter's patid, for reference) |
| `guarantor_id` | FK `guarantors` |
| `reference_no` | string, nullable (GL / control no.) |
| `guaranteed_on` | date |
| `remarks` | text, nullable |
| `recorded_by` | FK `users` |
| timestamps, soft deletes; index `(patient_id, his_transaction_id)` | |

**`patient_guarantee_items`** (breakdown lines)

| Column | Type |
|---|---|
| `patient_guarantee_id` | FK `patient_guarantees`, cascadeOnDelete |
| `assistance_source_id` | FK `assistance_sources` |
| `others_specify` | string, nullable |
| `amount` | decimal(12,2) |
| timestamps | |

Seeders use idempotent `firstOrCreate` on `code`, following `WatcherRelationshipTypeSeeder`. Both are registered in
`DatabaseSeeder`:
- `AssistanceSourceSeeder`: City Mayor Assistance, City Council Assistance, Congressional, Senatorial, Governor,
  Others (`requires_specify`).
- `GuarantorSeeder`: MAIFIP, PCSO, DSWD.

## Phase 2 — Models, permissions, merge, audit

- `App\Models\AssistanceSource`: SoftDeletes, `hasMany` items, `boolean` casts.
- `App\Models\PatientGuarantee`:
  - traits: `Auditable`, `SoftDeletes`
  - relations: `belongsTo` patient, guarantor and `recordedBy`; `hasMany items()`
  - `total()` = sum of item amounts; list queries use `withSum('items', 'amount')`
  - `activityOwner()` → `['patient_id' => $this->patient_id, 'case_id' => null]`
- `App\Models\PatientGuaranteeItem`: `Auditable`, `belongsTo` guarantee and source, `amount` cast `decimal:2`. Its
  `activityOwner()` goes through `auditParent('guarantee')`, like `PatientAssistanceLog`.
- `Guarantor`: add `hasMany patientGuarantees()`.
- Permissions:
  - define `guarantee.view|create|update|delete` in `RolesAndPermissionsSeeder` and grant them to roles the same way as
    `socioeconomic.*`
  - add a data migration that creates and grants the permissions on existing installs, in the style of
    `2026_10_01_010000_prune_stale_intake_permissions.php`
- `PatientMergeService`: add `'guarantees' => PatientGuarantee::class` to the reassign map.

## Phase 3 — API

`PatientGuaranteeService` + `PatientGuaranteeRepositoryInterface` / `PatientGuaranteeRepository`, bound in
`RepositoryServiceProvider`.

- **Encounter guard.**
  - Look up the encounter with `PatientTransactionRepositoryInterface::find()`.
  - If it is missing, or its `patient->patid` ≠ `$patient->hospital_id`, throw a 422 `ValidationException`. This
    mirrors `CaseHospitalTransactionService::guard()`.
  - Store `hospital_id` from the encounter.
- **create / update** run in `DB::transaction`. Save the header, then **replace** the items: delete the old ones and
  insert the payload. Lines have no identity of their own.

Requests: `StorePatientGuaranteeRequest` and `UpdatePatientGuaranteeRequest`.
- `guarantor_id`: must exist and be active.
- `his_transaction_id`: required on store, prohibited on update.
- `guaranteed_on`: required date. `reference_no`: nullable, max 255. `remarks`: nullable.
- `items`: required array, at least 1 line.
- `items.*.assistance_source_id`: must exist and be active, and must be distinct within the request.
- `items.*.amount`: required numeric, greater than 0.
- `items.*.others_specify`: required when the source has `requires_specify`.

Routes in `routes/api.php`. Permissions are checked in the controllers, as in the socioeconomic module:

| Method | Path | Permission | Purpose |
|---|---|---|---|
| GET | `patients/{patient}/guarantees?transaction={id}` | `guarantee.view` | list with items, `total` each, `grand_total` |
| POST | `patients/{patient}/guarantees` | `guarantee.create` | create header + lines |
| GET | `guarantees/{guarantee}` | `guarantee.view` | show |
| PUT | `guarantees/{guarantee}` | `guarantee.update` | update header, replace lines |
| DELETE | `guarantees/{guarantee}` | `guarantee.delete` | soft delete |
| GET | `assistance-sources?active=1` | auth | lookup, same shape as `GuarantorController` |

Resources:
- `PatientGuaranteeResource`:

  ```
  { id, patient_id, his_transaction_id, guarantor: {id, name}, reference_no, guaranteed_on, remarks,
    items: [{ id, source: {id, name, requires_specify}, others_specify, amount }],
    total, recorded_by: {id, name}, created_at, updated_at }
  ```

- `AssistanceSourceResource`.

OpenAPI: add `app/Http/Docs/PatientGuaranteeDocs.php`, and add `PatientGuarantee` and `AssistanceSource` schemas to
`app/Http/Docs/Schemas/AssistanceSchema.php`.

Filament (`/admin`): add simple CRUD resources `GuarantorResource` and `AssistanceSourceResource` (name, code, active,
and `requires_specify` for sources) so admins can maintain both lookups.

## Phase 4 — Client (Inertia + React SSR)

### SSR rules
- **Data loads on the client.** No new Inertia page or page props, and `PatientsPageController::show` is unchanged.
  Guarantees load with TanStack Query when an encounter opens, the same way the encounter data does today.
- **Permissions come from props.** Read them from the shared Inertia prop `auth.permissions` (through `usePermission`),
  so the server render and hydration show the same buttons.
- **No browser globals in render.** Nothing touches `window`, `document` or `localStorage` at module scope or during
  render. Dialogs mount their portals only when open.
- **Deterministic formatting.** Format pesos with the existing `peso()` helper (fixed `en-PH` / `PHP`). Format dates from
  the API string; never call `Date.now()` during render.
- **Build check.** `npm run build` must produce both the client and the SSR bundle, and
  `php artisan inertia:start-ssr` must render `Patients/Show` with no errors.

### Feature folder `resources/js/features/guarantees/`
- `types/`: the API shapes (`ApiPatientGuarantee`, `ApiAssistanceSource`) and the view models (`PatientGuarantee`,
  `GuaranteeItem`).
- `api/guarantee-api.ts`: list, show, create, update and delete calls through `lib/api-client.ts`.
- `api/guarantee-adapter.ts`: converts snake_case to camelCase and amounts to numbers, following
  `hospital-transaction-adapter.ts`.
- `hooks/use-guarantees.ts`:
  - `guaranteeKeys.byEncounter(patientId, transactionId)`
  - `useGuarantees`
  - `useCreateGuarantee`, `useUpdateGuarantee` and `useDeleteGuarantee`, which invalidate the encounter key
- `hooks/use-assistance-sources.ts` and `hooks/use-guarantor-options.ts`: active lookups, with a long `staleTime`.
- `components/guarantee-form-dialog.tsx`:
  - fields: guarantor select, reference no., date, remarks
  - **breakdown lines**: source select + amount; an "Others (specify)" input appears when the source requires it;
    add/remove line buttons
  - a live **Total** in the footer, computed from the lines
  - disallow a source that is already used on another line
  - show the server's 422 errors next to the fields
- `components/encounter-guarantees-card.tsx`:
  - a table with columns Guarantor, Reference, Date, Total
  - each row expands to show its breakdown lines
  - a grand total in the card header
  - Add/Edit/Delete buttons shown according to `guarantee.create`, `guarantee.update` and `guarantee.delete`
  - delete asks for confirmation first

### Placement
- Show the card in `features/hospital/components/hospital-encounter-detail.tsx` and in the
  "Guarantors & Financial Assistance" tab of `features/hospital/components/dialogs/hospital-encounter-detail-dialog.tsx`,
  **below** the existing HIS table.
- Rename the headings so the two lists are clearly separate: "Hospital Billing Guarantors (HIS)" for the read-only
  ledger, and "MSWD Patient Guarantors" for the editable records.

## Phase 5 — Tests & docs

`tests/Feature/PatientGuaranteeTest.php` (Pest). The HIS lookup is mocked with the `mockTransactionFind` pattern from
`tests/Feature/CaseHospitalTransactionTest.php`.

- create with 3 lines → 201; `total` = sum of the lines; lines are saved
- validation → 422 for each of:
  - no lines
  - amount ≤ 0
  - duplicate source
  - "Others" without a specify value
  - inactive guarantor
  - `his_transaction_id` sent on update
- the encounter belongs to another patient (patid mismatch) → 422
- update replaces the lines; the new total is correct
- delete soft-deletes the record; it no longer appears in the list
- 403 without each `guarantee.*` permission
- patient merge moves guarantees; unmerge restores them
- the audit activity of the guarantee and its lines is owned by the patient
- `assistance-sources?active=1` hides inactive sources

Docs: add the three tables to `docs/MIGRATIONS.md` and mark the phases ☑ here as they ship.

## Verification

1. `php artisan migrate`, then `php artisan db:seed --class=AssistanceSourceSeeder` and
   `php artisan db:seed --class=GuarantorSeeder`.
2. `npm run typecheck && npm run lint && composer test`.
3. `npm run build`, then `php artisan inertia:start-ssr`. Load `/patients/{id}` and check there are no SSR or hydration
   warnings.
4. `composer dev`. Open a patient → Hospital Encounters → an encounter → add **MAIFIP** with City Mayor ₱1,000, City
   Council ₱1,000 and Congressional ₱1,000. Check that the total shows **₱3,000**, then edit a line, then delete the
   record.
5. In `/admin`, check the CRUD screens for the Guarantor and Assistance Source lookups.
