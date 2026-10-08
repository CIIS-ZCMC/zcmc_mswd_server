# DOH-MAIFIP Acknowledgement Slip — Plan (server + Inertia SSR client)

Prints **ZCMC-F-MSWD-46 "Acknowledgement Slip"** (Rev. 3, effective Nov 24, 2023), filled in from a MAIFIP guarantee
on a HIS encounter. Staff used to fill it in by hand. The reference scan is `MSS_MAIFIP.pdf`, on US Letter. Ships as one
issue, one branch and one PR.

**Decisions:**
- The form is always DOH-MAIFIP: that box is always ticked, and OPAV-Socio Civic Fund and Others print empty.
- The signer ("Pasyente / Kinatawan ng Pasyente") is the patient's name.
- The approver ("Inaprobahan ni") comes from a new Library list, **Signatories**.
- Timed Started and Ended are optional at print time and are not stored.

**Status legend:** ☐ not started · ◐ in progress · ☑ done

| Phase | Side | Depends on | Status |
|-------|------|-----------|--------|
| 1. Signatories as a Library list (table, API, audit, Filament, Library tab) | both | — | ☑ done |
| 2. Slip PDF (service, template, endpoint, print log, OpenAPI) | server | 1 | ☑ done |
| 3. Client: Print slip on MAIFIP guarantees; the encounter printables entry | client | 2 | ☑ done |
| 4. Docs and verification | both | 3 | ☑ done (#236) |

## Field mapping (one slip per MAIFIP guarantee)

| Slip field | Source |
|---|---|
| Ako si (Pangalan) / Pasyente | Patient `FIRST MIDDLE LAST EXT`, upper-cased |
| Edad | Age at the slip date from `birthdate`, else `estimated_age` (the same rule as the UIS) |
| Kasarian / Katayuang Sibil | `sex` / `civil_status`, upper-cased |
| taga (Tirahan) | `permanent_address`, else `address, barangay, municipality, province` |
| sa sakit na (diyagnosis) | Live HIS encounter: `finaldiagnosis`, then `impression`, then `dischdiagnosis`. If the HIS is unreachable, the case link's snapshot (`final_diagnosis`, then `impression`). Otherwise a blank line. |
| sa halagang Php | `PatientGuarantee::total()`, formatted `1,329.60` |
| para sa | Distinct breakdown Type-of-Assistance names joined with `/`, upper-cased |
| Petsa | `guaranteed_on`, else today, formatted `6-Jan-26` |
| Medical Social Worker | The printing user's `employee_name` |
| Inaprobahan ni | The active `Signatory` with role `allied_health_chief` (name; title upper-cased under it) |
| Hospital Record No. / MSWD # | `patients.hospital_id` / `patients.mswd_id` |
| Timed Started / Ended | `time_started` / `time_ended` (`HH:MM`), printed as `10:49 AM` |

## What was built

- **Signatories:**
  - `signatories` table, the `Signatory` model (Auditable, `ROLES`, `activeFor()`), `SignatorySeeder`, which the
    migration runs and which seeds Dr. Jaime Kristoffer T. Punzalan, MPH
  - `SignatoryController` at `/api/signatories`: reads need sign-in, writes need `library.manage`
  - Filament `SignatoryResource`
  - a "Signatories" tab in the Library (`SignatoriesPanel`)
  - one active signatory per role, enforced by the Form Request and the Filament form
- **Slip:**
  - `AcknowledgementSlipPdfService` (`slip()` maps the fields, `render()`, `recordPrint()`) and
    `resources/views/pdf/acknowledgement-slip.blade.php` (US Letter, one page)
  - `GuaranteeAcknowledgementSlipPdfController` at `GET /api/guarantees/{guarantee}/acknowledgement-slip/pdf`
    (`guarantee.view`; 422 `not_maifip`; `preview`, `download`, `copies`, `remarks`, `time_started`, `time_ended`)
  - the `acknowledgement_slip_print_logs` table and model
  - `Guarantor::isMaifip()`, a name match because guarantors have no code
- **Client:**
  - `AcknowledgementSlipDialog` in `features/guarantees`: guarantee picker, the amount and "para sa" it will print,
    time inputs, copies and remarks, Preview and Print
  - a Print button on each MAIFIP row of `EncounterGuaranteesCard`
  - the WIP `EncounterPrintableDialog`'s `maifip` mode opens this dialog, and its encounter-level `maifip-slip` URL is
    gone

## Printing straight from the HIS (added after review)

Staff asked for the slip when HIS already lists MAIFIP on the encounter's guarantor ledger (psGntrLedgers) but the MSWD
has not recorded its own guarantee. The user chose to print from the HIS entry directly.

- **Endpoint:** `GET /api/patient-transactions/{id}/acknowledgement-slip/pdf`, from
  `EncounterAcknowledgementSlipPdfController` (`guarantee.view`).
  - `?entry=` picks the ledger row (`PK_TRXNO`); otherwise the first MAIFIP row is used.
  - Returns 422 `no_his_maifip` when the encounter has no MAIFIP row, and 503 `his_unreachable` when the HIS is down.
- **Fields:**
  - the amount and date are the ledger row's `amount` and `postdate`
  - HIS records no types of assistance, so "para sa" comes from a single-choice **Type of Assistance dropdown** in the
    dialog, filled from the Library's active types. It's sent as `?assistant_type_ids=3`, validated against
    `assistant_types` and not stored. With no pick, the line stays blank for handwriting. The endpoint accepts a list,
    but the dialog sends one.
  - the patient is the registry record when imported (matched on `hospital_id` = `patid`); otherwise the HIS personal
    data, unsaved
- **Print log:** `patient_guarantee_id` and `patient_id` are nullable, and `his_guarantor_entry_id` was added. Exactly
  one source is set.
- **Dialog:** `AcknowledgementSlipDialog` lists both sources, MSWD records first, then HIS ledger entries.
- **One page:** long values (a HIS diagnosis can run to hundreds of characters) step down in font size. A test keeps a
  very long diagnosis on one page.
- **Fixed on the way:** `GET /api/patient-transactions/{id}/guarantors` returned 500. `PatientGuarantorRepository`
  eager-loaded `account.personalData`, but the relation had been renamed to `guarantor`. The tests mock that repository,
  so they never caught it.

## Notes from the build

- Logos:
  - The ZCMC seal (`public/images/printables/zcmc.png`) is **cropped from the scan at 300 dpi as a placeholder**.
    Replace it with the original file when one is available.
  - The DOH seal reuses the clean `public/images/intake/doh.png`.
- The print-log migration names its indexes explicitly. The generated composite index name is 70 characters, over
  MySQL's 64-character limit. The tests run on SQLite and didn't catch it; the dev MySQL migration did.
- The print log is written by `AcknowledgementSlipPdfService::recordPrint()`. That replaces a separate one-method
  service, a small change from the plan.
- `npm run typecheck` checks nothing, because the root `tsconfig.json` has `"files": []`. Use
  `npx tsc -p tsconfig.app.json --noEmit`. Its baseline errors are `app.tsx`, `ssr.tsx` and `use-auth.ts`, plus an
  unused import in the WIP encounter-detail dialog.
- `storage/api-docs/api-docs.json` is not regenerated; it was already out of date. The new endpoints are documented in
  `app/Http/Docs/SignatoryDocs.php` and `AcknowledgementSlipPdfDocs.php`.

## Verification

- `php artisan test`: 872 passed (23 slip tests, including the HIS source and picked types).
  - `AcknowledgementSlipPdfTest` (14): PDF and one page; print logged, not on preview; download; 422 for non-MAIFIP;
    validation; 403; every field; approver change; impression fallback; snapshot fallback when the HIS throws.
  - `SignatoryCrudTest` (7).
  - Signatory added to `AuditCoverageTest`.
- `npx tsc -p tsconfig.app.json`: no new errors. ESLint is clean on the touched features.
- Rendered with the scan's values and compared side by side with `MSS_MAIFIP.pdf`: same layout and fields, one page.
- Dev MySQL: both migrations applied. `GET /api/signatories` returns the seeded approver.
- **Still to do by hand:**
  - Library → Signatories: edit, deactivate and add.
  - On an encounter, add a MAIFIP guarantee (e.g. Laboratory ₱800 and X-ray ₱529.60).
  - Use the row's Print button → times → Preview, then Print, and check that one log row appears.
  - Print Documents → Acknowledgement Slip from the encounter.
  - A PCSO row shows no Print button.
