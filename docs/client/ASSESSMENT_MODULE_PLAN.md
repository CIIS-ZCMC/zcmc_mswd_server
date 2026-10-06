# MSWD Client — Assessment Module Plan

Client implementation plan for the enhanced **Assessment Module** in `zcmc_mswd_client`: MSWD Socio-Economic Classification UI (Brackets A, B, C1, C2, C3, D), Net Per Capita Income calculation indicators, discount matrix lookup, re-assessment modal, assessment snapshot history timeline, and promotion flow into formal Social Case Study Reports (SCSR).

The server half lives in `zcmc_mswd_server/docs/ASSESSMENT_MODULE_PLAN.md` (Phases 1–5).

**Status legend:** ☐ not started · ◐ in progress · ☑ done

| Phase | Description | Server Gate | Status |
|-------|-------------|-------------|--------|
| Phase 1 | TypeScript Types, DTOs & API Client Layer | Server Phase 1–4 | ☑ done |
| Phase 2 | MSWD Bracket & Net Per Capita Income UI | Server Phase 2 | ☑ done |
| Phase 3 | Re-Assessment Modal & Reason Selection | Server Phase 3 | ☑ done |
| Phase 4 | Assessment Promotion to SCSR Action | Server Phase 3–4 | ☑ done |
| Phase 5 | Assessment History Timeline Component | Server Phase 3–4 | ☑ done |

Phases 2–5 shipped their components and hooks ahead of a mount point; all of
them render from `social-case-tab.tsx`, so they only became reachable when
**Social Case Phase E** rewrote that tab.


---

## Background & Architecture

The server now automatically calculates Net Per Capita Income ($\frac{\text{Total Family Income} - \text{Expenses}}{\text{Household Size}}$), matches the active MSWD classification bracket (`A`, `B`, `C1`, `C2`, `C3`, `D`), assigns discount percentages, supports social worker manual overrides with written justifications, links append-only re-assessments, and allows promoting intake assessments (`social_case_status` = `NULL`) to SCSR drafts (`draft`).

The client currently displays a basic read-only assessment overview in `src/features/patients/components/tabs/social-case-tab.tsx`. This plan details building interactive components, re-assessment modals, classification indicators, and history timelines.

---

## Phase 1 — TypeScript Types, DTOs & API Client Layer ☑

Define API types and integration methods for MSWD classification matrices, re-assessments, and promotion endpoints.

### 1.1 Type Definitions
- **`src/features/cases/types/assessment.ts`**:
  - `MswdClassificationMatrix`: `id`, `code` (`A` | `B` | `C1` | `C2` | `C3` | `D`), `name`, `min_per_capita_income`, `max_per_capita_income`, `discount_percentage`, `max_assistance_cap`, `is_indigent`.
  - `Assessment` extensions: `parent_assessment_id`, `reassessment_reason`, `net_per_capita_income`, `calculated_classification`, `classification_override_reason`, `calculated_discount_rate`, `has_override`.

### 1.2 API Service Layer
- **`src/features/cases/api/assessment-api.ts`**:
  - `fetchMswdClassificationMatrix()`: `GET /api/mswd-classification-matrix`
  - `reassessCase(caseId: number, payload: ReassessmentPayload)`: `POST /api/cases/{case}/reassess`
  - `promoteAssessmentToSocialCase(assessmentId: number)`: `POST /api/assessments/{assessment}/promote-to-social-case`

---

## Phase 2 — MSWD Bracket & Net Per Capita Income UI Components ☑

Create visual badges, calculation metric cards, and override indicators.

### 2.1 Components
- **`src/features/cases/components/mswd-classification-card.tsx`**:
  - Renders current active MSWD bracket badge (`A`, `B`, `C1`, `C2`, `C3`, `D`) with color coding (e.g. Amber for Partial, Emerald for Indigent, Blue for Full Pay).
  - Displays Net Per Capita Income ($\text{₱X,XXX.XX}$/month) alongside Total Household Income and Expense Breakdown.
  - Highlights discount rate (e.g. `75% Discount Rate`) and maximum assistance cap.
  - Displays **Manual Override Warning Badge** if `has_override` is true, displaying `classification_override_reason` in a popover or alert block.

---

## Phase 3 — Re-Assessment Modal & Reason Selection ☑

Build a dialog enabling social workers to issue a re-assessment on an existing case episode.

### 3.1 Modal Component
- **`src/features/cases/components/dialogs/reassess-case-dialog.tsx`**:
  - Triggered via "Re-assess Patient" action button on case profile/tab.
  - Required Field: `reassessment_reason` select/input (`Income Change`, `Re-admission`, `Prolonged Hospitalization`, `Annual Review`, `Assistance Request`).
  - Auto-computes and previews the calculated classification bracket in real-time as `total_family_income` or household expenses are adjusted.
  - Handles manual classification override toggle with mandatory written justification.

---

## Phase 4 — Assessment Promotion to SCSR Action ☑

Provide a seamless elevation path from intake assessment to formal Social Case Study Report.

### 4.1 UI Workflow
- On `social-case-tab.tsx`, if latest assessment has `social_case_status === null`, display a prominent action banner:
  > *"This assessment is currently an intake snapshot. Elevate to a formal Social Case Study Report (SCSR) to initiate drafting and section head sign-off."*
- Button: `Elevate to Social Case Study Report`.
- On click, invokes `promoteAssessmentToSocialCase()`, updating UI state to `draft` and opening the SCSR narrative editor (`social-case-editor.tsx`).

---

## Phase 5 — Assessment History & Re-Assessment Timeline ☑

Display an append-only timeline of all historical assessments under a patient episode.

### 5.1 Timeline Component
- **`src/features/cases/components/assessment-history-timeline.tsx`**:
  - Lists all assessment records (`hasMany`) sorted newest first.
  - Highlights parent-child linkages (e.g., *"Re-assessment #5 (Parent: #2 — Loss of household employment)"*).
  - Displays historical classification shifts over time (e.g., `Classified as C1 (50%)` $\rightarrow$ `Re-assessed as C3 (100%)`).

---

## Verification & Acceptance Criteria

1. **Classification Matrix Lookup**: Verification that MSWD tiers load dynamically into select options and discount rate tooltips.
2. **Real-time Per-Capita Income Preview**: Inputting total income updates calculated bracket preview automatically.
3. **Re-Assessment Creation**: Submitting re-assessment modal appends a new assessment record linked to parent with reason.
4. **SCSR Elevation**: Clicking promote updates status to `draft` and unlocks narrative report sign-off actions.

