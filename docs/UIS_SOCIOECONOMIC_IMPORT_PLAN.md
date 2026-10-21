# UIS Socio-economic Import Plan

Let the Unified Intake Sheet take its family income and its section III (living
conditions and expenses) from the patient's List of Expenses, instead of leaving them
blank. Follows `docs/UIS_SNAPSHOT_PLAN.md`.

## Problem

A worker records a patient's expenses on the **Socio-economic tab**
(`patient_socioeconomic_profiles`). The UIS reads them from the **assessment**
(`assessment_expenses` plus columns on `assessments`). Nothing connects the two — on
purpose: the profile module is documented and tested as independent of cases,
assessments and the UIS.

Result, seen on encounter #3349825 (patient Caimor): a profile dated today holds food
₱2,500, transport ₱1,500, house tenure "owned" and total family income ₱30,000, while
the UIS assessment has no expense rows, no tenure and `total_family_income = null`. The
sheet prints blanks.

It is also a dead end, not just a missing link. The intake form
(`intake-assessment-dialog.tsx`) never collects expenses, income, tenure, light or
water, and nothing else in the UI writes `assessment_expenses` (the expense hooks have no
`.tsx` consumer; only the re-assess dialog nests lines). Section III cannot be filled in
from the UI today, and neither can the income that decides the classification.

## Decisions

- **Import from the patient's latest socio-economic record**, at intake and on Refresh,
  rather than adding the fields to the intake form. Workers already enter this data once;
  a second set of fields would drift from it.
- The dependency runs one way: **the UIS reads the profile; the profile module never
  reads the UIS.** That keeps `SocioeconomicProfileTest`'s independence test valid — it
  checks the profile module's own files (`app/Models/PatientSocioeconomicProfile.php`,
  its services, `FamilyIncome`, its controllers and requests) for `Assessment`, `CaseModel`
  and `CalculateMswdClassificationAction`. The importer therefore lives in its own file
  outside that list, and the profile model's docblock is reworded without those words.
- **Refresh replaces, intake fills.** On Refresh the imported values overwrite the
  assessment's own income, living conditions and expense lines (it is "refresh from the
  patient record"; the dialog says so). At intake, anything the request already supplies
  wins and the import only fills what it left out.
- **No backfill.** The earlier snapshot backfill froze today's patient data onto old
  intakes; doing the same for expenses would stamp today's figures onto past encounters.
  Existing intakes pick the record up when a worker presses Refresh.
- If the patient has **no** socio-economic record, nothing is imported and nothing is
  cleared — the assessment keeps whatever it has. The same holds field by field: a value the
  record does not hold is left out of the import rather than nulled, and a record with **no
  expense items** leaves the assessment's expense lines alone on Refresh, so a refresh never
  wipes figures a worker entered with nothing to replace them.

## Mapping

The latest record is the newest by `(recorded_on, id)`, soft-deleted excluded — the same
rule `PatientSocioeconomicService::overview()` uses for `current`.

| Profile | Assessment |
| --- | --- |
| `house_tenure` | `house_tenure` (same vocabulary: owned, rented) |
| `light_source[]`, `water_source[]` | `light_source[]`, `water_source[]` (same vocabularies) |
| `total_family_income` | `total_family_income` |
| `other_income_sources[]` `{source, amount}` | `other_income_sources[]` (same shape) |
| `house_rent_amount`, only when tenure is `rented` | expense line `House rent` |
| `food` | expense line `Food` |
| `transport` | expense line `Transportation` |
| `medical` | expense line `Medical` |
| `insurance` | expense line `Insurance` |
| `education` | expense line `Education` |
| `clothing` | expense line `Clothing` |
| `house_help` | expense line `House help` |
| `others` + `others_specify` | expense line `Others: {specify}`, or `Others` without one |

- A blank item produces no line, so its slot stays blank on the form rather than printing
  0. The profile's own `total()` counts rent only when rented; so does this.
- The labels are chosen to land in the right slot of `UisExpenseSlots::KEYWORDS`.
  `House help` must not match housing, and an `Others: …` line belongs to the Others slot
  only — both rules already exist there; a test pins every label to its slot.
- `patient_income` and `income_members` are not copied: the family composition on the
  sheet already comes from the frozen snapshot, and `total_family_income` already
  includes them.

## Approach

### Phase 1 — Schema

One migration on `assessments`:

| Column | Type | Why |
| --- | --- | --- |
| `socioeconomic_profile_id` | FK `patient_socioeconomic_profiles`, nullable, nullOnDelete | Which record the sheet was imported from. |
| `socioeconomic_imported_at` | timestamp nullable | When. |

Provenance is what lets the sheet say "imported from the record of Oct 21" and notice that
a newer record exists. `Assessment` gains the fillable entries, the `datetime` cast and a
`socioeconomicProfile()` relation (with trashed, so a deleted record still reads).

### Phase 2 — `UisSocioeconomicImporter` (new, `app/Services`)

- `latestFor(Patient): ?PatientSocioeconomicProfile`
- `attributes(profile): array` — `house_tenure`, `light_source`, `water_source`,
  `total_family_income`, `other_income_sources`, plus the two provenance columns.
- `expenseLines(profile): list<array{expense_type, amount}>` — the mapping above.

Pure mapping, no writes, so intake and Refresh share it.

### Phase 3 — Import at intake

`AssessmentService::create()` resolves the patient, then — **before** the classification
is computed — fills what the request omitted from `latestFor($patient)`. The metrics are
then calculated against the imported income and expenses, so the new assessment is
classified correctly in one request. Request-supplied `expenses`, `total_family_income`,
`house_tenure`, `light_source` and `water_source` take precedence.

### Phase 4 — Import on Refresh

`AssessmentService::refreshSnapshot()` (the endpoint from #302) also:
1. replaces the assessment's expense lines with `expenseLines()`,
2. overwrites income, tenure, light and water from `attributes()`,
3. stamps `socioeconomic_profile_id` / `socioeconomic_imported_at`,
4. re-derives the classification — it already does, against the refreshed household size,
   now over the new expenses and income too.

Wrapped in the existing transaction. No new endpoint: the button keeps its meaning.

### Phase 5 — Expose it

- `AssessmentResource` returns the two provenance fields.
- `PatientUisController` adds a `socioeconomic` block per row — the patient's newest
  record (`id`, `recorded_on`) and `newer_available` (that id differs from the
  assessment's `socioeconomic_profile_id`). One query for the patient, not one per row.
- `UisReadinessService`'s `family_income` hint clears as soon as income is imported; no
  change needed.
- OpenAPI schema and `UisSnapshotDocs` updated.

Phases 1–5 are done. The `socioeconomic` block on each `/patients/{id}/uis` row is
`{latest_id, latest_recorded_on, imported_id, newer_available}`; `newer_available` is true
when the patient has a record and the sheet has not imported that one.

### Phase 6 — Frontend (not started)

- `uis.types.ts`, `assessment.types.ts` and the adapters gain the provenance and the
  `socioeconomic` block.
- `uis-sheet.tsx` banner, in the three cases:
  - imported and current: "Expenses and income imported from the Socio-economic record of
    {date}."
  - a newer record exists: "A newer Socio-economic record ({date}) is available" next to the
    Refresh button.
  - the patient has no record: "No Socio-economic record yet — record the patient's List of
    Expenses on that tab, then refresh."
- The Refresh dialog states that it also replaces the sheet's expenses, income and living
  conditions with the patient's latest record.
- The §III empty state points at the Socio-economic tab instead of showing bare dashes.

## Known limitations

- The imported expense lines stay editable through the assessment endpoints; the sheet's
  "freeze" for §III is the same weak one as before. Tightening it is a separate decision.
- A profile edited after import is not re-imported until someone presses Refresh;
  `newer_available` compares record ids, so an in-place edit of the same record is not
  flagged.
- Importing is one-way. Editing expenses on the sheet's assessment does not write back to
  the patient's profile.
- The Library-style label match depends on `UisExpenseSlots` keywords; renaming a label
  there without updating the importer would move an expense to the wrong slot. The slot
  test guards it.

## Verification

- `tests/Feature/UisSocioeconomicImportTest.php`:
  - an intake taken for a patient with a record imports tenure, light, water, income,
    other income and one expense line per filled item;
  - a blank item makes no line; rent imports only when rented;
  - every imported line lands in the right `UisExpenseSlots` slot, with `House help` out
    of housing and `Others: …` in Others only;
  - the classification at intake uses the imported income and expenses;
  - request-supplied values win over the import at intake;
  - a patient with no record imports nothing and clears nothing;
  - Refresh replaces the assessment's own lines and income, stamps the provenance, and
    reclassifies;
  - Refresh with no record leaves the assessment alone;
  - the newest record is chosen by `(recorded_on, id)` and soft-deleted ones are skipped;
  - a newer record flips `newer_available`;
  - the printed UIS shows the imported amounts in section III.
- `SocioeconomicProfileTest`'s independence test still passes unchanged.
- Existing intake and classification tests untouched: they have no profile, so nothing is
  imported.
- `npx tsc -p tsconfig.app.json --noEmit && npm run lint && composer test`, plus
  `vendor/bin/pint`.
- Manual, on the case that exposed this: open Caimor's UIS (encounter 3349825), press
  **Refresh from patient record**, and expect food ₱2,500, transport ₱1,500, tenure owned
  and income ₱30,000 on section III, the classification recomputed, and the PDF to match.
