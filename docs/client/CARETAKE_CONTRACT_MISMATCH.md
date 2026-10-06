# Caretake — Client/Server Contract Mismatches

Client Phases 6–9 of `PATIENT_CARETAKE_PLAN.md` were written against the
contract that plan *described*. The server's half shipped separately, and in
several places what landed differs from what was planned. The client compiles
and renders against all of it; it is the wire format that disagrees.

Two of these fail loudly (a 405, a dormant type). Three fail **silently** —
the request succeeds, and the client shows or saves the wrong thing. Those are
the ones to fix first.

**Status legend:** ☐ not started · ◐ in progress · ☑ done

| # | Mismatch | Fails | Side | Status |
|---|----------|-------|------|--------|
| 1 | Audit-log filters sent as `filter[…]`, read as top-level | silently | client | ☑ |
| 2 | Reassign is `POST`, client sends `PATCH` | loudly (405) | client | ☑ |
| 3 | Unassign reason sent as `reason`, read as `unassigned_reason` | silently | client | ☑ |
| 4 | Caretaker `user` relation never serialized | silently | server | ☑ server#93 |
| 5 | `ApiCaretakeSummary` does not match the endpoint's shape | dormant | client | ☑ |
| 6 | `restored` event folded into `updated` | cosmetic | client | ☑ |
| 7 | `SystemUser.name` does not exist — the field is `employee_name` | silently | client | ☑ |
| 8 | `subject_type` must be the model basename (`PatientFamilyMember`) | silently | client | ☑ |

Items 7 and 8 were found only once items 1–6 were fixed and the seeded data
made the screens real. Both had been masked: 7 by the fabricated user list that
used to stand in for `/users`, and 8 by mismatch 1, which discarded the
`subject_type` filter before the server ever saw it.

---

## 1 — Every audit-log filter is silently ignored ☑

**The worst of these.** `ActivityLogController::index` validates and reads
filters as **top-level query parameters**:

```php
$filters = $request->validate([
    'user_id' => [...], 'patient_id' => [...], 'case_id' => [...],
    'subject_type' => [...], 'subject_id' => [...], 'event' => [...],
    'date_from' => [...], 'date_to' => [...], 'per_page' => [...],
]);
```

[`activity-log-api.ts`](../src/features/audit/api/activity-log-api.ts) sends
them through `api-client`'s `filters` option, which serializes to
`filter[user_id]=…` per the backend's `ListQuery` contract. That contract does
not apply here — this controller reads the request directly. Laravel's
validator passes happily on absent keys, so **the request succeeds and returns
the unfiltered log**.

There is a second, independent naming error in the same object: the client
sends `causer_id`, the server reads `user_id`.

The compounding effect is on `getRecordHistory`, which is *only* a filter
narrowing. With the filter dropped, `RecordHistoryPopover` shows the first five
entries of the **global** audit log for every record it is opened on —
plausible-looking rows that belong to some other patient entirely. That is
worse than an empty popover, because nothing about it looks wrong.

**Fix.** Move all eight keys out of `filters:` and into `params:`, and rename
`causer_id` → `user_id`. `page` and `per_page` are already correct.

```ts
return apiClient.get<ApiActivityLogPage>("/activity-log", {
  params: {
    page: filters.page ?? 1,
    per_page: filters.perPage ?? 25,
    user_id: filters.userId,
    patient_id: filters.patientId,
    case_id: filters.caseId,
    event: filters.event,
    subject_type: filters.subjectType,
    subject_id: filters.subjectId,
    date_from: filters.dateFrom,
    date_to: filters.dateTo,
  },
})
```

`buildUrl` already skips `undefined`/`null`/`""`, so absent filters stay off
the query string.

Leave the comment about protective cases where it is — it documents a rule
(never re-filter server-withheld rows client-side) that is unaffected by this.

**Gate.** With a `subject_type`/`subject_id` pair, the response must contain
only rows for that record; clearing filters must change the row count.

---

## 2 — Reassign is POST, not PATCH ☑

`routes/api.php`:

```php
Route::patch('caretakers/{caretaker}/unassign', UnassignCaretakerController::class);
Route::post('caretakers/{caretaker}/reassign', ReassignCaretakerController::class);
```

Unassign is `PATCH`; reassign is `POST`. [`patients-api.ts:105`](../src/features/patients/api/patients-api.ts)
uses `apiClient.patch` for both — inferred from the unassign route that existed
at the time. Every handover returns 405.

**Fix.** `apiClient.post` in `reassignCaretaker`. Leave `unassignCaretaker` on
`patch`. Update the doc comment, which also says PATCH.

**Gate.** A reassign completes and the outgoing row gains a `replaced_by_id`.

---

## 3 — The unassign reason is silently dropped ☑

`UnassignCaretakerController` validates `unassigned_reason`:

```php
$validated = $request->validate([
    'unassigned_reason' => ['nullable', 'string', 'max:255'],
]);
```

`UnassignCaretakerPayload` sends `reason`. Because the field is `nullable`, the
request succeeds and the reason is discarded — the assignment ends with no
recorded justification, which is the specific outcome this module exists to
prevent.

**Fix.** Rename the field on `UnassignCaretakerPayload` to `unassigned_reason`
and update `unassign-caretaker-dialog.tsx`'s call site. Keep it optional —
optional-on-unassign matches both the plan and the server.

Note the asymmetry is real, not a typo to normalize away: reassign takes
`reason` (the reason for the handover), unassign takes `unassigned_reason` (the
reason the assignment ended). Same-named fields would be the actual mistake.

**Gate.** Unassign with a reason; the row comes back with
`unassigned_reason` populated and the Caretake tab's handover history renders it.

---

## 4 — Caretaker names render as `User #3` ☑

**Server-side fix.** `PatientCaretakerResource` emits `user_id` but never the
`user` relation, even though `PatientCaretakeController` eager-loads
`['user', 'assignedBy', 'unassignedBy']`. `assigned_by` and `unassigned_by` are
both serialized; `user` — the holder of the assignment, the one name the tab
most needs — is not.

`toCaretakerAssignment` degrades honestly to `User #${raw.user_id}` rather than
inventing a name, so the Caretake tab shows `User #3` on every active card and
every handover row.

**Fix** (in `zcmc_mswd_server`), mirroring the two blocks already there:

```php
'user' => $this->whenLoaded('user', fn () => [
    'id' => $this->user?->id,
    'name' => $this->user?->employee_name,
]),
```

`PatientService::profile()` must eager-load `caretakers.user` too, or the
profile-sourced `patient.caretakers` the tab actually reads keeps the fallback.

The client needs no change — `ApiCaretaker.user` is already optional and the
adapter already prefers it.

**Gate.** Active caretaker cards show real names sourced from the API.

---

## 5 — `ApiCaretakeSummary` does not match the endpoint ☑

Typed during client Phase 6 from the plan's description, before the endpoint
existed:

```ts
{ caretakers: ApiCaretaker[], episode_handler?: {...} }
```

`PatientCaretakeController` actually returns:

```ts
{ caretakers: { active: ApiCaretaker[], history: ApiCaretaker[] },
  recent_activity: ApiActivity[] }
```

The split is deliberate on the server's side — "who is responsible now" and
"who has been" are treated as two questions rather than one flag the client
re-derives. There is no `episode_handler`; that context comes from the case,
via `assignedStaff`.

**Dormant, not broken.** Nothing calls `getPatientCaretake` — `caretake-tab.tsx`
reads `patient.caretakers` off the profile, which works. So this is a wrong type
on an unused function, not a live failure.

**Fix.** Correct the interface to match, and add `recent_activity`. Then decide
whether the tab should move onto this endpoint: it would replace the client-side
`.filter(c => c.isActive)` split and supply the recent-activity strip in one
request, at the cost of a second call per patient view. Worth doing when Phase 7
is revisited, not as part of this cleanup.

---

## 6 — `restored` events are folded into `updated` ☑

`ActivityLogService::EVENTS` is `['created', 'updated', 'deleted', 'restored']`.
The client's `AuditEvent` union has three, and `toAuditEvent` maps anything
unrecognized to `"updated"` — so a soft-delete restore is displayed as an edit.

Low stakes, but it is a real event the trail can carry, and mislabelling a
restore as an update is the kind of thing an audit module exists not to do.

**Fix.** Add `"restored"` to `AuditEvent`, a badge in `history-tab.tsx`'s
`getEventBadge`, and an option to both event filters. `toAuditEvent`'s fallback
stays as the catch-all for anything genuinely unknown.

---

## 7 — `SystemUser.name` does not exist on the wire ☑

`UserResource` emits `employee_name`. It has no `name` key at all, but
`SystemUser` declared `name: string` as required, so every caretaker picker and
the audit log's user filter read `undefined`.

This was invisible for as long as `getUsers` fell back to a hardcoded staff
list, whose objects *did* have `name`. Deleting that fallback is what exposed
it — and tightening the type immediately surfaced a third call site
(`audit-log-filters.tsx`) reading the same missing field.

**Fix.** `SystemUser` mirrors `UserResource` exactly; a `userDisplayName()`
helper renders `employee_name` and falls back to `User #{id}` rather than blank.

Related: `/users` is gated on `permission:users.view`, which Case Manager and
Processor do not hold. `getUsers` used to swallow that 403, making an
authorization failure indistinguishable from "no staff exist". It no longer
catches, and both caretaker dialogs say which it is instead of showing an empty
select.

---

## 8 — `subject_type` must be the model's class basename ☑

`ActivityLogService::resolveSubjectType` maps an incoming type to
`App\Models\{type}` when no such class already exists. The family popover sent
`"FamilyMember"`, but the model is `PatientFamilyMember` — so it resolved to
nothing, matched nothing, and the popover silently came up empty. `Patient` and
`PatientWatcher` were already correct.

**Fix.** `subjectType="PatientFamilyMember"`, plus a doc comment on
`RecordHistoryPopover.subjectType` stating the rule, since the failure mode is
an empty popover rather than an error.

**A caution for anyone verifying this in Tinker.** Tinker auto-aliases bare
class names it sees in your snippet, which makes `class_exists('Patient')` true
and short-circuits `resolveSubjectType` — so *every* `subject_type` filter
returns 0 rows there regardless of correctness. `ActivityLogEndpointTest`
exercises the same filter over HTTP and passes; trust that over a Tinker
session.

---

## Adjacent — not contract drift, but in the same blast radius

Two defects found alongside these. **Both are now fixed** — recorded here
because the reasoning matters more than the diffs:

1. **`getUsers` fabricates staff.** [`auth-api.ts:60–77`](../src/features/auth/api/auth-api.ts)
   returns `DEFAULT_STAFF_USERS` — five hardcoded names with ids 1–5 — whenever
   `/users` errors or returns an unexpected shape, swallowing the error. Those
   ids are submitted as `user_id` on a real caretaker assignment, so a transient
   failure silently assigns custody to whichever real user holds id 3. `/users`
   does exist, so it may never fire — but it violates the adapter's own
   never-fabricate rule and should be deleted in favour of surfacing the error.

   **Fixed.** The fallback is gone and the error surfaces; see item 7, which
   that fallback had been masking.

2. **Two `RecordHistoryPopover` call sites pass the wrong id.**
   [`family-tab.tsx:41`](../src/features/patients/components/tabs/family-tab.tsx)
   and [`watchers-tab.tsx:25`](../src/features/patients/components/tabs/watchers-tab.tsx)
   pass `subjectId={patient.id}` with `subjectType="FamilyMember"` /
   `"PatientWatcher"` — asking for a family member whose id happens to equal the
   patient's. Only `profile-tab.tsx`'s `Patient` + `patient.id` pairing is
   coherent. These need to be per-row triggers, or the header trigger needs a
   patient-scoped filter instead of a subject-scoped one. Currently masked by
   mismatch #1, which ignores the filter entirely; fixing #1 turns these into
   visibly empty popovers.

   **Fixed** as per-row triggers — each row's own `fam.id` / `watch.id`, which
   is the scope the popover was designed for. A patient-scoped variant was
   prototyped and dropped: with the triggers on rows, nothing calls it, and an
   unused second code path is worse than none.

---

## Verification

No test runner is configured. After the client-side fixes:

```bash
npx tsc -b && npm run lint
```

`npm run typecheck` is **not** a sufficient gate — it runs `tsc --noEmit`
against the root config, which excludes `src/`. It passes while `tsc -b` fails.

Then, against a running server with a patient that has caretaker activity:

1. Assign → reassign → unassign one caretaker. All three must return 2xx, the
   handover chain must render, and both reasons must appear in the history list.
2. Open the audit log page, set a user filter and a date range, and confirm the
   row count changes and survives a reload (filter state is in the URL).
3. Open a record-history popover and confirm every row belongs to that record.
