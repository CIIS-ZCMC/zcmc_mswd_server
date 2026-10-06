import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { usePermission } from "@/features/auth/hooks/use-permission"
import {
  getCaseAssessments,
  getLatestCaseForPatient,
  getPatientHistory,
  getPatientProfile,
} from "../api/patients-api"
import { toPatientDetailRecord } from "../api/patients-adapter"
import type { PatientRecord } from "../types"

/** Shared with use-patient-writes.ts so a successful write invalidates the right query. */
export function patientDetailKeys(patientId: number) {
  return {
    profile: ["patients", "detail", patientId, "profile"] as const,
    latestCase: ["patients", "detail", patientId, "latest-case"] as const,
    assessments: (caseId: number) => ["cases", caseId, "assessments"] as const,
    history: ["patients", "detail", patientId, "history"] as const,
    /** Custody. No query reads it yet — the Caretake tab is the next phase. */
    caretake: ["patients", "detail", patientId, "caretake"] as const,
  }
}

/**
 * The enriched detail view for one patient: profile (family/watchers/
 * caretakers/ids/documents) + most recent case + that case's most recent
 * assessment + audit history. Runs in parallel, gated by user permissions.
 */
export function usePatientDetail(patientId: string) {
  const numericId = Number(patientId)
  const enabled = patientId !== "" && !Number.isNaN(numericId)
  const canViewCases = usePermission("cases.view")
  const keys = patientDetailKeys(numericId)

  const profileQuery = useQuery({
    queryKey: keys.profile,
    queryFn: () => getPatientProfile(numericId),
    enabled,
  })

  const latestCaseQuery = useQuery({
    queryKey: keys.latestCase,
    queryFn: () => getLatestCaseForPatient(numericId),
    enabled: enabled && canViewCases,
  })

  const latestCaseId = latestCaseQuery.data?.id

  const assessmentsQuery = useQuery({
    queryKey: latestCaseId ? keys.assessments(latestCaseId) : ["cases", "none", "assessments"],
    queryFn: () => getCaseAssessments(latestCaseId as number),
    enabled: Boolean(latestCaseId) && canViewCases,
  })

  const historyQuery = useQuery({
    queryKey: keys.history,
    queryFn: () => getPatientHistory(numericId),
    enabled,
  })

  const serverPatient = useMemo(() => {
    if (!profileQuery.data) return undefined

    return toPatientDetailRecord(profileQuery.data, {
      latestCase: canViewCases ? (latestCaseQuery.data ?? null) : null,
      latestAssessment: canViewCases ? (assessmentsQuery.data?.[0] ?? null) : null,
      history: historyQuery.data ?? [],
    })
  }, [profileQuery.data, latestCaseQuery.data, assessmentsQuery.data, historyQuery.data, canViewCases])

  /**
   * Local overlay on top of the server-derived record. Every real write
   * (family member, watcher) goes through use-patient-writes.ts and
   * invalidates the queries above instead of touching this directly; that
   * re-syncs this overlay via the effect below. (The intake-sheet tab that
   * once edited this in place has been removed — the overlay may be
   * removable in a follow-up.)
   */
  const [localPatient, setLocalPatient] = useState<PatientRecord | undefined>(undefined)
  // Tracks the last serverPatient this hook has synced from, so a fresh
  // server value overwrites the overlay exactly once per change — done
  // during render (React's "adjusting state when a prop changes" pattern)
  // rather than in an effect, which would cost an extra render pass.
  const [syncedFrom, setSyncedFrom] = useState<PatientRecord | undefined>(undefined)

  if (serverPatient !== syncedFrom) {
    setSyncedFrom(serverPatient)
    setLocalPatient(serverPatient)
  }

  return {
    patient: localPatient,
    setLocalPatient,
    isLoading: enabled && (profileQuery.isPending || historyQuery.isPending),
    error:
      profileQuery.error ??
      (canViewCases ? latestCaseQuery.error : null) ??
      (canViewCases ? assessmentsQuery.error : null) ??
      historyQuery.error ??
      null,
  }
}
