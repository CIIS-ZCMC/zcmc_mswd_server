# UIS Print + Print History — Per-Encounter Frontend Plan (zcmc_mswd_client)

Treat the **Unified Intake Sheet (ANNEX B) as a printable**, not a data-entry step.
Per hospital encounter (and on the case detail page), a social worker **prints the
UIS** — rendered by the server from that encounter's case data — and the app shows a
**history of past prints** (who / when). **No intake record is created** from this
flow.

Depends on the server plan `zcmc_mswd_server/docs/UIS_PRINT_HISTORY_PLAN.md`
(render-by-case endpoint + `uis_print_logs`).

**Status legend:** ☐ not started · ◐ in progress · ☑ done

| Phase | Depends on | Status |
|-------|-----------|--------|
| 0. `ApiCase.transaction_id` type + `ApiUisPrintLog` type | server deployed | ☑ done |
| 1. UIS-print api + hooks (download, history) | 0 | ☑ done |
| 2. `EncounterUisPanel` (Print UIS + Print History) | 1 | ☑ done |
| 3. Mount in Hospital Encounters tab (+ OpenCaseDialog fallback) | 2 | ☑ done |
| 4. Mount in Case detail page | 2 | ☑ done |
| 5. Remove the patient-scoped intake-sheet CRUD | server removal | ☑ done |

---

## Context

Earlier this feature was scoped as "create an intake per encounter." That is
**dropped**. The corrected model: **the UIS is just a printable part of the MSWD
system.** The server renders the ANNEX B on demand from a case (= a hospital
encounter, via `transaction_id`, #152) and records each print in a dedicated
`uis_print_logs` table. The frontend's job is only to **trigger the print** and
**show the print history** per encounter/case — never to author an intake record.

The client already has the authenticated blob-download idiom
(`fetchBlob` in `src/lib/api-client.ts`; e.g. `downloadCaseSummaryPdf`) and the
per-permission gating hook (`usePermission`). Those are reused directly.

**Confirmed scope:** print + print-history per encounter, on **both** the Hospital
Encounters tab and the case detail page. **No create/wizard. No finalized gating** —
the UIS is a printable of current case data and can be printed whenever the encounter
has a case.

## Approach

One reusable panel, `EncounterUisPanel`, keyed by a **case id** (a case = an
encounter). It offers a **Print UIS (ANNEX B)** button and renders the **Print
History** list from the server. Printing hits the server's render-by-case endpoint
(which logs the print); the panel then refetches history. When an encounter has no
case yet, the panel offers to open one (reusing the existing `OpenCaseDialog`) — this
opens a normal case, it does **not** create an intake.

## Files to change (client)

1. **`src/features/patients/types/api.types.ts`** — add `transaction_id?: number | null`
   and `transaction_type?: string | null` to `ApiCase` (server already sends them), and
   a new `ApiUisPrintLog` type (`id`, `printed_by: { id; name } | null`, `printed_at`,
   `copies`, `remarks`, `transaction_id`, `created_at`). Used to match encounter→case and
   to render history.

2. **NEW `src/features/cases/api/uis-print-api.ts`** —
   - `downloadCaseUisPdf(caseId, filename)` → `fetchBlob('/cases/{id}/uis/pdf', { download: 1 })`
     then the standard blob→object-URL→anchor→click→revoke (logs the print server-side).
   - `listCaseUisPrints(caseId)` → `GET /cases/{id}/uis/prints` → `ApiUisPrintLog[]`.

3. **NEW `src/features/cases/hooks/use-uis-prints.ts`** —
   - `useCaseUisPrintHistory(caseId)` (`useQuery`, key `["uis-prints", caseId]`, `enabled`
     on a valid id).
   - `usePrintCaseUis(caseId)` — a small `useMutation` wrapping `downloadCaseUisPdf`; on
     success `invalidateQueries(["uis-prints", caseId])` so the history refreshes. Drives
     an `isPrinting` disabled state.

4. **NEW `src/features/cases/components/encounter-uis-panel.tsx`** — props
   `{ caseId, caseCode, transactionId }`.
   - **Print UIS (ANNEX B)** button (`lucide` `Printer`, gated `usePermission("intake.view")`)
     → `usePrintCaseUis(caseId)` → downloads `UIS-{caseCode}.pdf`.
   - **Print History** list from `useCaseUisPrintHistory(caseId)` — each row: printed-by
     name, `printed_at` (formatted), copies. Empty state "No prints yet."
   - Loading/disabled while printing; errors surfaced inline (existing convention).

5. **`src/features/patients/components/tabs/hospital-encounters-tab.tsx`** — in
   `EncounterBody`, resolve the encounter's case id (from the patient's cases / matched by
   `case.transaction_id === encounter.id`, or `getAssignableCases(encounter.id)` on click).
   - Case found → render `<EncounterUisPanel caseId caseCode transactionId={encounter.id} />`.
   - No case → show a "Open a case to print the UIS" action that opens the existing
     `OpenCaseDialog` (`transactionId={encounter.id}`); after it opens a case, render the
     panel for the new case. (Opens a case only — never an intake.)

6. **`src/features/cases/components/case-detail-page.tsx`** — render
   `<EncounterUisPanel caseId={caseRecord.id} caseCode={caseRecord.caseCode} transactionId={caseRecord.transactionId} />`
   beside the existing "Summary PDF" button. Always available (a case always exists here).

**Reuse (do not re-implement):** `fetchBlob` + the blob-download idiom (mirror
`downloadCaseSummaryPdf`), `usePermission`, `OpenCaseDialog`, `getAssignableCases`,
React Query patterns, shadcn `Button`/`Table`/`Badge`.

**Removed vs the previous draft of this plan:** the `EncounterIntakePanel` create flow,
the wizard `lockedCase` extension, `useCreateIntakeSheet`, and the finalized-only print
gating are all **dropped**.

**Phase 5 — remove the intake-sheet CRUD (done).** The server no longer has a
`unified_intake_sheets` table or `/api/intake-sheets/*`, so the client's patient-scoped
intake feature was deleted with it: `intake-sheets-api.ts`, `use-intake-sheets.ts`,
`intake-sheet-tab.tsx`, the wizard and view modals, the orphaned
`encounter-intake-panel.tsx`, `intake.types.ts`, `ApiUnifiedIntakeSheet`, the dead
`use-patient-mutations.ts`, and the patient-detail `intake-sheet` tab (an unknown
`?tab=` now falls back to `profile`). The case detail page's `intake-sheet` tab is
unrelated — it hosts `EncounterUisPanel` — and stays.

## Verification

- Type-check/build: `npm run build` (`tsc -b`); `npm run lint` if present.
- Run client dev (Vite proxy → Laravel :8000) with the server up (server plan landed).
- **Print:** on an encounter/case, click **Print UIS** → `UIS-{case_code}.pdf` downloads
  (ANNEX B rendered from case data) → a new **Print History** row appears (current user +
  timestamp). Reprint → a second row.
- **Per-encounter:** the panel/history for encounter A is independent of encounter B
  (distinct case ids / `transaction_id`s).
- **No case:** an encounter without a case shows "Open a case to print the UIS"; opening a
  case (existing flow) then reveals the print panel — and creates no intake record.
- **Case detail:** same panel on `/cases/:caseId`, print + history for that case.
- Permission: the Print button and history are hidden without `intake.view`.
