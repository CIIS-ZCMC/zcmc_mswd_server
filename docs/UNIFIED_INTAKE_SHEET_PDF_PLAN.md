# Unified Intake Sheet (UIS) — Printable ANNEX B

**Status:** shipped (template) — **historical.** The record-based pipeline described
below (`IntakeSheetPdfController`, `GET /api/intake-sheets/{id}/pdf`, the Filament
Print action, finalize-time archiving) has since been removed. The UIS is now only a
printable rendered from a case, with a print history — see
[`UIS_PRINT_HISTORY_PLAN.md`](UIS_PRINT_HISTORY_PLAN.md). The ANNEX B **layout and the
field → source mapping below still apply**, except that "sheet" fields now come from
the case (printing user = "Interviewed by", print time = interview date/time).

**Scope (at the time):** template-only (no schema, model, Filament, or route/controller change)

## Purpose

The UIS printable must reproduce the official government form **ANNEX B "UNIFIED
INTAKE SHEET"** (bilingual English/Tagalog). The printable pipeline already existed
(`UnifiedIntakeSheetPdfService` → `IntakeSheetPdfController` →
`GET /api/intake-sheets/{intakeSheet}/pdf`, `permission:intake.view`, plus the
Filament **Print** action and finalize-time archiving), but the rendered Blade was a
custom modern redesign. This change rewrites only the Blade so the output matches
ANNEX B.

Fields the system already stores are printed from data. Fields it does **not**
store are rendered as **blank fill-in lines / unchecked boxes**, completed by hand
after printing — matching how the paper form is used.

## Files

- `resources/views/pdf/unified-intake-sheet.blade.php` — the ANNEX B layout,
  reproduced faithfully: letterhead logos (Malasakit Center · DOH · DSWD · PCSO ·
  PhilHealth) + "ANNEX B", the continuous ruled grid, bilingual labels (English
  bold, Tagalog italic), value-over-label rows, boxed checkbox groups (Civil
  Status, Education, House/Light/Water, Problem Presented), the family-composition
  and expenses grids, the client certification + Thumb-Mark box, the 4-column
  Recommendation table (Type / Amount / Mode / Fund Source), and the
  Interviewed-by / Reviewed-&-Approved-by signatures. Self-contained `<style>` —
  does **not** reuse `pdf/partials/_styles.blade.php` (shared by the
  SCSR/case-summary/report PDFs). Amounts print as plain numbers to match the paper
  form. Keeps the draft watermark for non-finalized copies.
- `public/images/intake/{malasakit,doh,dswd,pcso,philhealth}.png` — the official
  letterhead logos, embedded via `public_path()`.
- `app/Services/UnifiedIntakeSheetPdfService.php` — added `assessment.expenses` to
  `RELATIONS` for Section III (no signature change).
- `tests/Feature/UnifiedIntakeSheetPdfTest.php` — HTML-content assertions updated to
  ANNEX B markers; the `%PDF` stream/download and permission tests are unchanged.

## Field → source mapping

| Form field | Source |
|---|---|
| PhilHealth No. | `patient.patientIds` where `id_type` ~ `philhealth` |
| Hospital No. | `patient.hospital_id` |
| Date & Time of Interview | `sheet.date_of_intake` (datetime) |
| Name parts / Sex / DOB | `patient.{last,first,middle,extension}_name`, `sex`, `birthdate` |
| Age | birthdate-derived, else `patient.estimated_age` |
| Place of Birth | `patient.place_of_birth` |
| Permanent / Present Address | `patient.permanent_address` / `present_address` (fallback composed `address`) |
| Civil Status (checkbox) | `patient.civil_status` |
| Religion / Nationality | `patient.religion` / `nationality` (fallback `citizenship`) |
| Highest Educational Attainment (checkbox) | `patient.educational_attainment` |
| Occupation / Monthly Income | `patient.occupation` / `monthly_income` |
| Family Composition rows | `patient.familyMembers` (name, birthdate `y/m/d`, sex, relationship, education, occupation, income) |
| Total Family Income | `assessment.total_family_income` |
| Section III itemized amounts | `assessment.expenses` (`expense_type` keyword → slot) |
| Problem Presented "(Specify)" text | `assessment.presenting_problem` |
| Social Worker's Assessment | `assessment.assessment_notes` (fallback `presenting_problem`) |
| Recommendation Type / Amount | `case.patientAssistances` (`assistantType.name`, `amount`), fallback `assessment.recommended_assistance` / `recommended_amount` |
| Interviewed by | `sheet.intakeWorker.employee_name` |
| Reviewed & Approved by | `sheet.finalizer.employee_name` (blank until finalized) |

## Known blanks (historical)

At the time of this plan the following were not stored and printed as fill-in lines /
unchecked boxes: informant; family-member civil status; other sources of family income +
amount; house/lot owned-vs-rented; light source; water source; problem-presented
checkboxes; recommendation mode of assistance and fund source.

**Since stored** (see [`UIS_MODULE_PLAN.md`](UIS_MODULE_PLAN.md)): house tenure, light/water
source and problem categories (`UIS_EXPENSES_PROBLEMS_PLAN.md`); informant name and
relation, other income sources, family civil status, mode of assistance and fund source
(UIS module phase 1). Still blank by design: informant address/contact (the printable
reuses the patient's present address) and the signature / thumb-mark boxes.
