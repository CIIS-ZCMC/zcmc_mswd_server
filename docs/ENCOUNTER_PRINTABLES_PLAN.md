# Hospital Encounter Printables Implementation Plan

This document outlines the architecture, data flow, backend endpoints, and frontend components for generating and printing **Unified Intake Sheet (UIS)**, **Acknowledgement Slip / MAIFIP**, and **CGA (City Mayor Assistance)** directly from Hospital Encounters.

---

## 1. Overview & Objectives

Medical Social Work Department (MSWD) officers frequently generate official printables tied to specific hospital encounters (HIS admissions and transactions). Providing direct print access from the **Hospital Encounters** tab and **Encounter Details Dialog** streamlines the clinical-social workflow.

### Printables Covered:
1. **Unified Intake Sheet (UIS / Annex B)**:
   - Standard DOH / ZCMC MSWD intake assessment form.
   - Populated if a social case episode and assessment exist; otherwise allows printing blank template or prompting to create a case.
2. **Acknowledgement Slip / MAIFIP**: built separately; see `docs/ACKNOWLEDGEMENT_SLIP_PLAN.md`. It prints from a MAIFIP
   guarantee (`GET /api/guarantees/{guarantee}/acknowledgement-slip/pdf`), not from the encounter, so the rows below for
   `maifip-slip` and `MaifipSlipPdfService` are superseded.
   - Official acknowledgement and guarantee slip for Medical Assistance for Indigent Patients (MAIFIP).
   - Backend service and Blade template to render encounter, guarantor, and assistance amount details.
3. **CGA (City Mayor Assistance)**:
   - Guarantee / endorsement slip for City Government of Zamboanga assistance.
   - Backend service and Blade template to render patient, transaction, diagnosis, and allocation lines.

---

## 2. UI & UX Architecture

### A. Hospital Encounters Table (`hospital-encounters-tab.tsx`)
Each encounter row receives a dedicated **"Print" dropdown button** next to the "View" button:
- **Button**: `<Button variant="outline" size="sm" className="h-8 px-2.5 text-xs font-bold gap-1.5"><Printer className="size-3.5" /> Print <ChevronDown className="size-3" /></Button>`
- **Dropdown Items**:
  1. **Unified Intake Sheet (UIS)** (`FileText` / `Printer` icon)
  2. **Acknowledgement Slip / MAIFIP** (`FileCheck2` icon)
  3. **City Mayor Assistance (CGA)** (`Building2` icon)

### B. Encounter Details Dialog (`hospital-encounter-detail-dialog.tsx`)
- In the dialog header actions, alongside "Assess Encounter" and "Open Case", include a prominent **"Print Documents"** dropdown.
- In the "MSWD & UIS" and "Guarantors" tabs, include dedicated print trigger buttons.

### C. Dialog Workflows
- **UIS Action**:
  - Checks if an active case is linked to the encounter (`useAssignableCases` / linked cases).
  - If linked: Opens `PrintUisDialog` with full options (populated vs blank, copies, remarks, print log history).
  - If not linked: Opens `PrintUisDialog` in "Unlinked Encounter" mode, allowing 1-click **Blank UIS** print or **"Open Case First"**.
- **MAIFIP & CGA Actions**:
  - Opens printable dialog preview with print options (copies, remarks) and live PDF preview/stream.

---

## 3. Backend Endpoints & Services

### Endpoints
| Method | Route | Controller | Permission | Description |
|---|---|---|---|---|
| `GET` | `/api/cases/{case}/uis/pdf` | `CaseIntakeSheetPdfController` | `intake.view` | UIS for linked case |
| `GET` | `/api/hospital/encounters/{id}/uis-blank-pdf` | `EncounterUisPdfController@blank` | `intake.view` | Blank UIS for unlinked encounter |
| `GET` | `/api/hospital/encounters/{id}/maifip-slip/pdf` | `EncounterMaifipPdfController` | `guarantee.view` | MAIFIP Acknowledgement Slip |
| `GET` | `/api/hospital/encounters/{id}/cga-slip/pdf` | `EncounterCgaPdfController` | `guarantee.view` | City Mayor Assistance Slip |

### PDF Services & Blade Templates
- `app/Services/UnifiedIntakeSheetPdfService.php` → `resources/views/pdf/unified-intake-sheet.blade.php` (Existing)
- `app/Services/MaifipSlipPdfService.php` → `resources/views/pdf/maifip-acknowledgement-slip.blade.php` (Scaffolded ready for exact schema)
- `app/Services/CgaSlipPdfService.php` → `resources/views/pdf/cga-assistance-slip.blade.php` (Scaffolded ready for exact schema)

---

## 4. Implementation Steps

- [x] **Phase 1: Architecture & Alignment**
  - Interview and confirm user requirements via `/grill-me`.
  - Design component hierarchy and data flow.
- [ ] **Phase 2: Frontend Encounter Print UI**
  - Add "Print" dropdown to table row in `hospital-encounters-tab.tsx`.
  - Add "Print Documents" dropdown in `hospital-encounter-detail-dialog.tsx`.
  - Enhance `PrintUisDialog` to handle unlinked encounters gracefully with blank print option.
- [ ] **Phase 3: Scaffold MAIFIP & CGA Dialogs & Handlers**
  - Create reusable `EncounterPrintDialog` / modal preview components.
  - Wire actions to preview / print endpoints.
- [ ] **Phase 4: Validation & Quality Assurance**
  - Type-check via `tsc` and verify Vite build.
  - Verify accessibility, senior-friendly button sizes, and responsiveness.
