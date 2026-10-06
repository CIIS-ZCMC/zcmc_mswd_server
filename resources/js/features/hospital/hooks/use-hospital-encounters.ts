import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { usePermission } from "@/features/auth/hooks/use-permission"
import {
  assessEncounter,
  getAssignableCases,
  getEncounter,
  getPatientEncounters,
} from "../api/hospital-transaction-api"
import { toAssignableCase, toHospitalEncounter } from "../api/hospital-transaction-adapter"
import type { AssignableCase, HospitalEncounter } from "../types/hospital-transaction.types"

export function hospitalEncounterKeys(hospitalNumber: string | number | undefined) {
  const key = hospitalNumber ?? "none"
  return {
    list: ["hospital", "encounters", String(key)] as const,
    detail: (id: number) => ["hospital", "encounter", id] as const,
    cases: (id: number) => ["hospital", "encounter", id, "cases"] as const,
  }
}

/** The patient's HIS encounters (list read — scalar fields). */
export function useHospitalEncounters(hospitalNumber: string | number | undefined) {
  const canView = usePermission("patients.view")
  const enabled = Boolean(hospitalNumber) && canView

  return useQuery<HospitalEncounter[]>({
    queryKey: hospitalEncounterKeys(hospitalNumber).list,
    queryFn: async () => {
      if (!hospitalNumber) return []
      const rows = await getPatientEncounters(hospitalNumber)
      return rows.map(toHospitalEncounter)
    },
    enabled,
    retry: false,
  })
}

/** One encounter's full detail (lookups + guarantors), loaded on expand. */
export function useHospitalEncounter(id: number, enabled: boolean) {
  return useQuery<HospitalEncounter>({
    queryKey: hospitalEncounterKeys(undefined).detail(id),
    queryFn: async () => toHospitalEncounter(await getEncounter(id)),
    enabled,
    retry: false,
  })
}

/** The patient's open cases the encounter can be assessed into. */
export function useAssignableCases(id: number, enabled: boolean) {
  return useQuery<AssignableCase[]>({
    queryKey: hospitalEncounterKeys(undefined).cases(id),
    queryFn: async () => (await getAssignableCases(id)).map(toAssignableCase),
    enabled,
    retry: false,
  })
}

/** Attach the encounter to a picked case. */
export function useAssessEncounter(id: number, hospitalNumber: string | number | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (caseId: number) => assessEncounter(id, caseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hospitalEncounterKeys(undefined).cases(id) })
      queryClient.invalidateQueries({ queryKey: hospitalEncounterKeys(hospitalNumber).list })
    },
  })
}
