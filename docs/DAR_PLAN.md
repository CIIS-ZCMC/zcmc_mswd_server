# DAR (Daily Accomplishment Report) — Plan (server + Inertia SSR client)

Each social worker keeps a **Daily Accomplishment Report** listing the patients they served on a given day. The system
has no record of this yet. `patients` has no worker column, and worker activity is spread across guarantees, cases,
progress notes, slip prints and the audit log. So the DAR is kept as **manual entries** made by the worker. It is shown
as an on-screen table, printed as a PDF and exported as a CSV. Ships as one issue, one branch (`feat/dar`) and one PR.

**Decisions (user):**
- **Manual entries.** The patient is **selected from the MSWD registry only** (the `patients` table). Free-text names
  and HIS import from the picker are not allowed.
- **Each entry records:** patient, activity/service, time served and remarks.
- **Own DAR only.** Every query is scoped to `auth()->id()`, and there is no worker picker.
- **Single day per report.**
- **Output:** on-screen table, printable PDF and CSV export.
- **PDF signatory:** a **Prepared by** block only (the worker). There is no Noted-by block.

**Defaults (not yet confirmed by the user; easy to change):**
- **Activity** is a fixed list in a model constant: Interview, Assessment, Counseling, Guarantee / Assistance,
  Referral, Follow-up, Home/Ward Visit, Documentation, Other. In v1 it is not a Library table.
- **Who can change entries:** only the owner can create, edit or delete them.
- **Dates:** past dates are allowed, so a forgotten entry can be added later. Future dates are rejected.
- **Duplicates:** the same patient may appear more than once on a day, for different activities.

**Status legend:** ☐ not started · ◐ in progress · ☑ done

| Phase | Side | Depends on | Status |
|-------|------|------------|--------|
| 1. Schema, `DarEntry` model, `dar.manage` permission | server | — | ☑ done (#240) |
| 2. API: entries CRUD, day listing, PDF/CSV export | server | 1 | ☑ done (#240) |
| 3. `/dar` page, entry dialog, sidebar button | client | 2 | ☐ not started |
| 4. Tests, docs, verification | both | 1–3 | ☐ not started |

## Phase 1 — Schema, model, permission

- **Migration `create_dar_entries_table`:**

  | Column | Type | Notes |
  |--------|------|-------|
  | `id` | bigint | |
  | `user_id` | FK `users` | restrict on delete |
  | `patient_id` | FK `patients` | |
  | `entry_date` | date | |
  | `served_time` | time | nullable |
  | `activity` | string(40) | |
  | `remarks` | text | nullable |

  Plus timestamps and `softDeletes`, and an index on `(user_id, entry_date)`.
- **`app/Models/DarEntry.php`:**
  - An `ACTIVITIES` constant.
  - `belongsTo` relations to `user` and `patient`.
  - A `forUserOn(User, date)` scope.
  - Uses `Concerns\Auditable`, with `activityOwner()` pointing to the patient, so entries show in the patient's audit
    history.
  - Update `AuditCoverageTest` and `ActivityOwnershipResolverTest` for the new model.
- **Permission `dar.manage`:**
  - Add it to `RolesAndPermissionsSeeder` for MSS Head, Supervisor, Case Manager and Processor. Admin already has `*`.
  - Add an additive migration modeled on `2026_10_09_010200_add_library_permission.php`.
  - Update `RolesAndPermissionsTest`.

## Phase 2 — API

All routes go in `routes/api.php`, inside `auth:sanctum` and behind `permission:dar.manage`.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/dar?date=YYYY-MM-DD` | The caller's entries for that day, ordered by `served_time` then `id`. The patient is eager-loaded with name, hospital no./MSWD ID, age, sex and address. |
| POST | `/api/dar-entries` | Create an entry. |
| PATCH | `/api/dar-entries/{entry}` | Update an entry. The owner only; anyone else gets 403. |
| DELETE | `/api/dar-entries/{entry}` | Soft-delete an entry. The owner only; anyone else gets 403. |
| GET | `/api/dar/export?date=…&format=pdf\|csv[&download=1]` | The PDF opens inline unless `download=1` is passed. The CSV is streamed. |

- **Validation** (`StoreDarEntryRequest` / `UpdateDarEntryRequest`):

  | Field | Rule |
  |-------|------|
  | `patient_id` | must exist in `patients` and not be soft-deleted |
  | `entry_date` | `before_or_equal:today` |
  | `served_time` | `date_format:H:i`, nullable |
  | `activity` | `in:` `DarEntry::ACTIVITIES` |
  | `remarks` | max 500 characters |

  The ownership check lives in `DarEntryController::ensureOwner()` (403), not a policy: the app has no policy
  classes.
- **`GET /api/dar` response:** `{ date, data: DarEntry[], summary: { patients_served, entries, by_activity }, activities }`.
  `activities` is the key → label list the entry dialog offers. Each entry's `patient` carries `name`
  ("Last, First Middle"), `hospital_id`, `mswd_id`, `age` (as of the entry date), `sex` and `address`.
- **`app/Services/DarReportService.php`:**

  | Method | Returns |
  |--------|---------|
  | `entriesFor(User, Carbon)` | the worker's entries for the day |
  | `toRows()` | the rows for the CSV |
  | `renderPdf()` | `Pdf::loadView('pdf.dar', …)->setPaper('a4', 'portrait')` |
  | `filename()` | `DAR_<employee>_<date>.pdf` |

- **The export controller** follows two existing patterns:
  - `CityMayorSlipPdfController`: implements `HasMiddleware` and handles preview vs download.
  - The CSV branch of `SocialCaseReportExportController`: streams rows with `fputcsv`.
- **`resources/views/pdf/dar.blade.php`:**
  - Includes `pdf/partials/_styles.blade.php` for the letterhead, `table.data` and DejaVu Sans.
  - Header: the title "Daily Accomplishment Report", the date, and the worker's name and position.
  - Table columns: # / Time / Patient / Hospital No. / Age-Sex / Activity / Remarks.
  - Summary: total distinct patients served and a count per activity.
  - **Prepared by:** `employee_name`, `position` and `license_no` from the user, the same source the slips use.

## Phase 3 — Client (`resources/js/features/dar/{api,components,hooks,types}`)

- **Page route:** `GET /dar` in `routes/web.php` goes to `DarPageController`, which renders `Dar/Index` inside
  `MainLayout`. It is gated by `permission:dar.manage`, and the server passes `today` as a prop.
- **Sidebar:** add a "DAR" button next to Reports in `resources/js/components/layout/sidebar.tsx`, gated by
  `usePermission("dar.manage")`.
- **`dar-page.tsx`:**
  - A date picker that defaults to `today` and doesn't allow future dates.
  - Summary chips: patients served and number of entries.
  - The entries table, with edit and delete on each row.
  - A toolbar with:
    - **Add entry**
    - **Print PDF**, using `openPdfInNewTab` from `resources/js/lib/open-pdf.ts`
    - **Export CSV**, using the `fetchBlob` pattern from `features/reports/api/reports-api.ts`
- **`dar-entry-dialog.tsx`:**
  - A patient combobox that reuses `useRegistryQuickSearch` (`features/patients/hooks/use-registry-quick-search.ts`)
    and searches the registry only.
  - An activity select, a time input and a remarks textarea.
- **Hooks:** `useDarEntries(date)` plus `useCreateDarEntry`, `useUpdateDarEntry` and `useDeleteDarEntry`. They use
  TanStack Query, invalidate `["dar", date]`, and call `apiClient`.
  - Use the backend's snake_case keys as they are. Do **not** copy `reports-adapter.ts`; its keys don't match its
    backend.
- **SSR safety:** nothing touches `window` at module scope. The default date comes from the server prop, so the first
  render matches the server and there is no hydration mismatch.

## Phase 4 — Tests & docs (`tests/Feature/DarTest.php`, Pest)

- **CRUD:** the owner can create, list, update and delete entries. Another user's entry is never listed, and updating or
  deleting it returns 403.
- **Validation:** rejects a future date, an unknown activity, and a missing or soft-deleted patient.
- **Permissions:** a user without `dar.manage` (no role) gets 403 on every endpoint.
- **PDF export:**
  - Returns `application/pdf` with a `%PDF` header.
  - `download=1` sets `content-disposition`.
  - `outputHtml()` contains the patient names, the activity counts and the Prepared-by name.
- **CSV export:** `streamedContent()` has the header row plus one row per entry.
- **Audit:** creating an entry writes an `activity_log` row with `patient_id` set.
- **Docs:** add a `dar` bullet to the Feature Folders list in `CLAUDE.md`, and update the status table above.

**Done with Phases 1–2 (#240):** `tests/Feature/DarTest.php` has 25 tests. `RolesAndPermissionsTest`,
`AuditCoverageTest` and `ActivityOwnershipResolverTest` cover the new permission and model. Full suite: 923 passed.
OpenAPI: `app/Http/Docs/DarDocs.php`, under the `DAR` tag.

## Verification

1. Run `npm run typecheck && npm run lint && composer test`. Everything must pass.
2. Run `php artisan migrate`, then start `composer dev`.
3. Log in as a Case Manager and open `/dar`. Then:
   - Add 3 entries, using one patient twice.
   - Edit one entry and delete one.
   - Change the date and check that the list updates.
   - Print the PDF. Check the letterhead, the table, the counts and the Prepared-by block.
   - Export the CSV.
4. Log in as another worker. Confirm their DAR is empty and that the first worker's entry IDs return 403.
5. Hard-reload `/dar` and confirm SSR renders with no hydration warnings.
