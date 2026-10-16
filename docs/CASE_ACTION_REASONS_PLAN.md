# Fix: case actions drop the worker's reasons (Group A)

## Context
The Close, Refer, Reopen and Assign dialogs on the case page ask the social worker
for a reason and notes. The server throws all of it away:

- `CloseCaseController` ignores the request body: `reason` and `notes` are lost.
- `ReferCaseController` validates only `notes`: `referred_to` and `reason` are lost.
- `ReopenCaseController` ignores the body, and the UI only shows `window.confirm`
  without asking for a reason.
- `AssignCaseController` and `AssignCaseRequest` drop `notes`. The activity row is
  hard-coded to "Reassigned to X".
- The case page's **Activity** tab reads `act.description` / `act.event`, which
  `CaseActivityResource` never returns. Every row shows the label "Activity", so even
  saved notes are never displayed.

Outcome: every case action records why it happened, and the worker can read that in
the case timeline. Storage is the existing `case_activities` timeline. There is no
migration, and history survives repeated close → reopen cycles. Structured closure
reasons and referral records come later in their own Closure and Referral plans.

## Delivery
Issue #268. The server (phases 1-3) shipped in #269 and the client (phases 4-5) in
#270, so the plan was delivered in two PRs, not one. Each phase leaves the test
suite green.

**Status legend:** ☐ not started · ◐ in progress · ☑ done

| Phase | Side | Status |
|---|---|---|
| 1. Backend contract | Server | ☑ #269 |
| 2. Filament admin | Server | ☑ #269 |
| 3. Timeline API | Server | ☑ #269 |
| 4. Frontend dialogs | Client | ☑ #270 |
| 5. Activity tab display | Client | ☑ #270 |
| 6. End-to-end verification | Both | ☑ see "Phase 6 results" |

## Deviations from the plan as first written
- **Reopen reason was required in two steps.** #269 kept `reason` optional on
  `POST /cases/{id}/reopen`, because the then-current client reopen button sent no
  body. #270 added the reopen dialog and made it required.
- **Filament close and reopen have no bare confirmation.** The form modal replaces
  `requiresConfirmation()`.
- **`actor_name` is null for `case_reassigned`.** That row stores the new assignee in
  `assigned_user_id`, not the person who reassigned. Showing the real actor needs a
  new column on `case_activities`, which this plan avoided.

---

## Phase 1: Backend contract (requests, controllers, service)
Goal: the API validates and stores the reason and notes.

**Form requests** (new, in `app/Http/Requests/`, following `AssignCaseRequest`):
- `CloseCaseRequest`: `reason` required string max 255, `notes` nullable string max 2000.
- `ReferCaseRequest`: `referred_to` required string max 255, `reason` required string
  max 1000, `notes` nullable string max 2000.
- `ReopenCaseRequest`: `reason` required string max 1000.
- `AssignCaseRequest`: add `notes` nullable string max 2000.

**Controllers**: `CloseCaseController`, `ReferCaseController`, `ReopenCaseController` and
`AssignCaseController` take the new requests and pass the validated values through.

**`app/Services/CaseModelService.php`**: widen the signatures and write the text into
the activity's `notes` through the existing private `recordActivity()`:
- `close(CaseModel $case, User $actor, string $reason, ?string $notes = null)`
  → `"Reason: {reason}"` plus `"\nNotes: {notes}"` when present.
- `refer(CaseModel $case, User $actor, string $referredTo, string $reason, ?string $notes = null)`
  → `"Referred to: {agency}\nReason: {reason}"` (+ notes).
- `reopen(CaseModel $case, User $actor, string $reason)` → `"Reason: {reason}"`.
- `assign(..., ?string $notes = null)` → keep `"Reassigned to {name}"`, and add
  `"\nNotes: {notes}"` when present.
- One small private helper builds the multi-line notes, so the four methods format
  their text the same way.

**Tests** (`tests/Feature/CaseManagementTest.php`):
- Update the existing close and refer tests to send the new required fields.
- 422 when `reason` is missing (close, reopen) and when `referred_to` / `reason` is
  missing (refer).
- Assert the `case_activities.notes` text for close, refer, reopen and assign (with notes).

**Exit check**: `composer test` passes. Filament still calls the old service
signatures, so Phase 2 must land in the same PR before merge.

---

## Phase 2: Filament admin
Goal: the `/admin` actions use the new service signatures and collect the same fields.

`app/Filament/Resources/Cases/CaseResource.php`:
- `closeAction`: `TextInput reason` (required) and `Textarea notes`.
- `referAction`: `TextInput referred_to` (required), `Textarea reason` (required), and
  the existing `notes`.
- `reopenAction`: `Textarea reason` (required).
- `assignAction`: `Textarea notes` (optional).

**Tests** (`tests/Feature/CaseFilamentTest.php:86`): `callAction('close', data: ['reason' => ...])`,
plus refer and reopen form data where they're already tested.

**Exit check**: `composer test` passes.

---

## Phase 3: Timeline API
Goal: the timeline endpoint returns who acted.

`app/Http/Resources/CaseActivityResource.php`: add `actor_name` from the `assignedUser`
relation, which `CaseActivitiesController` already eager-loads.

**Tests**: `GET /cases/{case}/activities` returns `actor_name`.

**Exit check**: `composer test` passes.

---

## Phase 4: Frontend dialogs (`resources/js/features/cases/`)
Goal: the UI sends what the API now requires.

- `types/case.types.ts`: `CloseCasePayload.reason` becomes required. Add `ReopenPayload { reason: string }`.
- `api/cases-api.ts` + `hooks/use-case-mutations.ts`: `reopenCase` sends `{ reason }`.
- New `components/dialogs/reopen-case-dialog.tsx`, copying `close-case-dialog.tsx`
  (same layout, error handling and `ApiError.firstValidationMessage`), with a required
  reason textarea.
- `components/case-detail-page.tsx`: replace `window.confirm` in `handleReopen` with
  the new dialog.
- `close-case-dialog.tsx`: block submit when the reason is blank, matching the refer dialog.

**Exit check**: `npx tsc -p tsconfig.app.json --noEmit` (`npm run typecheck` skips
`resources/js`) and `npm run lint` pass.

---

## Phase 5: Activity tab display
Goal: saved reasons are actually readable.

`components/case-detail-page.tsx`, Activity tab: show a readable label mapped from
`activity_type` (case_opened → "Case opened", case_closed, case_referred,
case_reopened, case_reassigned …, falling back to a title-cased type), then
`activity_date`, `actor_name`, and `notes` with line breaks (`whitespace-pre-line`).

**Exit check**: typecheck and lint pass.

---

## Phase 6: End-to-end verification
1. `npm run typecheck && npm run lint && composer test` (plus the app-tsconfig check above).
2. Manual check with `composer dev` as the seeded Case Manager (janice.torres@zcmc.test).
   Open a case and:
   - assign it with notes
   - refer it to "PCSO" with a reason
   - reopen it with a reason
   - close it with a reason and notes

   The Activity tab should show each event's label, actor, date and the typed text.
3. Repeat close, refer and reopen from Filament `/admin`.

## Out of scope (later plans)
Structured closure reasons and closure checklist, referral records and letters,
interventions tab, and the Social Case Study Report rewrite. Each gets its own
`docs/*_PLAN.md`.

## Phase 6 results
Run on 2026-10-16 against a throwaway SQLite database (seeded with
`RolesAndPermissionsSeeder` + `SamplePatientSeeder`), a second Laravel server on
`127.0.0.1:8001`, and the built-in browser. The developer's MySQL database was not
touched.

Signed in as the seeded Case Manager on case `CS-2026-412`:

| Step | Result |
|---|---|
| Assign to another worker, with notes | Status unchanged, assignee updated, timeline shows "Case reassigned" with the notes |
| Refer to PCSO with reason and notes | Status `referred`, timeline shows agency, reason, notes and the acting worker |
| Reopen with an empty reason | Blocked in the dialog: "Please state why this case episode is being reopened." |
| Reopen with a reason | Status `ongoing`, timeline shows the reason |
| Close with an empty reason | Blocked in the dialog: "Please state the closure reason." |
| Close with reason and notes | Status `closed`, timeline shows both |

Signed in as the seeded Supervisor at `/admin`:

| Step | Result |
|---|---|
| Reopen with an empty reason | Blocked by the required field |
| Reopen with a reason | Saved; the stored timeline row carries the reason |
| Close modal | Shows required "Closure reason" and optional "Closure notes" |

Not exercised in the browser: Filament **Refer** and **Assign** modals. Both are
covered by the Pest tests (`CaseFilamentTest`, `CaseManagementTest`).

Observations, not caused by this plan:
- The Case Manager role has no `panel.access`, so `/admin` returns 403 for it. Only
  Supervisor and above can use the Filament actions.
- The browser console logs a React hydration warning for a `<button>` nested in a
  `<button>` in the header theme-toggle tooltip.
