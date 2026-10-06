import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { usePermission } from "@/features/auth/hooks/use-permission"
import {
  downloadCaseUisPdf,
  getCaseUisReadiness,
  listCaseUisPrints,
  type CaseUisPdfOptions,
} from "../api/uis-print-api"
import { getPatientUis } from "../api/patient-uis-api"
import type { ApiUisPrintLog, ApiUisReadiness } from "../types/api.types"
import type { PatientUisRow } from "../types/uis.types"

export const uisPrintKeys = {
  all: ["uis-prints"] as const,
  case: (caseId: number | string) => ["uis-prints", "case", String(caseId)] as const,
  readiness: (caseId: number | string) => ["uis-prints", "case", String(caseId), "readiness"] as const,
}

/**
 * A patient's UIS list (GET /patients/{id}/uis). Any write to an assessment,
 * its expenses or a print changes a row, and the mutation hooks only know the
 * case id, so they invalidate the whole prefix.
 */
export const patientUisKeys = {
  all: ["patient-uis"] as const,
  patient: (patientId: number | string) => ["patient-uis", String(patientId)] as const,
}

/** Hook for the patient page UIS tab: every case of the patient with its UIS state. */
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

/**
 * Hook to fetch whether a case's UIS is ready to print, including missing section hints.
 */
export function useCaseUisReadiness(caseId?: number | string | null) {
  const canView = usePermission("intake.view")
  const isEnabled =
    canView && caseId != null && caseId !== "" && caseId !== 0 && !Number.isNaN(Number(caseId))

  return useQuery<ApiUisReadiness>({
    queryKey: uisPrintKeys.readiness(caseId ?? ""),
    queryFn: () => getCaseUisReadiness(caseId!),
    enabled: isEnabled,
  })
}

/**
 * Hook to fetch the history of UIS prints for a given case.
 */
export function useCaseUisPrintHistory(caseId?: number | string | null) {
  const canView = usePermission("intake.view")
  const isEnabled =
    canView && caseId != null && caseId !== "" && caseId !== 0 && !Number.isNaN(Number(caseId))

  return useQuery<ApiUisPrintLog[]>({
    queryKey: uisPrintKeys.case(caseId ?? ""),
    queryFn: () => listCaseUisPrints(caseId!),
    enabled: isEnabled,
  })
}

/**
 * Mutation hook to print/preview the case UIS PDF (ANNEX B) and refresh print history and readiness.
 */
export function usePrintCaseUis(caseId?: number | string | null, caseCode?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (options?: CaseUisPdfOptions | string) => {
      if (!caseId) throw new Error("No case ID provided for UIS printing")
      const defaultFilename = caseCode ? `UIS-${caseCode}.pdf` : `UIS-CASE-${caseId}.pdf`
      const mergedOptions: CaseUisPdfOptions =
        typeof options === "string"
          ? { filename: options || defaultFilename }
          : { filename: defaultFilename, ...options }
      return downloadCaseUisPdf(caseId, mergedOptions)
    },
    onSuccess: () => {
      if (caseId) {
        queryClient.invalidateQueries({ queryKey: uisPrintKeys.case(caseId) })
        queryClient.invalidateQueries({ queryKey: uisPrintKeys.readiness(caseId) })
        queryClient.invalidateQueries({ queryKey: patientUisKeys.all })
      }
    },
  })
}
