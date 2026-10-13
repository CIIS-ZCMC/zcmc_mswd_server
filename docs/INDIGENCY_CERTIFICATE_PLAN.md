# Certificate of Eligibility (Indigency) — Plan (server + Inertia SSR client)

Prints the **"Certificate of Eligibility (Indigency)", Annex A**, for a HIS encounter. A patient brings it to the
Malasakit Center to ask for financial or medical assistance, and it goes with the MAIFIP form. It is the fourth entry in
the encounter Print menus, after UIS, MAIFIP and City Mayor. The reference scan is `MSS_INDIGENCY.pdf`, on US Letter.
It follows the City Mayor slip (`docs/CITY_MAYOR_SLIP_PLAN.md`). Ships as one issue, one branch and one PR.

**Decisions (user):**
- **Issued by:** a Library Signatory with the new `mswd_head` role. Signatories gained a `license_no`, which prints as
  "Licence No.".
- **Classification:** a select in the print dialog, prefilled from the latest assessment of the encounter's linked case
  (the override, else the calculated bracket). It is printed only and not stored.
- **Service availed:** checkboxes for the Library Types of Assistance. They print in upper case, joined with "/", in the
  order ticked (`LABORATORY/X-RAY`).

**Status legend:** ☐ not started · ◐ in progress · ☑ done

| Phase | Side | Status |
|-------|------|--------|
| 1. Signatory `license_no`, `mswd_head` role (migration, API, Filament, Library) | both | ☑ done |
| 2. Certificate PDF: service, template, endpoint, print log `form = indigency`, OpenAPI | server | ☑ done |
| 3. `IndigencyCertificateDialog`; the `indigency` print entry opens it | client | ☑ done |
| 4. Tests, docs, verification | both | ☑ done |

## Field mapping

| Form field | Source |
|---|---|
| Logos (DOH, DSWD, PCSO, PhilHealth) | `public/images/intake/*.png`, shared with the UIS |
| Name of Patient | `AcknowledgementSlipPdfService::patientFor()`: the registry patient when imported, otherwise the HIS personal data |
| Address | `permanent_address`, else address, barangay, municipality and province |
| Classification | `classification` ∈ `A`, `B`, `C1`, `C2`, `C3`, `D`, printed as `{code}-{label}` from `IndigencyCertificatePdfService::CLASSIFICATIONS`. `D` is "Financially Incapable" as on the scan; the other labels are assumptions and easy to change. Blank prints a line. |
| Assistance/service | `assistant_type_ids` (comma-separated): the type names, retired types included |
| from (Agency/Hospital) | Fixed: `ZAMBOANGA CITY MEDICAL CENTER` |
| issued on (Date) | The print date, `j-M-y` (`6-Jan-26`) |
| Issued by / Licence No. | `Signatory::activeFor('mswd_head')`: `name` and `license_no`; blank lines when none is active |

## What was built

- **Endpoint:** `GET /api/patient-transactions/{id}/indigency-certificate/pdf`, from `IndigencyCertificatePdfController`.
  - Requires `guarantee.view`.
  - Returns 503 `his_unreachable` when the HIS is down.
  - Logs unless `preview`; `download=1` downloads.
- **Validation:** `PrintIndigencyCertificateRequest`.
- **Service:** `IndigencyCertificatePdfService` (`certificate()`, `render()`, `recordPrint()`, `CLASSIFICATIONS`) renders
  `resources/views/pdf/indigency-certificate.blade.php`.
- **Print log:** `acknowledgement_slip_print_logs` rows with `form = indigency`.
- **Signatories:**
  - `license_no` column, added by migration `2026_10_17_010000`.
  - `mswd_head` role in `Signatory::ROLES` and the client `SIGNATORY_ROLES`.
  - Editable in Library → Signatories and in Filament.
  - `SignatorySeeder` seeds the MSWD Head from the scan (Criselda A. Palomo, RSW, 0010989), only when the role is empty.
- **Client:**
  - `hospital/components/dialogs/indigency-certificate-dialog.tsx`: the classification select (prefilled), the Type of
    Assistance checkboxes and remarks. It notes when no MSWD Head is active, and previews and prints through
    `openPdfInNewTab`.
  - The `indigency` mode of `EncounterPrintableDialog` hands off to it.
  - The menu item "Certificate of Eligibility (Indigency)" appears in the encounters tab and the encounter detail dialog.

## Verification

- `php artisan test`: 940 pass.
  - `IndigencyCertificatePdfTest` (14) covers:
    - the PDF and its log; preview and download
    - every field; the order picked
    - blank lines; the active Library head
    - the HIS-only fallback
    - validation, 403 and 503
    - one page
  - `SignatoryCrudTest` covers the seeded head and `license_no`.
- `npx tsc -p tsconfig.app.json`: no new errors. ESLint on the touched files: clean. Pint: clean.
- **Rendering:** with the scan's values, compared side by side with `MSS_INDIGENCY.pdf`: same layout, one page.
- Dev MySQL: migration applied, MSWD Head seeded.
- **To do by hand:** Encounter → Print → Certificate of Eligibility (Indigency): check the prefilled classification, tick
  services, Preview, then Print.
