# Client Routing Architecture Plan (Phase F Prerequisite)

This document outlines the client-side routing strategy required before implementing **Phase F (Caseload Screen)** of `SOCIAL_CASE_PLAN.md`.

---

## 1. Context & Motivation

Currently, `zcmc_mswd_client` relies on a top-level `useState` variable (`currentView`) inside `main-layout.tsx` to toggle between:
- Patient Detail View
- Audit Log View

### Why this blocks Phase F (Caseload Screen)
Server Phase B ships `GET /my-caseload`, returning a paginated queue of cases assigned to the current user, filtered by `social_case_status`.

Without client-side routing:
1. Clicking a caseload row cannot open a specific patient or case episode via URL (`/cases/:id` or `/patients/:id`).
2. Filter states, pagination indices, and tab selections cannot be bookmarked or shared.
3. Bolting a 3rd or 4th `currentView` string onto `useState` creates unmaintainable navigation code.

---

## 2. Proposed Routing Architecture

### Library Recommendation: React Router v7 (`react-router`)
We recommend `react-router` (v7) for standard declaratively defined routes, smooth React 19 compatibility, and robust URL parameter parsing.

### Target Route Map

| Route Pattern | View Component | Description |
|---------------|----------------|-------------|
| `/` | `PatientListPage` | Master list of patients with search and filters |
| `/patients/:patientId` | `PatientDetailPage` | Patient record view with tab selection via search query `?tab=social-case` |
| `/cases/:caseId` | `CaseRedirectPage` | Redirects to `/patients/:patientId?tab=social-case` based on `caseId` |
| `/caseload` | `CaseloadPage` | **Phase F screen**: Queue of social worker's assigned cases with status bucket filters |
| `/audit` | `AuditLogPage` | System audit trail log |

---

## 3. Key Design Decisions

1. **Patient Tabs as Query Parameters (`?tab=...`):**
   - Keeps the tab state synchronized with the URL (e.g. `/patients/101?tab=social-case` or `/patients/101?tab=watchers`).
   - Allows direct deep-linking to the Social Case Study Report (SCSR) tab.

2. **Case ID Resolution (`/cases/:caseId`):**
   - Since server endpoints (like `GET /cases/{case}/social-case`) are case-addressed, navigating to `/cases/456` resolves the associated `patient_id` and redirects smoothly to `/patients/123?tab=social-case`.

3. **Caseload Queue State:**
   - Filter state (`status=draft|for_review|finalized`, `page=1`, `per_page=15`) stored in URL search parameters to preserve UI state across page refreshes.

---

## 4. Implementation Phasing

1. **Step 1: Install & Set Up Router**
   - Add `react-router` package.
   - Wrap application root with `<BrowserRouter>`.

2. **Step 2: Migrate Existing Views to Routes**
   - Move `main-layout.tsx` view switcher to `<Routes>` and `<Route>`.
   - Update patient list row clicks to trigger `navigate('/patients/' + patient.id)`.

3. **Step 3: Unblock & Implement Phase F**
   - Build `src/features/cases/components/caseload-page.tsx`.
   - Build `useCaseload` hook consuming `GET /my-caseload`.
   - Add "My Caseload" navigation link to sidebar, gated on `cases.view` permission.

---

## 5. Status & Next Steps

- [x] Client Routing Architecture Plan drafted (`docs/CLIENT_ROUTING_PLAN.md`).
- [x] Install `react-router` (v7).
- [x] Implement Route hierarchy (`/`, `/patients/:patientId`, `/caseload`, `/cases/:caseId`, `/audit`).
- [x] Execute Phase F (Caseload Screen).

