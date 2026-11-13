# Queue: lock a visit to its processor, and offer a DAR entry on completion

## Context

Today anyone with `queue.manage` can complete or cancel a visit another processor started, and can edit or print that patient's records while it runs. Two people clicking **Start** together can also both succeed, because `ServiceVisitService::start()` takes no row lock and the second click overwrites `served_by`.

DAR entries are also typed by hand, separately from the queue, so finishing a patient means re-entering them on the DAR page.

**What changes**

1. Once a processor starts a patient, only they can complete or cancel the visit, or edit and print that patient's records.
2. Supervisor and Admin (and Super Admin) can **Take Over** a stuck visit by giving a reason.
3. Completing a visit shows an "Add to DAR?" modal. **Yes** opens the DAR form pre-filled, and the processor picks the activity.
4. If they click **Not now**, their card under Served Today offers **Add to DAR**, then shows **In DAR** once added. Each visit can only be added once per worker.

## Rules

| Visit state | Who can do what |
|---|---|
| `waiting` | Any `queue.manage` user can Start or Cancel (unchanged) |
| `in_progress` | Only `served_by` can Complete or Cancel, and edit or print records |
| `in_progress` | `queue.override` holders can Take Over (not their own visit), with a required reason. The timer keeps running and `served_by` becomes them |
| `in_progress`, `served_by` is null | Not locked, so a row with no recorded server can't get stuck |
| Admin / Super Admin on records | Keep the existing `isExempt` override in the gate |

An override holder must Take Over before completing or cancelling, so there is one ownership rule and the audit trail shows who took over.

## Backend

**`app/Services/ServiceVisitService.php`**
- Run `start`, `complete` and `cancel` in `DB::transaction`, re-reading the row with `lockForUpdate()` so a stale click sees the current status. This uses the same pattern as `timeIn()`.
- `start`: keep the 422 on `status`, and name the server when there is one: "Ana Desk is already serving this patient."
- `complete`, `cancel`: when in progress and `served_by` is someone else, return 403 "Being served by {name}." `cancel` on a waiting visit stays open to all.
- New `takeOver(visit, user, reason)`: in-progress only (422 otherwise), and 422 if it is already the caller's. Sets `served_by`, `taken_over_by`, `taken_over_at`, `takeover_reason`.
- Add `darEntries` to `WITH`.

**`app/Http/Controllers/ServiceVisitController.php`, `routes/api.php`**
- `POST service-visits/{visit}/take-over`, with `takeover_reason` required (max 255).
- Add `new Middleware('permission:queue.override', only: ['takeOver'])`.

**Migrations (three, following existing patterns)**
- `service_visits`: `taken_over_by` (nullable FK to users), `taken_over_at`, `takeover_reason`.
- `dar_entries`: `service_visit_id` (nullable FK, `nullOnDelete`, indexed). Not a unique index, because soft-deleted lines must be able to be re-added.
- Grant `queue.override` to the `super_admin`, `admin` and `supervisor` role codes, modelled on `2026_10_29_000100_add_patients_import_permission.php`.

**`database/seeders/RolesAndPermissionsSeeder.php`**: add `queue.override` to the permission list and to `Admin` and `Supervisor` in `ROLES`.

**`app/Models/ServiceVisit.php`**: new fillable columns (audited automatically by `Auditable`), the `taken_over_at` cast, and `takenOverBy()` and `darEntries()` relations.

**`app/Http/Resources/ServiceVisitResource.php`**: add `taken_over_by`, `taken_over_at`, `takeover_reason`, and `dar_entry_id` (the requesting user's line for this visit, from the loaded `darEntries`, avoiding N+1).

**DAR**
- `app/Models/DarEntry.php`: add `service_visit_id` to fillable, and a `serviceVisit()` relation.
- `app/Http/Resources/DarEntryResource.php`: expose `service_visit_id`.
- `app/Http/Requests/StoreDarEntryRequest.php`: optional `service_visit_id`. It must be a completed visit, for the same `patient_id`, with `completed_by` as the caller, and the caller must have no live (non-deleted) line for it yet. `UpdateDarEntryRequest` does not accept it, so a link can't be moved.

**Docs**: update `app/Http/Docs/ServiceVisitDocs.php` and `DarDocs.php`.

## Frontend

**New `features/queue/lib/visit-lock.ts`**: a single helper, `visitLockedBy(visit, userId)`, returning the `served_by` user when the visit is in progress and held by someone else, otherwise null. The gate, card and panel all use it.

**`features/queue/hooks/use-queue-action-gate.tsx`**: this carries the records lock to all 18 files that use the gate.
- Add `lockedBy` to the context and the no-provider fallback.
- `canPerformActions = isExempt || (queueStatus === "in_progress" && !lockedBy)`.
- `activeVisit` must prefer my in-progress visit, then another in-progress one, then waiting. The patient-level provider has no `transactionId`, so it can see several open encounters at once and `find()` would pick an arbitrary one.
- Add a `reason` and a `QueueStatusBanner` state for "{name} is serving this patient". The current in-progress banner says editing is enabled, which would be wrong for everyone else.

**`features/queue/components/queue-card.tsx`**
- When locked by someone else: hide Complete and Cancel, and show Take Over if the user has `queue.override`.
- For a completed visit where `completedBy` is me and the user has `dar.manage`: show **Add to DAR**, or an **In DAR** badge when `darEntryId` is set.

**`features/queue/components/queue-board.tsx`, `service-visit-panel.tsx` and `features/patients/components/dialogs/patient-active-queue-status-dialog.tsx`**: these are the three places a visit is completed.
- Apply the same lock to the action buttons, and offer Take Over in each. The panel and the patient dialog currently show them to everyone.
- After `completeMutation` succeeds, show the DAR prompt with the returned visit, if the user has `dar.manage` and the visit has a patient. Do not show it on cancel.
- **Pitfall:** the patient dialog closes itself on completion (`onOpenChange(false)`). Render the prompt as a sibling outside its `<Dialog>` so it survives that close, and export the prompt from `features/queue/index.ts`.

**New shared components in `features/queue/components/`**
- `take-over-visit-dialog.tsx`: reason form.
- `visit-dar-prompt.tsx`: the "Add to DAR?" modal with **Add to DAR** and **Not now**, then `DarEntryDialog` with the prefill below. `onSaved` invalidates `queueKeys.all` so the card flips to In DAR.

**`features/dar/components/dar-entry-dialog.tsx`**: optional `prefill` prop `{ patient, servedTime, remarks, serviceVisitId }`.
- Hide the patient **Change** button when prefilled, since the server rejects a different patient.
- Send `service_visit_id` on create.
- **Pitfall:** the form's reset effect depends on its props, and the board re-renders every second from its ticker. `prefill` must be held in state or memoized by visit id, or the form will wipe itself while the user types.

**Prefill values**: patient from `visit.patient`, `currentDate` from `completedAt`'s local date (so a past day's card back-dates correctly), `servedTime` from `startedAt`, remarks from `visit.remarks`. The activity keeps the form's default for the processor to change. Export the existing `toTimeInput` from `use-queue.ts` for the time.

**Types and API**: add `takenOverBy`, `takenOverAt`, `takeoverReason` and `darEntryId` to `queue.types.ts` and `queue-adapter.ts`; `takeOverVisit` in `queue-api.ts`; `useTakeOverVisit` in `use-queue.ts`; `service_visit_id` on `StoreDarEntryPayload` and `DarEntry`.

## Known limit

The records lock is enforced in the UI only, like the gate today. The patient, guarantee and socioeconomic APIs don't check who holds the visit, so a direct API call could still write. Only the queue endpoints are enforced on the server. Adding server checks to every record write is a separate piece of work.

## Delivery

- One branch and one PR for all of this, from `master`, since it comes from one plan.
- Save this plan as `docs/QUEUE_LOCK_PLAN.md` while the work is in progress, and remove it when it ships.
- Update the Queue, DAR and Auth role notes in `CLAUDE.md`.
- Your 7 uncommitted files (login, `User`, dropdown menu, guarantee form, encounter dialog, UIS tab) are unrelated and stay out of the commits. None of them need editing for this plan.

## Verification

**Tests, `tests/Feature/ServiceVisitTest.php`**
- Another worker gets 403 on complete and cancel of an in-progress visit, and nothing changes.
- The server can complete and cancel their own visit. Waiting visits can still be cancelled by anyone.
- A second Start is refused and `served_by` is unchanged, including from a stale model instance.
- Take Over: Supervisor and Admin succeed, Processor and Case Manager get 403, a reason is required, taking over your own or a non-in-progress visit gets 422. Afterwards the new holder can complete and the previous one can't. `started_at` is unchanged and the audit row records the change.
- Add `take-over` to the "forbids every route" dataset.
- `in_progress` with null `served_by` is not locked.

**Tests, `tests/Feature/DarTest.php`**
- A line links to a visit and `dar_entry_id` appears for its owner only.
- Rejected: duplicate, another patient's visit, a visit not completed, a visit someone else completed.
- A soft-deleted line can be re-added.
- Unlinked lines still work.

**Tests, `tests/Feature/RolesAndPermissionsTest.php`**: add `queue.override` to the role dataset, and to any exact-list assertions it breaks.

**Commands**
```bash
npx tsc -p tsconfig.app.json --noEmit && npm run lint && composer test
```
```bash
vendor/bin/pint
```

**In the browser, with two users side by side (`composer dev`)**
1. A starts a patient. B refreshes and sees "Serving: A" with no Complete or Cancel, and B's patient tabs and encounter dialog are view-only with the banner naming A.
2. A's buttons all work. A completes, the modal appears, **Add to DAR** opens the pre-filled form, and saving flips the card to **In DAR** and adds the line on `/dar`.
3. Complete another with **Not now**, then use the card's **Add to DAR**.
4. A Supervisor takes over an in-progress visit with a reason. A's next action is refused with a clear message.
5. Type in the pre-filled DAR form for several seconds on the board to confirm it doesn't reset.
6. Repeat the lock and the DAR modal from the other two places: the encounter dialog's Queue & TAT tab, and the patient header's queue status dialog.
