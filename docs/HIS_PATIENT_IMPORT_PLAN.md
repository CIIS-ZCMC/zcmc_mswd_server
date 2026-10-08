# HIS Patient Import — Plan (client, with one small server phase)

Staff can find a patient from the navbar and, if they aren't in the MSWD registry yet, import them from the
hospital information system (HIS / Bizbox).

- The navbar's **New Patient Intake** button becomes **Search or Import Patient**. The current button does nothing:
  `MainLayout` renders `<Header />` without `onNewIntake`.
- One dialog searches the local registry and HIS together:
  - a patient who is already registered opens their profile
  - a HIS-only patient can be imported, then opens their new profile
- The server already does the import. The client only needs a UI for it:
  - `GET /api/hospital-patients?search=&per_page=` searches HIS by hospital number (`patid`), last name or first name
    (`patients.view`)
  - `POST /api/hospital-patients/{id}/import` creates the local patient, or refreshes it, keyed on `hospital_id`.
    It returns `201` when created and `200` when refreshed, takes an optional `sector_id`, and needs
    `patients.create`. See `ImportHospitalPatientController` and `PatientService::storeFromHospitalPatient()`.
  - `GET /api/patients?search=` already searches `mswd_id`, `hospital_id` and the name fields

Ships as one issue, one branch and one PR (per-plan granularity). The phases below are the order of work inside it.

**Status legend:** ☐ not started · ◐ in progress · ☑ done

| Phase | Side | Depends on | Status |
|-------|------|-----------|--------|
| 1. Make the HIS search payload fit a picker (`local_patient_id`, no transactions) | server | — | ☑ done (#232) |
| 2. Client data layer: types, API functions, query/mutation hooks | client | 1 | ☐ |
| 3. Search or Import dialog | client | 2 | ☐ |
| 4. Navbar wiring: replace the button, keyboard shortcut, permissions | client | 3 | ☐ |
| 5. Docs and verification | both | 4 | ☐ |

---

## Phase 1 — HIS search payload fit for a picker (server)

The picker needs two things the current list endpoint doesn't give it:

1. **Is this HIS patient already registered here?** Without that, every row shows "Import". Importing a registered
   patient again silently overwrites local edits to their name, address, contact number and so on, because
   `storeFromHospitalPatient()` calls `fill()` with the HIS values.
2. **A lean payload.** `HospitalPatientRepository::paginate()` eager-loads `transactions`. The resource exposes them
   with `whenLoaded`, so every search row currently ships the patient's whole encounter list.

Work:

- Add `local_patient_id` (nullable int) to `HospitalPatientResource`:
  - fill it in `HospitalPatientController::index` with one `whereIn('hospital_id', $patids)` query over the page
    (`withTrashed()` excluded; a trashed match counts as "not registered", because import restores it)
  - set the value on each model, or pass a map through the resource. Never run one query per row.
- Remove `transactions` from `paginate()`'s eager load, or add a `with_transactions` flag that defaults to false.
  First grep for callers that depend on it (Filament `HospitalPatientResource` and `ViewHospitalPatient`).
- Update the OpenAPI docs (`HospitalPatientDocs`, `HospitalSchema`) and regenerate `storage/api-docs/api-docs.json`.
- Tests (extend `HospitalPatientAggregateTest`/`HisLookupTest` or a new `HospitalPatientSearchTest`):
  - `local_patient_id` is set for a HIS row whose `patid` matches a local `hospital_id`, and null otherwise
  - a soft-deleted local match gives null
  - the list payload has no `transactions` key
  - the query count is constant whatever the page size (no N+1)

**Notes from the build:**

- `HospitalPatientService::paginate()` sets a `localPatient` relation on every row through
  `attachLocalPatients()`, using one `whereIn('hospital_id', …)` query per page. The resource emits
  `local_patient_id` only when that relation is set. The list therefore always has the key (null when not
  registered), while `show`, `find` and the Filament panel never have it.
- `paginate()` dropped the `transactions` eager load. The Filament browse table (`paginateForPanel()`) only reads
  personal data, so it is unaffected. The view page still loads transactions through `findWithTransactions()`.
- The `local_patient_id` OpenAPI attribute is added in `HospitalSchema`. The committed
  `storage/api-docs/api-docs.json` was already out of date from earlier PRs, so regenerating it would pull about
  3,000 unrelated lines into this phase. It is left for a separate refresh.
- Tests: `tests/Feature/HospitalPatientSearchTest.php`.

> If we'd rather keep the server untouched, the client could cross-reference using `GET /patients?search=<hospital
> number>` per row. That's N extra requests per page, so it isn't recommended.

## Phase 2 — Client data layer

New folder `resources/js/features/hospital/` (it already holds HIS transactions), or a `his-patients` slice inside it:

- **Types** (`types/api.types.ts`): `ApiHospitalPatient`, which mirrors `HospitalPatientResource`:
  - `id`, `hospital_number`, `display_name`, `local_patient_id`
  - optional `personal_data`: names, `sex`, `birthdate`, `permanent_address`, `contact_number`, `civil_status`, and so on
- **API** (`api/hospital-patient-api.ts`):
  - `searchHospitalPatients({ search, page, perPage })` calls `GET /hospital-patients`
  - `importHospitalPatient(id, { sectorId? })` calls `POST /hospital-patients/{id}/import`, returns `ApiPatient` and
    whether it was `created` (from the status code if `apiClient` exposes it; otherwise compare against
    `local_patient_id`)
- **Hooks** (`hooks/use-hospital-patient-search.ts`, `hooks/use-import-hospital-patient.ts`):
  - `useHospitalPatientSearch(term)`:
    - debounced at about 300 ms, enabled only when `term.trim().length >= 2`
    - `keepPreviousData`, `staleTime` about 30 s
    - query key `["hospital-patients", "search", { term, page }]`
  - `useImportHospitalPatient()`:
    - a mutation that, on success, invalidates `PATIENTS_LIST_QUERY_KEY` (sidebar), the HIS search key, and the
      imported patient's `patientDetailKeys(id).profile` (for a refresh)
  - For the local half of the dialog, reuse `listPatients({ search, perPage: 5 })` through a small
    `useRegistryQuickSearch(term)` hook. Don't reuse `usePatients()`, which owns the sidebar's filter state.
- Errors:
  - HIS (SQL Server) unreachable or `5xx`: return a typed error so the UI can say HIS is unavailable and still show
    the registry results
  - `422` on import (`hospital_id` missing): show the server message

## Phase 3 — Search or Import dialog

`resources/js/features/patients/components/dialogs/patient-search-import-dialog.tsx`, built on `dialog.tsx` +
`command.tsx` (Base UI primitives, not Radix).

Layout:

- One search input with autofocus. The placeholder is "Name, hospital no., or MSWD ID".
- **In MSWD Registry**: up to 5 local matches with the name, MSWD ID, hospital no. and classification badge.
  Enter or a click visits `/patients/{id}`, the same way the sidebar does (`router.visit(..., { preserveState: true })`
  and `setSelectedPatientId`).
- **From Hospital (HIS)**: paginated HIS matches with the name, hospital no., sex, birthdate and address.
  - `local_patient_id` set: a "Registered" badge, and the action is **Open**
  - otherwise: the action is **Import**. It shows a spinner while in flight, then a toast ("Imported <name> — MSWD ID
    …") and opens the new profile.
- States:
  - fewer than 2 characters: a hint
  - loading: skeleton rows per section
  - no matches in either: an empty state
  - HIS down: an inline alert in the HIS section only
- Confirm step before import: an inline expand or a small confirmation panel showing the mapped personal data the
  server will copy (`personal_data`). A wrong click then can't create a registry record.
  - Optional **Sector** select, which sends `sector_id`. It's only shown if Open Question 1 is answered "yes".
- Without `patients.create`, the Import action is hidden. Search and Open still work.
- Keyboard: arrow keys move across both sections, Enter runs the row's main action, Esc closes.
- SSR safety: the dialog renders only while open, so there's no `window` access at module scope.

## Phase 4 — Navbar wiring

- `header.tsx`:
  - replace the `Plus` "New Patient Intake" button with a `Search` (or `UserSearch`) icon button labelled
    **Search or Import Patient**, with a `kbd` hint (`Ctrl K`)
  - remove the unused `onNewIntake` prop
- The header owns the dialog's open state, because `MainLayout` mounts `Header` once for every page.
- Global shortcut `Ctrl/Cmd+K` opens the dialog. Follow the `theme-provider.tsx` keydown pattern, and ignore it when
  focus is in an input or textarea. This doesn't clash with the existing `d` theme toggle.
- Show the button to anyone with `patients.view` (`usePermission`). The dialog gates Import on `patients.create`.
- Small screens: the label collapses to the icon below `sm`, with a tooltip.

## Phase 5 — Docs and verification

- Update `CLAUDE.md` (the `patients` / `hospital` feature notes) and this plan's status table and build notes.
- `npm run typecheck && npm run lint && composer test`.
- Manual check with `composer dev`:
  - search a name that exists only in HIS, import it, and confirm it opens and appears in the sidebar
  - search the same patient again and confirm they show "Registered" and the action is Open
  - search by MSWD ID and by hospital no.
  - sign in as a user without `patients.create`: Import is hidden
  - stop or misconfigure the SQL Server connection: the registry results still show, with an HIS alert
  - check SSR first paint of `/` for hydration warnings

---

## Open questions

1. **Sector on import:** should staff pick the sector while importing, or set it later on the profile? The default
   in this plan is "later". The select stays hidden.
2. **Refresh from HIS:** should an already-registered row also offer **Refresh from HIS**? That re-runs the import and
   overwrites local demographic edits. The default is no; Open only.
3. **Manual intake:** is there still a need to create a patient who isn't in HIS (walk-ins without a hospital no.)?
   If so, the dialog's empty state needs a "Register manually" path, which is out of scope here.
4. **Bulk import:** `POST /hospital-patients/import-batch` exists. Is multi-select import in the dialog wanted, or does
   it stay Filament-only? The default is Filament-only.
