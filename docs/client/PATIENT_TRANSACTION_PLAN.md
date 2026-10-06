# MSWD Client — Patient Transaction (Hospital Encounters) Plan

Client half of the transaction module. The server
(`zcmc_mswd_server/docs/TRANSACTION_MODULE_PLAN.md`, all phases ☑) exposes a
patient's hospital (HIS) encounters and a way to assess one into a case; nothing
in this client consumed those endpoints. This adds a read + assess **Hospital
Encounters** tab on the local Patient detail. One phase.

**Status legend:** ☐ not started · ◐ in progress · ☑ done

| Phase | Status |
|-------|--------|
| E1. Hospital Encounters tab (read + assess) | ☑ done — 2026-09-24 |

There is no case-scoped surface yet — a case route/caseload screen does not exist
in this client (see `SOCIAL_CASE_PLAN.md` Phase F, blocked). The encounter is
reached patient-first, and the assess action picks one of the patient's open
cases via the server's transaction-side endpoint, so no case route is needed.

---

## Background

The tab is fed entirely by the server's read stack:

| Function | Endpoint |
|----------|----------|
| `getPatientEncounters(hospitalNumber)` | `GET /patient-transactions/find?hospital_number=…` — 404 (no visits) normalized to `[]` |
| `getEncounter(id)` | `GET /patient-transactions/{id}` — full detail (lookups + guarantors) |
| `getAssignableCases(id)` | `GET /patient-transactions/{id}/cases` — the patient's open cases |
| `assessEncounter(id, caseId)` | `POST /patient-transactions/{id}/assess` `{ case_id }` |

The `find` list carries an encounter's **scalar** fields (registry status, dates,
diagnosis, flags); the **lookups and guarantors** are absent there and load only
on the single-encounter read. So the tab lists encounters and loads each one's
full detail **on expand** — full detail without N up-front round-trips.

## What shipped

**New feature module `src/features/hospital/`:**
- `types/api.types.ts` — wire shapes (`ApiPatientTransaction`,
  `ApiPatientGuarantor`, `ApiHospitalLookup`, `ApiAssignableCase`,
  `ApiCaseHospitalTransaction`); relations optional (absent on the list read).
- `types/hospital-transaction.types.ts` + `index.ts` — UI models
  (`HospitalEncounter`, `EncounterGuarantor`, `HospitalLookup`, `RegistryStatus`,
  `AssignableCase`).
- `api/hospital-transaction-api.ts` + `hospital-transaction-adapter.ts` — the
  four calls and the wire→UI mapping.
- `hooks/use-hospital-encounters.ts` — `useHospitalEncounters` (list, gated on
  `patients.view`), `useHospitalEncounter` (detail on expand),
  `useAssignableCases`, `useAssessEncounter` (invalidates the list + cases).
- `components/registry-status-badge.tsx` — the `{code,label}` status → colour.
- `components/hospital-encounter-detail.tsx` — the full-detail card (lookups,
  guarantors table, diagnosis reference, discharge/MGH, flags).
- `components/dialogs/assess-encounter-dialog.tsx` — pick an open case → assess;
  empty-state "no open case — open one first".

**Patient tab:**
- `src/features/patients/components/tabs/hospital-encounters-tab.tsx` — the tab:
  a "not linked" state when the patient has no hospital number, else an accordion
  of encounters with an **Assess** action per row (gated `cases.update`).
- Threaded a clean numeric `hospitalId?` onto `PatientRecord` (from
  `raw.hospital_id`, alongside the display `hospitalNo`) so the tab has the HIS
  key to query — mirroring how `latestCaseId` was added.
- Registered the tab in `patient-detail-view.tsx`.

## Verification
- `npm run typecheck` and `npm run lint` clean.
- Manual: a patient with a `hospital_id` sees their HIS encounters; expanding one
  loads lookups/guarantors/diagnosis; **Assess** attaches it to a picked open case
  (a patient with no open case shows the empty state); a patient with no
  `hospital_id` shows the "not linked" state.

## Non-goals
- A standalone HIS browse/search screen (the admin panel already browses the HIS
  master).
- Case-scoped encounter management + detach (needs the blocked client case route).
- Editing HIS data — the module is read-only; only the MSWD-side assess writes.
