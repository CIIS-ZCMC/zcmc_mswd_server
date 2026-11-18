# UI Redesign (Figma): dashboard, split-view registry, visit stepper

## Context

The client is being restyled from the Figma design. The work is in the working tree only; none of it is committed yet. It changes four things:

- **Landing page:** `/` becomes a dashboard.
- **Registry:** it becomes a split view of nav rail, registry list and workspace.
- **Patient profile:** it drops from 10 tabs to 5, with a visit stepper above the tabs.
- **Serving a patient:** it opens one intake dialog that covers Annex B, Guarantors and Prints.

Until this ships, the module sections of `CLAUDE.md` describe the committed system. When it ships, update them: Patients (tabs, routes), the main layout, and UI & Styling (fonts, colour tokens). Then delete this file.

**Delivery:** one issue (#323), one branch and one PR for this plan doc. The first PR lands the redesign as built, with the open items below still to do.

**Status legend:** ☐ not started · ◐ in progress · ☑ done

| Part | Status |
|------|--------|
| 1. Layout, nav rail, header | ◐ built, nav gaps |
| 2. Dashboard (`/`) | ◐ UI only, sample data |
| 3. Registry `/patients` and profile | ◐ built |
| 4. Visit stepper and `PatientIntakeDialog` | ◐ Guarantors wired; Annex B and Prints not |
| 5. Visit purpose (Intake / Guarantee only) | ☑ done |
| 6. Theme: font and colour tokens | ◐ hard-coded values |
| 7. Fix breakages, tests, checks | ◐ typecheck, lint and tests pass; Prettier drift |

## Built so far

### Routes and pages
- **`GET /`** is unchanged on the server: `PatientsPageController::index` still sends a user without `patients.view` to their first module. `pages/Patients/Index.tsx` now renders only `<MswdDashboard />`, without `MainLayout`, and ignores the `initialPatientId` prop.
- **`GET /patients`** (`patients.registry`, `permission:patients.view`) is new. It is `PatientsPageController::registry` and renders `Patients/Show` with `patientId: ''`.
  - With no patient, the page shows a "No Patient Selected" panel with a Search or import button.
  - The open patient is remembered in `localStorage.last_viewed_patient_id`.

### Layout (`components/layout/`)
`main-layout.tsx` has three columns:
1. `DashboardSidebar` (collapsed nav rail)
2. `Sidebar` (registry list)
3. workspace: `Header`, then `ServingBar`, then the page

Every page except Login and the dashboard uses it.

**Nav rail items:**

| Item | Target | Permission |
|---|---|---|
| Dashboard | `/` | none |
| Patient Cases | `/patients` | `cases.view` or `patients.view` |
| Approvals | `/queue` | `queue.manage` |
| Reports | `/reports/social-cases` | `reports.view` |
| DAR | `/dar` | `dar.manage` |
| Audit | `/audit` | `audit.view` |

Logout is on the rail.

**`sidebar.tsx`** is only the registry now:
- search box and intake-date filter
- patient cards, with a Queue button (`queue.manage`) that opens `PatientQueueDialog`
- pagination

The old module switcher is gone.

**`header.tsx`** has:
- Search or import patient (Ctrl K, `patients.view`)
- a "Live database" pill
- the date
- the theme toggle
- a Library icon (`library.manage`)

The brand, user name and logout moved out of it.

### Dashboard (`features/dashboard/`)
- **`mswd-dashboard.tsx`:**
  - a welcome banner and a New intake button, which opens the search/import dialog
  - `DashboardKpiStrip`
  - `IntakeQueueCard` with New, Open and All tabs
  - `FurtherAssistanceCard`, `AssistanceReleasedCard` (this week vs last week), `ReturnedForRevisionCard`
  - its own `DashboardHeader` and `ServingBar`
- **Assets:** `public/images/dashboard/`.

### Patient profile (`patient-detail-view.tsx`)
- **5 pill tabs:**
  - Profile & IDs (`profile`, which now holds the IDs section)
  - Household & Finances (`socioeconomic`: Family and Socioeconomic)
  - Hospital Encounters
  - Intake Sheets (`uis`)
  - Watchers
- **Social case** opens from the Cases / Print Case Study buttons in the patient header.
- **Documents and History** are cards under the tabs.
- `?tab=id` opens `profile`.
- **Visit stepper** above the tabs: Queued, Check details, ANNEX B, Guarantors, Approval, Letters printed. ANNEX B is dropped when the visit is guarantee-only.
- **Assets:** `public/images/patient-registry/`.

### Intake dialog (`features/patients/components/dialogs/patient-intake-dialog.tsx`)
- Three sections: `annex-b`, `guarantors`, `prints`. ANNEX B is a 5-step wizard: Informant, Family & income, Monthly expenses, Diagnosis & problems, Assessment & class.
- It opens from the stepper. When the visit is guarantee-only, it opens on Guarantors.
- **Guarantors is wired:**
  - hooks: `useGuarantees`, `useDeleteGuarantee`, `useHospitalEncounter`, `useQueueActionGate`
  - permissions: `guarantee.create`, `guarantee.update`, `guarantee.delete`
  - the new `AddGuarantorCard` (`features/guarantees/components/add-guarantor-card.tsx`) reads the Library lists and saves through `useCreateGuarantee`
- **`NewIntakeAssessmentDialog` is not replaced.** The UIS tab and the encounter printable dialog still use it.

### Visit purpose
- `service_visits.purpose` already exists on the server (nullable string).
- `PatientQueueDialog` limits it to `Intake` or `Guarantee only`.
- The detail view reads it from the patient list's `activeVisit` to decide `isGuaranteeOnly`.

### Theme
- `package.json` swaps `@fontsource-variable/roboto` and `@fontsource-variable/raleway` for `@fontsource-variable/plus-jakarta-sans`.
- `app.css` sets `--font-sans` and `--font-heading` to it.
- `components/ui/dialog.tsx` and `alert-dialog.tsx` are restyled.

## Still on sample data or not wired

- **Dashboard:** every card uses constants and there is no API behind it. The hard-coded values are:
  - `DEFAULT_KPI_COLUMNS`, `DEFAULT_INTAKE_ROWS`, `THIS_WEEK_DAYS` / `LAST_WEEK_DAYS`, `DEFAULT_FURTHER_ASSISTANCE_ITEMS`, `DEFAULT_REVISION_ITEMS`
  - `pendingApprovalsCount={3}`
  - "6 new intakes since 7:30 AM"
  - the date "Wed, Sep 23, 2026"
  - the name fallback "Juan"
  - sample rows have no `patientId`, so clicking one only opens search
  - the Processor/Head toggle only changes local state
- **ANNEX B save:** "Save ANNEX B" and "Save and Add Guarantors" set local state and show a toast. No assessment API is called. It should go through the intake API (`intake.create`), as `NewIntakeAssessmentDialog` does.
- **Prints** call `window.print()`, not the PDF endpoints (UIS, MAIFIP slip, City Mayor slip, Indigency certificate). Prints should also be logged.
- **Intake dialog constants:**
  - `DEMO_FAMILY_MEMBERS`, shown when the patient has none
  - income default 9000
  - "Dental caries, unspecified"
  - "Oct 21, 2026 · 9:31 AM"
  - "Class C3 · complete"
- **`AddGuarantorCard`:** `soaAuto` is fixed at "8,000.00".
- **Stepper labels:** "3 to check" and "≥ ₱50,000 only" are fixed.

## Known breakages

Fixed: visit `purpose` now reaches the registry list. `PatientResource.active_visit` sends it, `ApiPatientActiveVisit` and `activeVisit` carry it, and `ServiceVisitTest` asserts it. `PatientsPageController` passes Pint.

Also fixed:
- **Watcher pass validity:** the Watchers tab's "valid until" now has data. `PatientWatcherResource.assignments` sends `pass_valid_until`, carried through `ApiWatcherAssignment` and `WatcherAssignment`.
- **Waiting and serving minutes:** they read the component's `nowMs` clock through `minutesSince()`, not `Date.now()` during render.
- **Custom expense lines:** the intake dialog numbers them from a ref.
- **Unused code removed:**
  - the gate in `hospital-encounters-tab.tsx`. Its row menu now holds only prints, and Assess / Open Case live in `HospitalEncounterDetailDialog`, which applies the gate itself.
  - the `hisEncounterNo` prop
  - a stray `passNumber`

`npx tsc -p tsconfig.app.json --noEmit` and `npm run lint` (errors) are clean. Prettier reports style drift in about 38 files; run `npm run format` before the PR.

## Gaps

- "Patient Cases" shows for `cases.view` alone, but `/patients` needs `patients.view` and refuses those users. Gate the item on `patients.view`, or point case-only users to `/caseload`.
- The rail has no link to `/caseload`, `/reports/turnaround` or the Reports index. Library is reachable only from the header icon.
- **Duplicate mounts:**
  - On an empty `/patients`, `PatientSearchImportDialog` is mounted twice (header and page).
  - The dashboard renders its own `ServingBar` beside the layout's.
- `tabs/id-tab.tsx` (`IdTab`) is no longer imported. Delete it.
- Many new components use hard-coded hex colours, `data-node-id` attributes and `font-[Plus_Jakarta_Sans,sans-serif]` in place of the OKLCH theme tokens. They will not follow dark mode.

## Remaining work

1. Fix the known breakages.
2. Dashboard: add endpoints, or reuse existing ones, for:
   - the KPIs
   - the intake queue (service visits)
   - further assistance (`my-follow-ups`)
   - assistance released (assistance reports)
   - returned-for-revision SCSRs

   Gate each card by permission.
3. ANNEX B: save through the intake API. Read family, income and expenses from the patient instead of demo values.
4. Prints: use the existing PDF endpoints and their print logs.
5. Close the nav gaps, and remove the duplicate mounts and the orphan tab.
6. Move hard-coded colours and fonts to theme tokens, and check dark mode.
7. Update `CLAUDE.md`, then delete this plan.

## Verification

```bash
npx tsc -p tsconfig.app.json --noEmit && npm run lint && composer test
```
```bash
vendor/bin/pint
```

In the browser (`composer dev`, `AUTH_PROVIDER=local`), sign in as each role:
- the rail shows only what the role can open
- `/` shows live figures
- `/patients` empty state works
- a guarantee-only visit opens on Guarantors
- ANNEX B saves and reprints from the UIS tab
- prints produce the PDFs and appear in the print logs
