# MSWD Server — Assessment Module Plan

Phased specification and technical reference for the enhanced **Assessment Module** in `zcmc_mswd_server`: MSWD Socio-Economic Classification (Brackets A, B, C1, C2, C3, D), automated discount percentage computation, Net Per Capita Income derivation, append-only re-assessment history snapshots, and elevation into formal Social Case Study Reports (SCSR).

**Status legend:** ☑ done · ◐ in progress · ☐ not started

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Database Migrations & Classification Tiers | ☑ done — 2026-09-11 |
| Phase 2 | MSWD Calculation Engine & Domain Actions | ☑ done — 2026-09-11 |
| Phase 3 | Re-assessment Lifecycle & SCSR Promotion | ☑ done — 2026-09-11 |
| Phase 4 | API Contracts, DTOs & Controller Routes | ☑ done — 2026-09-11 |
| Phase 5 | Automated Testing & Verification | ☑ done — 470 passed, 2026-09-11 |

---

## Background & Architecture

The Assessment Module serves as the primary socio-economic evaluation mechanism for hospital patients, determining discount eligibility and financial assistance thresholds.

### Key Technical Decisions

1. **Net Per Capita Income Formula**:
   $$\text{Net Per Capita Income} = \frac{\text{Total Family Income} - \text{Total Household Expenses}}{\text{Household Size}}$$
   where Household Size equals patient plus registered family members in `patient_family_members` (minimum 1).

2. **Social Worker Override**:
   Automated bracket calculations determine the recommended classification and discount percentage, but social workers may manually override the classification when supplying a written `classification_override_reason`.

3. **Append-Only Re-Assessment Snapshots**:
   Assessments remain immutable historical snapshots under a case episode (`hasMany`). Re-assessments link to previous records (`parent_assessment_id`), track a `reassessment_reason`, and update active case evaluation.

4. **Elevation to SCSR**:
   An assessment is created with `social_case_status` = `NULL` (ordinary intake/assessment snapshot). Social workers can explicitly elevate an assessment to an SCSR Draft (`draft` $\rightarrow$ `for_review` $\rightarrow$ `finalized`).

---

## Phase 1 — Database Migrations & Schema Adjustments ☑

Create the configurable classification matrix table and add re-assessment / calculation fields to `assessments`.

### 1.1 `mswd_classification_matrices` Table Migration
`database/migrations/2026_09_12_040000_create_mswd_classification_matrices_table.php`
- Schema: `id`, `code` (unique), `name`, `min_per_capita_income`, `max_per_capita_income`, `discount_percentage`, `max_assistance_cap`, `is_indigent`, `timestamps`, `softDeletes`.
- Seeds standard DOH MSWD classification brackets:
  - **A**: Full Pay ($>10,000.00$, 0% discount)
  - **B**: Partial Pay 25% ($7,000.01 - 10,000.00$)
  - **C1**: Partial Pay 50% ($5,000.01 - 7,000.00$)
  - **C2**: Partial Pay 75% ($3,000.01 - 5,000.00$)
  - **C3**: Indigent 100% ($0.00 - 3,000.00$)
  - **D**: Indigent / NBB ($0.00$ / No Balance Billing)

### 1.2 `assessments` Schema Enhancements
`database/migrations/2026_09_12_050000_enhance_assessments_table_with_classification_logic.php`
- Add `parent_assessment_id` (foreign key to `assessments.id`, nullable, `nullOnDelete`).
- Add `reassessment_reason` (string, nullable).
- Add `calculated_classification` (string, nullable).
- Add `classification_override_reason` (text, nullable).
- Add `net_per_capita_income` (decimal 12, 2, nullable).
- Add `calculated_discount_rate` (decimal 5, 2, nullable).

---

## Phase 2 — MSWD Calculation Engine & Domain Models ☑

Build the core domain calculation action and model bindings.

### 2.1 Model Updates
- **`MswdClassificationMatrix`** ([app/Models/MswdClassificationMatrix.php](file:///d:/System/zcmc_mswd_system/zcmc_mswd_server/app/Models/MswdClassificationMatrix.php)): Added fillable attributes and casts.
- **`Assessment`** ([app/Models/Assessment.php](file:///d:/System/zcmc_mswd_system/zcmc_mswd_server/app/Models/Assessment.php)): Added fillables, casts, `parentAssessment()` and `reassessments()` relationships, and helper methods `isReassessment()` and `hasOverride()`.

### 2.2 Domain Calculation Action
- **`CalculateMswdClassificationAction`** ([app/Actions/CalculateMswdClassificationAction.php](file:///d:/System/zcmc_mswd_system/zcmc_mswd_server/app/Actions/CalculateMswdClassificationAction.php)):
  Calculates Net Per Capita Income, checks active `MswdClassificationMatrix` rules, and returns calculated bracket code, discount percentage, and assistance caps.

---

## Phase 3 — Re-assessment Lifecycle & SCSR Elevation ☑

Implement service business logic in [AssessmentService.php](file:///d:/System/zcmc_mswd_system/zcmc_mswd_server/app/Services/AssessmentService.php).

### 3.1 Automatic Metric Computation
`create()` and `update()` trigger `CalculateMswdClassificationAction` automatically, storing calculated income, bracket, and discount rate. If no manual classification is specified, `classification` defaults to the calculated bracket.

### 3.2 Append-Only Re-Assessment Method
`createReassessment(CaseModel $case, AssessmentDto $dto, string $reason)`:
Finds latest assessment for the case as parent, populates `parent_assessment_id` and `reassessment_reason`, and creates an append-only snapshot.

### 3.3 SCSR Elevation Workflow
`promoteToSocialCase(Assessment $assessment, int $userId)`:
Transitions an ordinary intake assessment (`social_case_status` = `NULL`) to a Social Case Study Report draft (`draft`), stamping `prepared_by` and `prepared_at`.

---

## Phase 4 — API Contracts, DTOs & Controller Routes ☑

Expose API contracts and controller endpoints in `routes/api.php`.

### 4.1 Data Transfer Objects & Resources
- [AssessmentDto.php](file:///d:/System/zcmc_mswd_system/zcmc_mswd_server/app/DTOs/AssessmentDto.php): Handles re-assessment parent, reasons, calculated classification, net per capita income, and override fields.
- [StoreAssessmentRequest.php](file:///d:/System/zcmc_mswd_system/zcmc_mswd_server/app/Http/Requests/StoreAssessmentRequest.php) & [UpdateAssessmentRequest.php](file:///d:/System/zcmc_mswd_system/zcmc_mswd_server/app/Http/Requests/UpdateAssessmentRequest.php): Validation rules for re-assessment payloads and override reasons.
- [AssessmentResource.php](file:///d:/System/zcmc_mswd_system/zcmc_mswd_server/app/Http/Resources/AssessmentResource.php): Formats calculated classification metrics and `has_override` boolean.

### 4.2 Endpoint Routes
- `GET /api/mswd-classification-matrix`: Managed by [MswdClassificationMatrixController.php](file:///d:/System/zcmc_mswd_system/zcmc_mswd_server/app/Http/Controllers/MswdClassificationMatrixController.php).
- `POST /api/cases/{case}/reassess`: Managed by [ReassessCaseController.php](file:///d:/System/zcmc_mswd_system/zcmc_mswd_server/app/Http/Controllers/ReassessCaseController.php).
- `POST /api/assessments/{assessment}/promote-to-social-case`: Managed by [PromoteAssessmentToSocialCaseController.php](file:///d:/System/zcmc_mswd_system/zcmc_mswd_server/app/Http/Controllers/PromoteAssessmentToSocialCaseController.php).

---

## Phase 5 — Automated Testing & Suite Verification ☑

Integrated unit & feature tests in [tests/Feature/AssessmentModuleTest.php](file:///d:/System/zcmc_mswd_system/zcmc_mswd_server/tests/Feature/AssessmentModuleTest.php).

### 5.1 Test Cases Covered
1. Matrix Retrieval (`GET /api/mswd-classification-matrix`).
2. Automatic Net Per Capita Income & MSWD Bracket Calculation on Store.
3. Social Worker Manual Override with Reason Justification.
4. Linked Append-Only Re-Assessment Creation with Parent Tracking.
5. Promotion of Intake Assessment (`social_case_status` = `NULL`) to SCSR Draft (`draft`).

### 5.2 Test Results
- `php artisan test --filter=AssessmentModuleTest`: **5 passed** (66 assertions).
- `php artisan test` (Full Server Suite): **470 passed** (1594 assertions).

