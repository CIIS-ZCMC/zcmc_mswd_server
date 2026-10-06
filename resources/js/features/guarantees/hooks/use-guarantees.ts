import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { usePermission } from "@/features/auth/hooks/use-permission"
import {
  createGuarantee,
  deleteGuarantee,
  getGuarantees,
  getGuarantee,
  updateGuarantee,
} from "../api/guarantee-api"
import type { SaveGuaranteeInput } from "../types"

export const guaranteeKeys = {
  all: ["guarantees"] as const,
  byPatient: (patientId: number | string) =>
    [...guaranteeKeys.all, "patient", String(patientId)] as const,
  byEncounter: (patientId: number | string, transactionId?: number | string) =>
    [
      ...guaranteeKeys.byPatient(patientId),
      "encounter",
      transactionId !== undefined && transactionId !== null
        ? String(transactionId)
        : "all",
    ] as const,
  detail: (id: number | string) =>
    [...guaranteeKeys.all, "detail", String(id)] as const,
}

/**
 * Fetch guarantees for a patient / encounter.
 */
export function useGuarantees(
  patientId: number | string | undefined,
  transactionId?: number | string,
  enabled = true
) {
  const canView = usePermission("guarantee.view")
  const validPatient =
    patientId !== undefined &&
    patientId !== null &&
    String(patientId) !== "" &&
    String(patientId) !== "0"

  return useQuery({
    queryKey: guaranteeKeys.byEncounter(patientId ?? "", transactionId),
    queryFn: () => getGuarantees(patientId!, transactionId),
    enabled: Boolean(canView && validPatient && enabled),
    staleTime: 30 * 1000,
  })
}

/**
 * Fetch a single guarantee by ID.
 */
export function useGuaranteeDetail(
  id: number | string | undefined,
  enabled = true
) {
  const canView = usePermission("guarantee.view")
  const validId =
    id !== undefined && id !== null && String(id) !== "" && String(id) !== "0"

  return useQuery({
    queryKey: guaranteeKeys.detail(id ?? ""),
    queryFn: () => getGuarantee(id!),
    enabled: Boolean(canView && validId && enabled),
  })
}

/**
 * Hook to create a guarantee record and invalidate the encounter cache.
 */
export function useCreateGuarantee(
  patientId: number | string,
  _transactionId?: number | string
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: SaveGuaranteeInput) =>
      createGuarantee(patientId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: guaranteeKeys.byPatient(patientId),
      })
    },
  })
}

/**
 * Hook to update a guarantee record and invalidate the encounter cache.
 */
export function useUpdateGuarantee(
  patientId: number | string,
  _transactionId?: number | string
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: number | string
      input: SaveGuaranteeInput
    }) => updateGuarantee(id, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: guaranteeKeys.byPatient(patientId),
      })
      queryClient.invalidateQueries({
        queryKey: guaranteeKeys.detail(data.id),
      })
    },
  })
}

/**
 * Hook to delete a guarantee record and invalidate the encounter cache.
 */
export function useDeleteGuarantee(
  patientId: number | string,
  _transactionId?: number | string
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number | string) => deleteGuarantee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: guaranteeKeys.byPatient(patientId),
      })
    },
  })
}
