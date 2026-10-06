# Case Module — Frontend Plan (zcmc_mswd_client)

Build the client-side **Case Module**: cases as first-class episodes with a
caseload queue, case detail + lifecycle, a per-encounter open flow, and the
server rewrite's new fields (`card_color`, `transaction_id`, `transaction_type`,
`created_by`). Mirrors the server Case Module (issues #151/#152) and depends on
client routing (`CLIENT_ROUTING_PLAN.md`) landing first.

**Status legend:** ☐ not started · ◐ in progress · ☑ done

| Phase | Depends on | Status |
|-------|-----------|--------|
| 0. Routing foundation (react-router v7) | server deployed | ☑ done |
| 1. Case domain + data layer (`features/cases`) | 0 | ☑ done |
| 2. Caseload screen (`/caseload`) | 1 | ☑ done |
| 3. Case detail (`/cases/:id`) + lifecycle | 1 | ☑ done |
| 4. Open-case flow (3 entry points) | 1 | ☑ done |
| 5. card_color + new-field surfacing | 1 | ☑ done |


---

## Context

The Laravel server has a complete **Case Module**: a case is an episode with a
lifecycle (open → assign → close/refer → reopen), a per-encounter open path
(`transaction_id`, snapshotted `admission_type`/`transaction_type`, `created_by`,
manual `card_color` of white/green/orange/pink), a personal worklist
(`GET /my-caseload`), sub-records (assessments, social case, watchers,
diagnostics), and HIS-encounter linking.

The **client has no case-management surface**. Cases appear only as "most recent
case" folded into the patient adapter, and an "Assess Encounter" dialog attaches
an encounter to an *already-open* case — but there is no way to **see the case
list, open a case, run its lifecycle, or view a caseload**, and nothing renders
the new fields. The app is still navigated by a two-value `currentView`
`useState` in `main-layout.tsx`; `docs/CLIENT_ROUTING_PLAN.md` specifies
react-router but it is unbuilt.

Confirmed scope: **full Case Module frontend**, react-router included now,
open-case entry points from a hospital encounter, from patient detail, and a
global "New Case" button.

## What exists to reuse (do not rebuild)

- **Data-layer pattern** — `src/lib/api-client.ts` (`apiClient.get/post/put/delete`,
  `filters` → `filter[k]=v` ListQuery params, `ApiError.firstValidationMessage`,
  401 → token clear). Feature `*-api.ts` unwrap `{data}` / `{data,meta}`; adapters
  map to UI types; hooks use a query-key factory + invalidation. Mirror
  `features/hospital/hooks/use-hospital-encounters.ts` and its api/adapter.
- **Encounter → case attach** — `features/hospital` already has
  `getAssignableCases`, `assessEncounter`, `AssignableCase`, and
  `assess-encounter-dialog.tsx`. The open-case flow is the missing inverse; keep
  the assess dialog for "attach to an existing case."
- **Case sub-records already built** — `features/cases` has assessments, social
  case, watchers (api + adapters + hooks + components). Case *detail* composes
  these; it does not reimplement them.
- **Permissions** — `usePermission("cases.view"|"cases.create"|"cases.update"|
  "cases.delete"|"cases.waive_watcher")` (strings must match `routes/api.php`).
  Gate queries with `enabled`, not by allowing 403s.
- **UI kit** — shadcn (`base-mira`/`mist`) over `@base-ui/react` (NOT Radix),
  `lucide-react`, `date-fns`/`react-day-picker`, Tailwind v4 tokens in
  `src/index.css`. Prettier: no semicolons, double quotes.

> The repo `CLAUDE.md` is stale — it predates the `cases` and `hospital` feature
> folders. Trust the code.

## Server contract (already shipped)

- **List/CRUD**: `GET /cases` (paginated, ListQuery filters), `POST /cases`,
  `GET/PUT/DELETE /cases/{id}`, `POST /cases/{id}/restore`.
- **Worklist**: `GET /my-caseload` (buckets via `social_case_status`),
  `GET /my-follow-ups`.
- **Profile/timeline**: `GET /cases/{id}/{profile,history,activities}`.
- **Lifecycle**: `POST /cases/{id}/{assign,close,refer,reopen}`.
- **Open per-encounter**: `POST /cases` with `transaction_id` (snapshots
  `admission_type`/`transaction_type`); `admission_type` required only without a
  `transaction_id`; `card_color` optional (default white); `created_by` server-set.
- **Lookups for selects**: `GET /hospital-case-types`, `GET /hospital-transaction-types`.
- **`CaseModelResource`** fields: `id, case_code, patient_id, assigned_user_id,
  created_by, case_type, priority_level, status, admission_type, transaction_id,
  transaction_type, card_color, date_opened, date_closed, patient, assigned_user,
  created_by_user, social_case, *_count, watchers, watcher_status, created_at,
  updated_at`. `card_color ∈ {white,green,orange,pink}`.

---

## Phase 0 — Routing foundation (react-router v7)

Implements `docs/CLIENT_ROUTING_PLAN.md`.

- Add `react-router` (v7). Wrap root in `<BrowserRouter>` in `src/main.tsx`
  (inside the existing QueryClient/Theme providers).
- Replace the `currentView` switch in `components/layout/main-layout.tsx` with
  `<Routes>`:
  - `/` → patient list (current master view)
  - `/patients/:patientId` → `PatientDetailView`, active tab from `?tab=`
    (thread the tab through the 9-tab pane instead of internal state)
  - `/caseload` → `CaseloadPage` (Phase 2)
  - `/cases/:caseId` → `CaseDetailPage` (Phase 3)
  - `/audit` → existing `AuditLogPage`
- `App.tsx` keeps wiring `usePatients()`/`usePatientDetail()`, but selection is
  driven by the route param. Sidebar row click → `navigate('/patients/' + id)`;
  audit/caseload become nav links gated by `usePermission`.
- Mechanical move only — no visual redesign.

## Phase 1 — Case domain + data layer (`features/cases`)

- `types/case.types.ts` — `CaseCardColor` union + `CaseRecord` UI model,
  `CaseListItem`, and payloads (`OpenCasePayload`, `UpdateCasePayload`,
  `AssignPayload`, `ReferPayload`). Re-export from `types/index.ts`.
- `api/cases-api.ts` — one fn per endpoint (list, myCaseload, get, profile,
  open(create), update, assign, close, refer, reopen, archive, restore),
  unwrapping envelopes like `hospital-transaction-api.ts`.
- `api/cases-adapter.ts` — `toCaseRecord` / `toCaseListItem` (camelCase,
  `card_color` → `cardColor`, resolve `assigned_user`/`created_by_user` names).
  Follow the adapter rules (`NOT_ON_FILE`/`NOT_TRACKED`, never fabricate).
- `hooks/use-cases.ts` + `hooks/use-case-mutations.ts` — query-key factory
  `caseKeys` (`list(filters)`, `caseload(bucket)`, `detail(id)`, `profile(id)`),
  `enabled`-gated on `cases.view`; every write invalidates through it (and the
  patient detail keys where a case surfaces).
- No admission/transaction-type lookup hooks: **Case Type and Admission Type are
  supplied by the hospital encounter and are read-only** (see "Field
  editability"), so there is no dropdown to populate. The encounter's own
  fields (`admission_case_type`, `transaction_type`) come from the existing
  `features/hospital` encounter data — reuse it, don't re-fetch a vocabulary.

## Field editability (applies across Phases 3–4)

- **Case Type** and **Admission Type** are **provided by the hospital
  encounter**, shown **read-only** (plain text, never a dropdown), and **cannot
  be updated** anywhere in the UI — not in the open-case dialog, not in case
  detail. They are display-only reflections of the HIS encounter.
- The only worker-set fields when opening/managing a case are **Priority** and
  **Card Colour**. `case_code`, `created_by`, dates, and `transaction_type` are
  server-managed/read-only.
- Contract note for the implementer: the server snapshots `admission_type`/
  `transaction_type` from the encounter but still expects a `case_type` on
  `POST /cases`. The client sends the encounter-derived Case Type through as a
  hidden, non-editable value (never a user choice). If the server should instead
  snapshot `case_type` too, that is a **server** change to raise separately —
  this plan keeps it frontend-only and passes the encounter value through.

## Phase 2 — Caseload screen (`/caseload`)

- `components/caseload-page.tsx` — `GET /my-caseload` queue: status-bucket tabs
  (`none/draft/for_review/finalized`) + filter/page state in `?search` params
  (routing plan §3). Rows are **case cards** showing `card_color`, `case_code`,
  patient, `case_type`, `priority_level`, `status`, `admission_type`. Row click →
  `navigate('/cases/' + id)`.
- `components/case-card.tsx` — reusable card; `card_color` as a left accent/badge
  via the Phase 5 map.
- Sidebar "My Caseload" nav link gated on `cases.view`, matching the audit-view
  gating in `components/layout/sidebar.tsx`.

## Phase 3 — Case detail (`/cases/:caseId`)

- `components/case-detail-page.tsx` — header showing `case_code`, status/priority
  badges, `card_color`, **Case Type and Admission Type as read-only text**
  (from the encounter — never editable), transaction type, opened-by/assigned-to,
  and dates + a tabbed body **composing existing** `features/cases` sub-records
  (assessments, social case, watchers) and linking to the patient.
- **Lifecycle actions** via `use-case-mutations`: Assign (user select), Close,
  Refer (notes), Reopen, Archive/Restore — gated on `cases.update`/`delete`,
  each surfacing `ApiError.firstValidationMessage` (e.g. the watcher-requirement
  block on close) inline.
- **`card_color` is the only inline-editable case field** here (select, default
  white) via `PUT /cases/{id}`. Case Type / Admission Type are not editable.
- Watcher/assessment/social-case editing reuses current components; only wiring
  into case-addressed routes is new.

## Phase 4 — Open-case flow (three entry points)

One shared `components/dialogs/open-case-dialog.tsx` driving `POST /cases`.
**A case is always opened against a hospital encounter**, which supplies
**Case Type** and **Admission Type** (read-only, shown as text, never a
dropdown, never editable). The worker's only inputs are **Priority** and
**Card Colour**. The three entry points differ only in where the encounter is
chosen:

1. **From a hospital encounter** — "Open Case" on
   `features/hospital/components/hospital-encounter-detail.tsx`. The encounter is
   already in hand: pre-fills `patient_id` + `transaction_id` and displays its
   Case Type / Admission Type / transaction type read-only. (Keep the existing
   "Assess" dialog for attaching an encounter to an *already-open* case.)
2. **From patient detail** — "Open Case" on the patient view opens the dialog with
   the patient fixed; the worker picks one of that patient's HIS encounters
   (reuse `features/hospital` encounter list), which fills Case Type / Admission
   Type read-only.
3. **Global "New Case"** — header/caseload button: pick patient (reuse patient
   search) → pick one of their encounters → same read-only fields.

The encounter is required in every path, so `transaction_id` is always sent and
Case Type / Admission Type are never typed by hand. On success invalidate
`caseKeys` + navigate to `/cases/{newId}`.

> Open question — a patient with **no HIS encounter at all** (true walk-in) has
> no source for Case Type / Admission Type and so cannot open a case under this
> rule. Flagged for confirmation; treated as out of scope until decided.

## Phase 5 — card_color + new-field surfacing

- `lib/case-card-color.ts` — single map `cardColor → { badge classes, accent
  token, label }` using existing Tailwind tokens; used by the caseload card,
  case detail header, and any case row. Accessible (label, not color alone).
- Surface `transaction_id`/`transaction_type`/`created_by_user` in the case
  detail header and the patient adapter's "most recent case" block
  (`NOT_ON_FILE` when absent).

---

## Verification

- `npm run typecheck` + `npm run lint` clean (strict TS fails on unused imports);
  Prettier style (no semicolons, double quotes).
- `npm run dev` against a running Laravel API (`php artisan serve`; dev proxies
  `/api` → `127.0.0.1:8000`). Log in (Sanctum token).
- End-to-end in the browser as a `cases.*` user:
  1. `/caseload` lists my open cases with correct `card_color` accents and bucket
     tabs; refresh preserves filters (URL params).
  2. Open a case three ways — from an encounter, from a patient (pick one of
     their encounters), from the global button. In every case Case Type and
     Admission Type appear as **read-only text** from the encounter (no dropdown,
     not editable) and the worker sets only Priority + Card Colour. Each lands on
     `/cases/{id}`.
  3. On `/cases/:id`: change `card_color` (the only editable case field); confirm
     Case Type / Admission Type are read-only; assign; refer with notes; close
     (confirm the watcher-requirement block surfaces for an inpatient case with
     no watcher); reopen. State reflects the server after invalidation.
  4. Deep-link `/patients/:id?tab=social-case` and `/cases/:id` resolve directly.
- Permission gating: a `patients.view`-only user sees no caseload nav and cannot
  open/lifecycle a case (actions hidden, queries disabled — no 403 pages).

## Out of scope

- No server changes — the API is shipped.
- No redesign of existing patient/assessment/social-case/watcher components
  beyond routing them by case id and adding new fields.
- Follow-ups screen (`/my-follow-ups`) and case-summary PDF deferred unless
  requested (endpoints exist; a later phase).
