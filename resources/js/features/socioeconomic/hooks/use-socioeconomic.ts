import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { usePermission } from "@/features/auth/hooks/use-permission"
import {
  getSocioeconomicOverview,
  getSocioeconomicProfile,
  createSocioeconomicProfile,
  updateSocioeconomicProfile,
  deleteSocioeconomicProfile,
} from "../api/socioeconomic-api"
import type {
  SocioeconomicOverview,
  SocioeconomicProfile,
  SaveSocioeconomicInput,
} from "../types/socioeconomic.types"

export const socioeconomicKeys = {
  all: ["socioeconomic"] as const,
  patient: (patientId: number | string) => ["socioeconomic", "patient", String(patientId)] as const,
  profile: (profileId: number | string) => ["socioeconomic", "profile", String(profileId)] as const,
}

/**
 * Hook to fetch full socioeconomic overview for a patient.
 */
export function useSocioeconomic(patientId?: number | string | null) {
  const canView = usePermission("socioeconomic.view")
  const isEnabled =
    canView && patientId != null && patientId !== "" && !Number.isNaN(Number(patientId))

  return useQuery<SocioeconomicOverview>({
    queryKey: socioeconomicKeys.patient(patientId ?? ""),
    queryFn: () => getSocioeconomicOverview(patientId!),
    enabled: isEnabled,
  })
}

/**
 * Hook to fetch a single profile snapshot (e.g. for historical view side-sheet).
 */
export function useSocioeconomicProfile(profileId?: number | string | null) {
  const canView = usePermission("socioeconomic.view")
  const isEnabled =
    canView && profileId != null && profileId !== "" && !Number.isNaN(Number(profileId))

  return useQuery<SocioeconomicProfile>({
    queryKey: socioeconomicKeys.profile(profileId ?? ""),
    queryFn: () => getSocioeconomicProfile(profileId!),
    enabled: isEnabled,
  })
}

/**
 * Mutation hook to create a socioeconomic profile for a patient.
 */
export function useCreateSocioeconomicProfile(patientId: number | string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: SaveSocioeconomicInput) => createSocioeconomicProfile(patientId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socioeconomicKeys.patient(patientId) })
    },
  })
}

/**
 * Mutation hook to update a socioeconomic profile.
 */
export function useUpdateSocioeconomicProfile(patientId: number | string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: number | string; input: SaveSocioeconomicInput }) =>
      updateSocioeconomicProfile(id, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: socioeconomicKeys.patient(patientId) })
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: socioeconomicKeys.profile(data.id) })
      }
    },
  })
}

/**
 * Mutation hook to delete a socioeconomic profile.
 */
export function useDeleteSocioeconomicProfile(patientId: number | string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (profileId: number | string) => deleteSocioeconomicProfile(profileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socioeconomicKeys.patient(patientId) })
    },
  })
}
