# City Mayor Acknowledgement Slip — Plan (server + Inertia SSR client)

Prints **ZCMC-F-MSS-04 "ACKNOWLEDGEMENT SLIP (Medical Assistance)"** (Rev. 4, effective Feb 13, 2023) for a HIS
encounter. It is the "City Mayor" entry of the encounter Print menus, which was disabled until now because it had no
endpoint. The reference scan is `MSS_MAIFIP_CITY_MAYOR.pdf`, on US Letter. It is a different form from the DOH-MAIFIP
slip (`docs/ACKNOWLEDGEMENT_SLIP_PLAN.md`, #237). Ships as one issue, one branch and one PR.

**Decisions (user):**
- **Picked in the print dialog:** the fund, amount and "Para sa" type are chosen at print time and not stored.
- **"Para sa"** takes one or more types, ticked with checkboxes in the dialog. At first it took a single type; the
  user later asked for multiple choice.
- **The fund box is selectable:** City Grant in Aid, DSWD, PCSO, ARMM, or Others with a specify text.
- **The Medical Social Worker block** comes from the printing user's profile: name, License No. and position.

**Status legend:** ☐ not started · ◐ in progress · ☑ done

| Phase | Side | Status |
|-------|------|--------|
| 1. User `license_no` / `position` (migration, API, Filament) | server | ☑ done |
| 2. Slip PDF: service, template, endpoint, print log `form` column, OpenAPI | server | ☑ done |
| 3. `CityMayorSlipDialog`; the `cga` print entry opens it | client | ☑ done |
| 4. Tests, docs, verification | both | ☑ done (#238) |

## Field mapping

| Form field | Source |
|---|---|
| Ako si / Edad / Kasarian / Katayuang Sibil / taga | The registry patient when imported (`hospital_id` = `patid`); otherwise the HIS personal data. This is `AcknowledgementSlipPdfService::patientFor()`. |
| Nakapagtapos ng pag-aaral / Kaarawan / Relihiyon / Trabaho / Sahod | `educational_attainment` / `birthdate` (`m/d/Y`) / `religion` / `occupation` / `monthly_income` |
| Bilang ng myembro | Family members + 1 (the patient); blank for a HIS-only patient |
| sa Sakit | `encounterDiagnosis()`: the HIS final diagnosis, then impression, then discharge diagnosis, then the case-link snapshot |
| tulong na nagmula sa | `fund` ∈ `city_grant` (default), `dswd`, `pcso`, `armm`, `others` plus `fund_other`. The four agencies are listed as on paper (without its brace). |
| sa halagang Php | `amount`, optional; blank prints a line |
| Para sa | The Library's active Types of Assistance in the paper's order (`PAPER_ORDER` by code; Library additions after). Every picked id in `assistant_type_ids` (comma-separated) is ticked and underlined. "Others please specify" is unticked, with a line. Past 10 types the list runs in two columns. |
| Pasyente/Kinatawan / Petsa | The patient's name over the signature line (as on the MAIFIP slip) / the print date (`m/d/Y`) |
| Medical Social Worker | The printing user's `employee_name`, `License No. {license_no}` and `position` |
| Record No. / MSWD # / Time Started / Ended | `hospital_id` / `mswd_id` (`N/A` when none) / optional `time_started`, `time_ended` |

## What was built

- **Endpoint:** `GET /api/patient-transactions/{id}/city-mayor-slip/pdf`, from `CityMayorSlipPdfController`.
  - Requires `guarantee.view`.
  - Returns 503 `his_unreachable` when the HIS is down.
  - Logs unless `preview`; `download=1` downloads.
- **Validation:** `PrintCityMayorSlipRequest`.
- **Service:** `CityMayorSlipPdfService` (`slip()`, `render()`, `recordPrint()`, `FUNDS`, `PAPER_ORDER`) renders
  `resources/views/pdf/city-mayor-slip.blade.php`.
  - It reuses `AcknowledgementSlipPdfService`'s now-public `patientFor()`, `registryPatient()`, `encounterDiagnosis()`
    and `clock()`.
- **Print log:** `acknowledgement_slip_print_logs` gained a `form` column: `maifip` (the default, for existing rows) or
  `city_mayor`.
- **Users:** `license_no` and `position`, added by migration, exposed by the API `UserResource`, and editable in
  Filament → Users.
- **Client:**
  - `hospital/components/dialogs/city-mayor-slip-dialog.tsx`: fund select with an Others text, amount, a Type of
    Assistance checkbox list (multiple), times and remarks. It previews and prints through `openPdfInNewTab`, with errors inline.
  - The `cga` mode of `EncounterPrintableDialog` hands off to it.
  - The menu label is "City Mayor Acknowledgement Slip".

## Verification

- `php artisan test`: all pass. `CityMayorSlipPdfTest` (17) covers:
  - the PDF and the `form = city_mayor` log; preview and download
  - every field, including the MSW license and position, and Others with its text
  - the HIS-only fallback and the paper order
  - validation, 403 and 503
  - one page with a long diagnosis and 17 types
- `npx tsc -p tsconfig.app.json`: no new errors. `npm run lint`: 0 errors.
- **Rendering:**
  - With the scan's values, compared side by side with `MSS_MAIFIP_CITY_MAYOR.pdf`: same layout, one page.
  - Live against the HIS (AKING, #3595965): one page with the long HIS diagnosis shrunk to fit.
- Dev MySQL: both migrations applied.
- **To do by hand:**
  - Filament → Users: set License No. and Position.
  - Encounter → Print → City Mayor Acknowledgement Slip: pick a fund, an amount and a type → Preview, then Print.
