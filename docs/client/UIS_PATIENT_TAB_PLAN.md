# UIS Patient Tab — Client Plan

Client half of the redesigned patient-page UIS tab. The server half is
`zcmc_mswd_server/docs/UIS_PATIENT_TAB_PLAN.md`; client phases C2+ are gated on its phases B1–B2 being deployed.

**Status legend:** ☐ not started · ◐ in progress · ☑ done

| Phase | Server gate | Status |
|-------|------------|--------|
| C1. Compile fix + contract (restore API/types/hooks, shared labels, print-history table) | B2 | ☑ |
| C2. Tab shell + encounter picker | B2 | ☑ |
| C3. The sheet (ANNEX B cards) + actions (assess/edit, print, preview, delete) | B2 | ☑ |
| C4. Wiring (Hospital Encounters deep link) + docs | C3 | ☑ |

## Background

A patient-page UIS tab already shipped (#62 / #63): a table of cases with a side sheet. It is being redesigned.
The working tree has its files deleted and uncommitted — `uis-tab.tsx`, `uis-sheet-view.tsx`,
`cases/api/patient-uis-api.ts`, `cases/types/uis.types.ts` — while `patient-detail-view.tsx` (import line 39, mount line 364),
`use-uis-prints.ts` (`usePatientUis`, `patientUisKeys`) and `use-assessment.ts` still reference them, so **the app
does not compile**. Phase C1 restores a building tree first.

The tab keeps `/patients/:id?tab=uis` (`uis` is already in `PATIENT_TABS`, `ClipboardList` icon, between Hospital
Encounters and Docs) and changes the layout to an **encounter picker + one sheet**.

Known gaps in the shipped tab this redesign closes: the classification card shows "Household Size 1" (server did not
send it); Hospital Encounters does not deep-link to a case; no in-page PDF preview; ANNEX B sections were only
partly shown.

## Layout

```
┌ UIS ─────────────────────────────────────────────────────────────┐
│ Encounters            │ CASE-2026-000012 · Outpatient · Oct 1     │
│ ┌───────────────────┐ │ [Ready to print] [Class C2] 3 prints      │
│ │▶ CASE-…012  Ready │ │ [Assess/Edit] [Print…] [Preview] [Delete] │
│ │  OPD · Oct 1  C2  │ │ ⚠ Still missing: Informant, Recommendation│
│ │  CASE-…009  —     │ │ Informant · I · II · III · IV · V cards   │
│ │  not assessed     │ │ Classification card · Print history       │
│ └───────────────────┘ │                                           │
└──────────────────────────────────────────────────────────────────┘
```

- Deep link `?tab=uis&case=<caseId>`; default selection is the newest case. Below `md` the rail becomes a `Select`.
- States: no cases → "Open a case" CTA (`onOpenCaseNeeded`); loading → Skeletons; error → destructive Alert; selected
  case without an assessment → "Not assessed" panel with Assess and "Print blank form"; a case whose assessment was
  promoted to the SCSR (`hasSocialCase`) → read-only note, no delete.

## Server contract (reference)

`GET /patients/{id}/uis` → per case: `case{id, case_code, status, transaction_id, transaction_type, date_opened}` and
`uis{has_assessment, assessment_id, ready, missing[], classification, print_count, last_printed_at, has_social_case,
household_size, expense_slots{housing, food, education, transport, clothing, medical, house_help, insurance, others},
assessment{…incl. expenses, household_size}|null}`. Other calls: `GET /cases/{id}/uis/pdf` (`preview`, `download`, `blank`,
`copies`, `remarks`; 409 `uis_no_assessment`), `GET /cases/{id}/uis/prints`, `DELETE /assessments/{id}` (422 for a finalized SCSR).

## Phase C1 — Compile fix + contract

- Re-add `cases/api/patient-uis-api.ts`, `cases/types/uis.types.ts` (`PatientUisRow` + `householdSize`, `expenseSlots`) and
  `ApiPatientUisRow` in `cases/types/api.types.ts`.
- Move the duplicated `MISSING_SECTION_LABELS` (in `encounter-uis-panel.tsx` and `print-uis-dialog.tsx`) to
  `cases/lib/uis-labels.ts`.
- Extract the print-history table from `encounter-uis-panel.tsx` into `cases/components/uis-print-history-table.tsx`
  (prop: `caseId`) so the panel and the tab share it.
- `npm run build` is green again, with a stub `UisTab`.

## Phase C2 — Tab shell + encounter picker

`patients/components/tabs/uis-tab.tsx` (new): `usePatientUis(patient.id)`; selection read from `?case=`;
`uis-encounter-rail.tsx` with one card per case (case code, `formatTransactionType`, a `date-fns` date, status badge,
`getClassificationBadgeText` / `getBracketColor` chip, print count). Loading / empty / error states follow
`hospital-encounters-tab.tsx`. The mount contract in `patient-detail-view.tsx` (`patient`, `onOpenCaseNeeded`) is unchanged.

## Phase C3 — The sheet + actions

- `patients/components/uis-sheet.tsx` (new): read-only cards in ANNEX B order.
  - **Informant** — the informant's own address and contact, falling back to the patient's, as the PDF does.
  - **I** identifying information from `PatientRecord`.
  - **II** family composition table from `patient.familyMembers` (incl. civil status) + other income sources + total.
  - **III** house tenure / light / water ticks + the server's `expenseSlots`.
  - **IV** problem categories, specify text, presenting problem.
  - **V** recommendation (mode and fund labels via `labelFor` in `assessment-constants.ts`) and the narrative.
  - `MswdClassificationCard` with the real household size.
- Actions, gated by `usePermission`:
  - **Assess / Edit** → `IntakeAssessmentDialog` (`cases.create` to create, `cases.update` to edit).
  - **Print…** → `PrintUisDialog` (copies, remarks, blank form; a 409 offers Assess).
  - **Preview** → an in-page `<iframe>` dialog via a new `getCaseUisPreviewUrl()` in `uis-print-api.ts`
    (`fetchBlob`, `preview=1`, not logged by the server; the object URL is revoked when the dialog closes).
  - **Delete** → `AlertDialog` + `useDeleteAssessment`; hidden when `hasSocialCase`; shows the server's 422 message.
- Print history: the shared `UisPrintHistoryTable` for the selected case.

## Phase C4 — Wiring + docs

`hospital-encounters-tab.tsx`: an "Open UIS" link per encounter's case → `?tab=uis&case=<id>`. Rewrite the Phase 6
section of `docs/UIS_MODULE_PLAN.md` (removed in the working tree) and the UIS line of `CLAUDE.md`.

## Reuse

`IntakeAssessmentDialog`, `PrintUisDialog`, `useCaseUisPrintHistory`, `usePrintCaseUis`, `useDeleteAssessment`,
`MswdClassificationCard`, the helpers in `cases/lib/classification.ts`, `assessment-constants.ts`,
`formatTransactionType`, `usePermission` (`intake.view`, `cases.create`, `cases.update`), `ApiError.code`, `fetchBlob`,
the `family-tab.tsx` Card/Table layout.

## Verification

There is no test runner: `npm run build` per phase (plain `npm run typecheck` does not check the app sources); the lint
baseline must not grow. In the browser against a local server:

1. A patient with 2–3 cases lists them newest first; `?tab=uis&case=<id>` selects one.
2. An unassessed case shows "Not assessed" with Assess and Print blank form.
3. Assess fills the sheet — informant, family, expense slots (House help not under House/Lot), household size.
4. Print with copies and remarks adds a history row; Preview shows the PDF in-page and adds no row.
5. Delete returns the case to "Not assessed"; an SCSR-promoted case is read-only.
6. Hospital Encounters "Open UIS" lands on the right case.
7. A user with only `intake.view` sees no Assess or Delete buttons.

## Non-goals

Encounter-level print endpoints (UIS stays per case); editing family members from this tab; light/water bill amounts
on the sheet (ANNEX B has no slot).
