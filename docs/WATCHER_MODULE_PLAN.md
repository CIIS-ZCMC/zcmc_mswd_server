# Watcher Module: Re-plan (server + Inertia SSR client)

This plan supersedes `docs/WATCHER_LOGIC_PLAN.md` and `docs/client/WATCHER_LOGIC_PLAN.md`.

## Why

**Today there are two watcher tables:**
- **`patient_watchers`** is a directory of people for each patient.
- **`case_watchers`** links a person to a case. It also stores its own copy of the person's name, relationship, contact number and address.

Every rule (primary watcher, pass, presence, waiver, requirement) runs only on `case_watchers`.

**What goes wrong in the main app:**
- **A watcher cannot be added unless the patient has a case.** The patient Watchers tab shows an empty state when there is no case, and `useAddWatcher` is never used.
- **Entering a "new person" always creates a second directory row** for someone who may already be listed.
- **Edits never sync.** Changing the directory row does not change its case copies, and the reverse.

**Bugs in the current code:**
- The client sends the relationship's name, but the server checks it against the relationship code.
- The waiver dialog sends `watcher_waiver_notes`, but the server expects `watcher_waiver_note`. The note is lost, and the reason "other" always fails validation.
- Pass numbers come from a row count, so two passes can get the same number.
- The case page has no watcher status banner.
- A primary watcher who has left, or whose pass was revoked, still counts as satisfying the requirement.

**Goal:** the user adds a watcher to a **patient**, whether or not the patient has a case. If the patient has an open case, the user can **assign** that watcher to it.

## Decisions (user, 2026-10-20)

- **One record, linked.**
  - `patient_watchers` is the only place the person's details live: name, relationship code, contact number and address.
  - `case_watchers` becomes just an **assignment** to a case. It keeps only facts about that case: primary, informant, pass, presence dates, notes and `added_by`.
  - Editing a watcher's details updates them on every case.
- **Passes stay on the case assignment.** A watcher with no case gets no pass.
- **Pick from open cases.**
  - The Assign dialog lists the patient's `open` and `ongoing` cases, with the latest selected by default.
  - One watcher may be assigned to several open cases, but only once to each.
- **Fix the bugs listed under "Why".**

## Defaults (not yet confirmed by the user; easy to change)

- **Drop `patient_watchers.is_primary`.** Being primary only makes sense on a case, and `case_watchers` already allows only one primary per case.
- **Assignments on closed or referred cases become read-only history.**
  - Assigning, unassigning and issuing passes all need the case to be `open` or `ongoing`.
  - The watcher's details can still be edited. Because the record is shared, the edits also show on closed cases.
- **Removing a patient watcher who is assigned to an open case is refused** with a 422 ("unassign first").
  - Otherwise, removing a watcher soft-deletes the directory row.
  - Assignments on closed cases keep pointing to the deleted row, loaded with `withTrashed`.
- **What satisfies the requirement:** `has_primary` counts only a primary assignment where:
  - the pass is not `revoked`, and
  - `present_until` is empty or in the future.
- **Delivery:** one issue, one branch and one PR for this plan doc. Each phase is a commit.

**Status legend:** ☐ not started · ◐ in progress · ☑ done

| Phase | Side | Depends on | Status |
|-------|------|------------|--------|
| 0. Plan doc | docs | — | ☑ done |
| 1. Schema and backfill | server | 0 | ☑ done (models updated; services, resources and tests follow in Phases 2–3) |
| 2. Patient watcher API | server | 1 | ☑ done (`open_cases` on the patient moved to Phase 5) |
| 3. Case assignment API, pass numbers, requirement status | server | 1, 2 | ☑ done |
| 4. Pass expiry command | server | 3 | ☑ done |
| 5. Client: patient watchers tab, assign dialog, case panel, bug fixes | client | 2, 3 | ☐ |
| 6. Docs, OpenAPI, wrap-up | docs | 1–5 | ☑ done |

## Phase 0: Plan doc

- Write this file.
- Mark `docs/WATCHER_LOGIC_PLAN.md` and `docs/client/WATCHER_LOGIC_PLAN.md` as superseded, with a pointer to this file.

## Phase 1: Schema and backfill (server)

Add a new migration. Make each step reversible where practical.

**`patient_watchers`**
1. Add `relationship_code`: a nullable, indexed string, validated against `watcher_relationship_types.code`.
2. Fill `relationship_code` from the free-text `relationship` column.
   - Reuse the text-to-code mapping in `app/Console/Commands/BackfillCaseWatchers.php`. Move it into a small `WatcherRelationshipMapper` class first.
   - Text that does not match any code becomes `other`.
3. Drop the `relationship` and `is_primary` columns.
4. Add `added_by` (nullable foreign key to `users`) and `notes` (nullable text).

**`case_watchers`**
1. For each row with no `patient_watcher_id`, create a directory row from its copied details and link the two.
2. Make `patient_watcher_id` required (NOT NULL).
3. Drop `name`, `relationship`, `contact_number` and `address`.
4. Add a unique guard `uniq_case_watcher_assignment` on a generated column: `IF(deleted_at IS NULL, CONCAT(case_id,'-',patient_watcher_id), NULL)`. This stops a watcher from being assigned to the same case twice. It copies the existing `primary_key_guard` pattern in `2026_09_08_010100_create_case_watchers_table.php`.

**Models**
- `PatientWatcher`:
  - Update `fillable`.
  - Add `relationshipType()` (belongsTo, matched on code) and `addedBy()`.
  - Keep `caseWatchers()`.
  - Add an `openAssignments()` scope.
- `CaseWatcher`: remove the copied detail fields, and always load `patientWatcher` with `withTrashed`.

**Retire the old backfill command**
- Once the mapper has been moved out, delete the `mss:backfill-case-watchers` command and its test.
- It was a one-time migration that has already run. Check the production data before deleting it.

## Phase 2: Patient watcher API (server)

**Routes and permissions** (`routes/api.php`):
- Keep `GET` and `POST patients/{patient}/watchers`, plus `PUT` and `DELETE watchers/{watcher}`.
- Permissions stay `patients.view` and `patients.update`.

**Requests**
- `StorePatientWatcherRequest` accepts:
  - `name` (required)
  - `relationship_code` (required, `exists:watcher_relationship_types,code`)
  - `contact_number`, `address` and `notes`
- `UpdatePatientWatcherRequest` accepts the same fields, each optional (`sometimes`). Remove `patient_id`, so a watcher can no longer be moved to another patient.

**`PatientWatcherDto`:** keep exactly the keys the request sent, the same way `CaseWatcherDto` does. Sending null then clears a field.

**`PatientWatcherService`**
- `destroy()` refuses with a 422 when the watcher is assigned to an open case.
- Remove the unused `list()` that pages through every watcher in the system.

**`PatientWatcherResource`** adds:
- `relationship_code` and `relationship_label`.
- `assignments`: one summary per case the watcher is assigned to, read from a loaded `caseWatchers.case`. Each has `case_id`, `case_code`, `case_status`, `is_primary`, `pass_status` and `pass_number`.

**Other changes**
- `PatientService::profile()`: eager-load `watchers.caseWatchers.case`, avoiding N+1 queries.
- `PatientResource`: add `open_cases`, each with `id`, `code`, `status`, `date_opened` and `admission_type`. This list feeds the case picker in the Assign dialog.
- Filament `WatchersRelationManager`: replace the free-text relationship field with a dropdown of relationship types.

## Phase 3: Case assignment API (server)

### Assign: `POST cases/{case}/watchers`
- **Body:** `patient_watcher_id` (required), `is_primary`, `is_informant`, `present_from`, `present_until`, `notes`.
- **`StoreCaseWatcherRequest` checks that:**
  - the watcher belongs to `case.patient_id`. Today this is not checked, so another patient's watcher can be assigned.
  - the case status is `open` or `ongoing`.
  - the watcher is not already assigned to this case.
- **Shortcut:** instead of `patient_watcher_id`, the body may hold a nested `watcher: {name, relationship_code, ...}`.
  - `CaseWatcherService::create()` then creates the patient watcher and assigns it in one transaction.
  - This lets the case page add a new person in one step.

### Other assignment routes
- **`PUT case-watchers/{id}`** updates only the assignment fields. The watcher's own details are edited through `PUT watchers/{id}`.
- **`DELETE case-watchers/{id}`** unassigns:
  - It soft-deletes the assignment only, not the watcher.
  - The existing rule stays: it refuses to remove the last primary watcher on a case that requires one.
- **Promote, issue-pass and revoke-pass** work as before. They now also check that the case is `open` or `ongoing`.

### `CaseWatcherService`
- Remove `resolveDirectoryLink()` (which copies details onto the case row) and `assertKnownRelationship()` from the assign path.
- Keep `demoteExistingPrimary`.

### `CaseWatcherResource`
- Replace the copied detail fields with an embedded `watcher`: a `PatientWatcherResource` without the assignments list.
- Keep the pass, presence, primary and informant fields.
- This changes the response shape, so the client is updated in Phase 5 of the same PR.

### Pass numbers (`WatcherPassNumberService`)
- Work out the next number from the highest existing `PASS-{year}-NNNNNN`, instead of from `count()`. Read the number at the end of each pass, and include deleted rows (`withTrashed`).
- Wrap `issuePass()` in the retry-on-duplicate loop that `SocialCaseNumberService::assign()` already uses.
- Move that loop into a shared trait or helper so both services use the same code.

### Requirement status (`WatcherRequirementService::status()`)
- `has_primary` requires both of these:
  - the pass is not `revoked`.
  - `present_until` is empty or in the future.
- Add `requirement_reason`. Its values are `minor`, `incapacitated`, `inpatient`, `er`, `legacy` and `waived`. The banner uses it to explain why a watcher is needed.

### `CaseModelResource`
- Keep `watcher_status` on the case profile.
- Also return it in the responses to creating and closing a case.

## Phase 4: Pass expiry (server)

- Add a command, `mss:expire-watcher-passes`, and schedule it daily in `routes/console.php`.
- It changes `pass_status` from `active` to `expired` wherever `pass_valid_until` is before today.
- Each change is recorded in the audit log through the existing `Auditable` trait.

## Phase 5: Client

### Patient page: Watchers tab (`patients/components/tabs/watchers-tab.tsx`, rewritten)
- **What the tab lists:** the patient's watchers from the directory, not the case rows. It works when the patient has **no case**.
- **Each row shows:**
  - name, relationship label, contact number and address.
  - **assignment chips**, one per case: the case code with Primary, Informant and the pass status.
- **Header action: Add Watcher.**
  - It uses `useAddWatcher` in `use-patient-writes.ts`, which exists but is unused today.
  - Fix it to send `relationship_code`.
- **Row actions:**
  - **Edit:** changes the watcher's details.
  - **Assign to case:**
    - Shown only when `patient.openCases.length > 0`.
    - Opens a new `AssignWatcherDialog` with a case picker. The picker selects the latest open case by default and leaves out cases the watcher is already on.
    - The dialog also has primary, informant, present from/until and notes.
  - **Remove:** disabled while the watcher is assigned to an open case, with a tooltip saying why.
- **Actions on an open case's chip:** Make Primary, Issue/Reissue Pass, Revoke Pass and Unassign. These reuse `useCaseWatcherMutations` and `issue-pass-dialog.tsx`.
- **Tab badge** (`patient-detail-view.tsx`): the number of patient watchers. It now matches the list.
- **Status banner:** `WatcherStatusBanner` shows once for each open case that is blocked, instead of only for `latestCaseId`.

### Case page (`cases/components/case-detail-page.tsx`)
- Add a `CaseWatchersPanel` listing this case's assignments, using `useCaseWatchers`.
- **Assign Watcher** opens a picker of the patient's watchers who are not yet on this case. It also has a "New person" option that creates the watcher and assigns it in one step (the nested shortcut from Phase 3).
- Show `WatcherStatusBanner` here, driven by `caseId`.

### Dialogs
- **`dialogs/watcher-dialog.tsx`:**
  - Covers only the watcher's own details: name, relationship, contact number, address and notes.
  - The relationship dropdown uses `value={type.code}`, which fixes the name-vs-code bug.
  - Address is a new field. Today a new watcher silently gets the patient's address.
  - Remove the "known contacts" picker and `is_primary`.
- **`dialogs/watcher-waiver-dialog.tsx`:** send `watcher_waiver_note`. This fixes the wrong-key bug.
- **`close-case-dialog.tsx`:** read `watcher_status.blocking` from the case and show the reason before the user submits. Keep handling the 422 as a fallback.

### Data layer
- **`cases/api/case-watchers-adapter.ts`:**
  - `toCaseWatcher` reads the embedded `watcher`.
  - `toWatcherStatus` keeps `waiver` and `requirement_reason`.
- **`watcher-status-banner.tsx`:**
  - Explains why a watcher is needed, based on `requirementReason`.
  - Shows "Waived by X on Y" from `waiver`.
  - Hides Revoke on legacy-exempt cases.

### Types
- **Patient watcher types:**
  - Rewrite `patients/types/watcher.types.ts` as `PatientWatcher` with `assignments`. Remove the placeholder pass fields.
  - In `patients-adapter.ts`, `toWatcher` keeps `address`, `relationshipCode` and `assignments`.
- **Patient:** add `openCases` to the patient types and adapter.
- **Case watcher:** in `cases/types/watcher.types.ts`, give `CaseWatcher` a `watcher: PatientWatcher` field in place of the flat detail fields.

## Phase 6: Docs and wrap-up

- Fill in the status table and results in this doc.
- Add one line about watchers to the `patients` and `cases` notes in `CLAUDE.md`.
- Update the OpenAPI docs to the new shapes: `app/Http/Docs/PatientWatcherDocs.php`, `CaseWatcherDocs.php` and `Schemas/*`. Then regenerate.

## Critical files

**Server**
- Models: `app/Models/{PatientWatcher,CaseWatcher,CaseModel,Patient}.php`
- Services: `app/Services/{PatientWatcherService,CaseWatcherService,WatcherRequirementService,WatcherPassNumberService,PatientService}.php`
- Requests: `app/Http/Requests/*Watcher*`
- Resources: `app/Http/Resources/{PatientWatcher,CaseWatcher,Patient,CaseModel}Resource.php`
- DTO: `app/DTOs/PatientWatcherDto.php`
- Routes: `routes/api.php`, `routes/console.php`
- A new migration

**Client**
- `resources/js/features/patients/components/tabs/watchers-tab.tsx`
- Dialogs: `watcher-dialog.tsx`, `watcher-waiver-dialog.tsx`, and the new `assign-watcher-dialog.tsx`
- `watcher-status-banner.tsx`
- `features/cases/`: `api/case-watchers-adapter.ts`, `types/watcher.types.ts`, `components/case-detail-page.tsx`
- `features/patients/`: `api/patients-adapter.ts`, `types/*`

## Verification

### Pest tests
Update `CaseWatcherApiTest`, `CaseWatcherServiceTest`, `WatcherEnforcementTest` and `WatcherRequirementServiceTest`, and add a `PatientWatcherApiTest`.

**Adding and assigning**
- A watcher can be added to a patient who has no case.
- A watcher can be assigned to an open case.
- Assigning is refused for a closed case, for another patient's watcher, and for a watcher already on that case.
- The nested shortcut creates the watcher and assigns it in one request.

**Removing**
- Unassigning the last primary watcher on a case that requires one is refused.
- Deleting a watcher who is assigned to an open case is refused.

**Rules**
- Editing a watcher's details shows up on their case assignment.
- Pass numbers do not repeat after a reissue or in a new year.
- A primary watcher whose pass was revoked, or who has left, does not satisfy the requirement.
- A waiver with reason `other` and a note is saved.

**Background jobs and migration**
- The pass expiry command marks old passes as expired.
- The migration turns copied case rows into directory rows and turns relationship text into codes.

### Checks
- `npx tsc -p tsconfig.app.json`: `npm run typecheck` does not cover `resources/js`.
- `npm run lint`
- `composer test`

### Manual check with `composer dev`
1. On a patient with no case, add, edit and remove a watcher.
2. Open a case for the patient.
3. Assign the watcher from the patient's Watchers tab, then from the case page.
4. Make the watcher primary and issue a pass. Check that the banner and the close-case block clear.
5. Close the case. Check that the assignment becomes read-only history.

## Results

Shipped as #276 (phases 1–3), #277 (phases 4–5) and the Phase 6 docs PR, all under #275.

**What differs from the plan above**
- **`open_cases` on the patient response was not added.** The patient profile already returns `cases`, so the client derives the open ones (`open` or `ongoing`) from it (`toOpenCases` in `patients-adapter.ts`). No server change was needed.
- **The old flat request body still works.** `POST cases/{case}/watchers` with `name`/`relationship`/`contact_number`/`address` is treated as a nested `watcher`, and case watcher responses still carry flat `name`/`relationship`/`contact_number`/`address` copies next to the embedded `watcher`. Remove both once nothing reads them.
- **`mss:backfill-case-watchers` was removed**, not kept: it wrote the columns this plan drops.
- **`TurnaroundTargetDocs`** pointed at a response that does not exist (`Unprocessable`); it now uses `ValidationError`. OpenAPI generation failed on it, so `storage/api-docs/api-docs.json` had not been regenerated for a while. The regenerated file therefore also picks up unrelated endpoints.

**Not verified**
- The new watcher screens were typechecked and linted but not driven in a browser.
