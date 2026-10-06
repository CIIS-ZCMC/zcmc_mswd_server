# Watcher Relationship Dropdown — Add Watcher Modal

Small, standalone plan: wire the server's `GET /watcher-relationship-types`
(shipped in `zcmc_mswd_server`'s Watcher Logic Plan, Phase 1) into the
existing Add Watcher modal, replacing its free-text Relationship field with
real options.

**Status:** ☑ completed

## Scope

Targets `watcher-dialog.tsx` **as it exists today** — still creating a
patient-scoped watcher via `POST /patients/{id}/watchers`, not the
case-scoped rewrite described in `WATCHER_LOGIC_PLAN.md`'s Phase 7.
`StorePatientWatcherRequest` doesn't validate `relationship` against the
master list (just `nullable|string|max:255`), so this is a pure UX upgrade
now, decoupled from the bigger case-watcher migration — a caseworker gets
real options instead of a free-text box defaulting to `"Relative"`. When
Phase 7 eventually swaps this dialog onto the case-scoped API, the dropdown
carries over unchanged; only the submit handler's target endpoint changes.

## Pattern to follow

The app already has an identical reference-lookup dropdown for assistant
types (`intake-sheet-wizard-modal.tsx`) — this is the right shape to mirror,
not the empty `features/reference/` scaffold that turned out to be unused in
practice:

- `listAssistantTypes()` — a plain function in `intake-sheets-api.ts`
- `useAssistantTypes()` — a `useQuery` wrapper in `use-intake-sheets.ts`,
  `staleTime: 5 * 60_000`
- Rendered as a `NativeSelect`, populated once the query resolves, gated
  behind the same `stillLoading` pattern the wizard modal already uses

## Changes

**1. Type** — `src/features/patients/types/api.types.ts`:
```ts
export interface ApiWatcherRelationshipType {
  id: number
  name: string
  code: string
  created_at: string
  updated_at: string
}
```

**2. API function** — `src/features/patients/api/intake-sheets-api.ts`
(next to `listAssistantTypes`, despite the file name — this is the de facto
home for small reference lookups in this codebase):
```ts
export function listWatcherRelationshipTypes() {
  return apiClient
    .get<ApiEnvelope<ApiWatcherRelationshipType[]>>("/watcher-relationship-types")
    .then((res) => res.data)
}
```

**3. Hook** — `src/features/patients/hooks/use-intake-sheets.ts`, next to
`useAssistantTypes`:
```ts
export function useWatcherRelationshipTypes() {
  return useQuery({
    queryKey: ["watcher-relationship-types"],
    queryFn: listWatcherRelationshipTypes,
    staleTime: 5 * 60_000,
  })
}
```

**4. Dialog** — `watcher-dialog.tsx`: replace the free-text `Input` for
Relationship with a `NativeSelect` fed by `useWatcherRelationshipTypes()`.
Option `value` is the `code` (what the server stores in
`patient_watchers.relationship` today, and what `case_watchers.relationship`
will require later); label is `name`. Default the select to empty/placeholder
rather than hardcoding `"Relative"` as the initial state.

## Gate

`npx tsc --noEmit`, then manually open the dialog and confirm the dropdown
populates from the real seeded 13 values (spouse, parent, child, sibling,
grandparent, grandchild, relative, guardian, friend, neighbor, employer,
barangay_official, other).

## Revert

Safe, single dialog + two small additions to existing files — no schema or
contract impact, nothing else depends on this.
