# Guarantor Breakdown Types — Plan (server + Inertia SSR client)

Lets staff manage the **types of assistance** used in a guarantor's breakdown inside the React app. Example: under
MAIFIP, the lines are City Mayor ₱1,000 and Other Funds ₱1,000. Builds on the Patient Guarantor module
(`docs/PATIENT_GUARANTOR_PLAN.md`, shipped in #195 and #197). Ships as one issue, one branch and one PR.

**Status legend:** ☐ not started · ◐ in progress · ☑ done

| Phase | Side | Depends on | Status |
|-------|------|-----------|--------|
| 1. API: create / update / delete breakdown types; usage count; audit | server | — | ☑ done |
| 2. Client: "Manage Breakdown Types" dialog, opened from the guarantor card and form | client | 1 | ☑ done |
| 3. Tests; docs | both | 2 | ☑ done |

**All phases shipped.** Notes from the build:

- Codes are unique across every row, including deleted ones, because `assistance_sources.code` has a unique index. A
  deleted type's name can be reused, but its code cannot.
- The client saves codes exactly as typed. Upper-casing them would rewrite the seeded lowercase codes (`city_mayor`)
  that `AssistanceSourceSeeder` looks types up by.
- There is no JS test runner. The client was checked with `tsc -p tsconfig.app.json`, ESLint and `npm run build`
  (client + SSR). `npm run typecheck` alone checks nothing, because the root `tsconfig.json` has `"files": []`.

## Background

- A guarantor record (`patient_guarantees`) has breakdown lines (`patient_guarantee_items`). Each line is a type of
  assistance (`assistance_sources`) plus an amount. The guarantor's total is the sum of its lines.
- Today the list of types can only be changed in Filament `/admin` (`AssistanceSourceResource`, gated by
  `settings.manage`). The API is read-only: `GET assistance-sources`, `GET assistance-sources/{id}`. A social worker who
  needs a type that isn't listed, such as "Other Funds", has to ask an admin.

## Decisions

1. **One shared list of types**, used by every guarantor. Types are not tied to a guarantor.
2. **The guarantor's amount stays computed**: it is still the sum of its breakdown lines.
3. **Anyone with `guarantee.create`** can add, edit and delete types: Admin, MSS Head, Supervisor and Case Manager.
   Processors can only view.
4. **Delete is a soft delete.**
   - Existing lines keep showing the type's name.
   - New lines cannot use a deleted or inactive type.
   - The UI suggests deactivating a type that is in use.
5. **Audited.** Non-admins can now change the list, so `AssistanceSource` joins the audit trail. It is owned by neither
   a patient nor a case.
6. Filament `AssistanceSourceResource` stays, so admins can still use `/admin`.

## Phase 1 — API

**Routes** (`routes/api.php`). The read-only `apiResource('assistance-sources')` stays, plus:

| Method | Path | Permission |
|---|---|---|
| POST | `assistance-sources` | `guarantee.create` |
| PUT | `assistance-sources/{assistanceSource}` | `guarantee.create` |
| DELETE | `assistance-sources/{assistanceSource}` | `guarantee.create` |

**`AssistanceSourceController`**
- implements `HasMiddleware`; the write actions are gated as in the table above
- `index` keeps the `?active=1` filter and adds `withCount('guaranteeItems')`

**Requests:** `StoreAssistanceSourceRequest` and `UpdateAssistanceSourceRequest` (on update every field uses
`sometimes`).
- `name`: required, string, max 255, unique among types that aren't deleted (a deleted type's name can be reused)
- `code`: nullable, string, max 255, unique across every row including deleted ones (the column has a unique index)
- `requires_specify`: boolean
- `is_active`: boolean

**Model**
- `AssistanceSource` uses `Auditable`.
- `PatientGuaranteeItem::source()` uses `withTrashed()`, so an old line still shows a deleted type's name.

**Resource:** `AssistanceSourceResource` adds `usage_count` (when counted).

**OpenAPI:** document the three operations in `PatientGuaranteeDocs`, and add an `AssistanceSourceRequest` schema to
`Schemas/AssistanceSchema.php`.

## Phase 2 — Client (`resources/js/features/guarantees/`)

**API, adapter and types**
- add `createAssistanceSource`, `updateAssistanceSource` and `deleteAssistanceSource`
- map `usage_count` → `usageCount`
- add the payload helper and input types

**Hooks:** `useCreateAssistanceSource`, `useUpdateAssistanceSource` and `useDeleteAssistanceSource`.
- Each invalidates `assistanceSourceKeys.all`, so an open guarantee form's dropdowns refresh.
- Update and delete also invalidate `guaranteeKeys.all`, so renamed types show on existing records.

**`components/assistance-sources-manager-dialog.tsx`** ("Manage Breakdown Types")
- A table of all types, including inactive ones, with columns Name, Code, Requires specify, Active and Used by.
- **Add / Edit:** an inline form with name, code, a "Requires specify" switch and an "Active" switch. Server 422 errors
  appear next to the fields.
- **Delete:** a confirmation. When the type is in use, it warns and suggests deactivating instead.
- Shown only when `usePermission("guarantee.create")` is true. SSR-safe: nothing runs until the dialog opens.

**Where it opens:** a "Manage types" button in the `GuaranteeFormDialog` breakdown header (next to "Add Line") and in
the `EncounterGuaranteesCard` header (next to "Add Guarantor").

## Phase 3 — Tests & docs

`tests/Feature/AssistanceSourceCrudTest.php`
- create / update / soft-delete → 201 / 200 / 204
- validation:
  - missing name
  - duplicate name among types that aren't deleted, or a duplicate code
  - a deleted type's name can be reused, but not its code
- permissions:
  - a Case Manager can do every write
  - a Processor gets 403 on writes and 200 on reads
  - unauthenticated → 401
- `usage_count` counts the lines that use the type
- a deleted type still shows on an existing line and is rejected on new lines
- writes are audited; `AuditCoverageTest` now lists `AssistanceSource` as audited

## Verification

1. `composer test`.
2. `npm run typecheck && npm run lint` and `npm run build`.
3. `composer dev` → a patient → an encounter → MSWD Patient Guarantors:
   - **Manage types:** add "Other Funds", rename it, deactivate it, then reactivate it.
   - **Add Guarantor:** add MAIFIP with City Mayor ₱1,000 and Other Funds ₱1,000. The total shows ₱2,000.
   - **Delete:** delete "Other Funds". The existing line still reads "Other Funds", and it is gone from new-line
     dropdowns.
4. As a Processor: there is no "Manage types" button, and the write endpoints return 403.
