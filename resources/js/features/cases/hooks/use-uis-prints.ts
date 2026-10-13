import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { usePermission } from "@/features/auth/hooks/use-permission"
import {
  downloadUisPdf,
  getUisReadiness,
  listUisPrints,
  uisTargetKey,
  type CaseUisPdfOptions,
  type UisTarget,
} from "../api/uis-print-api"
import { getPatientUis } from "../api/patient-uis-api"
import type { ApiUisPrintLog, ApiUisReadiness } from "../types/api.types"
import type { PatientUisRow } from "../types/uis.types"

export const uisPrintKeys = {
  all: ["uis-prints"] as const,
  target: (target: UisTarget) => ["uis-prints", uisTargetKey(target)] as const,
  readiness: (target: UisTarget) =>
    ["uis-prints", uisTargetKey(target), "readiness"] as const,
}

/**
 * A patient's UIS list (GET /patients/{id}/uis). Any write to an assessment,
 * its expenses or a print changes a row, and the mutation hooks only know the
 * case or assessment id, so they invalidate the whole prefix.
 */
export const patientUisKeys = {
  all: ["patient-uis"] as const,
  patient: (patientId: number | string) => ["patient-uis", String(patientId)] as const,
}

/** Hook for the patient page UIS tab: every intake (and unassessed case) of the patient. */
export function usePatientUis(patientId?: number | string | null) {
  const canView = usePermission("intake.view")
  const isEnabled =
    canView && patientId != null && patientId !== "" && !Number.isNaN(Number(patientId))

  return useQuery<PatientUisRow[]>({
    queryKey: patientUisKeys.patient(patientId ?? ""),
    queryFn: () => getPatientUis(patientId!),
    enabled: isEnabled,
  })
}

/** A target whose id is set (a case id of 0 or "" means "none yet"). */
function isTargetSet(target: UisTarget | null | undefined): target is UisTarget {
  if (!target) return false
  const id = "assessmentId" in target ? target.assessmentId : target.caseId
  return id != null && id !== "" && id !== 0 && !Number.isNaN(Number(id))
}

/**
 * Hook to fetch whether a UIS is ready to print, including missing section hints.
 */
export function useUisReadiness(target?: UisTarget | null) {
  const canView = usePermission("intake.view")
  const isEnabled = canView && isTargetSet(target)

  return useQuery<ApiUisReadiness>({
    queryKey: isTargetSet(target) ? uisPrintKeys.readiness(target) : ["uis-prints", "none"],
    queryFn: () => getUisReadiness(target!),
    enabled: isEnabled,
  })
}

/**
 * Hook to fetch the history of UIS prints of an intake's encounter or a case.
 */
export function useUisPrintHistory(target?: UisTarget | null) {
  const canView = usePermission("intake.view")
  const isEnabled = canView && isTargetSet(target)

  return useQuery<ApiUisPrintLog[]>({
    queryKey: isTargetSet(target) ? uisPrintKeys.target(target) : ["uis-prints", "none"],
    queryFn: () => listUisPrints(target!),
    enabled: isEnabled,
  })
}

/**
 * Mutation hook to print/preview the UIS PDF (ANNEX B) and refresh print history and readiness.
 */
export function usePrintUis(target?: UisTarget | null, filename?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (options?: CaseUisPdfOptions | string) => {
      if (!isTargetSet(target)) throw new Error("Nothing selected to print the UIS for")
      const mergedOptions: CaseUisPdfOptions =
        typeof options === "string"
          ? { filename: options || filename }
          : { filename, ...options }
      return downloadUisPdf(target, mergedOptions)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: uisPrintKeys.all })
      queryClient.invalidateQueries({ queryKey: patientUisKeys.all })
    },
  })
}
