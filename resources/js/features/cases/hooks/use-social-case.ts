import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { usePermission } from "@/features/auth/hooks/use-permission"
import { patientDetailKeys } from "@/features/patients/hooks/use-patient-detail"
import {
  amendSocialCase,
  finalizeSocialCase,
  getSocialCase,
  startSocialCase,
  submitSocialCase,
  updateSocialCase,
} from "../api/social-case-api"
import { toSocialCase } from "../api/social-case-adapter"
import type { SocialCase, StartSocialCasePayload, UpdateSocialCasePayload } from "../types"

export function socialCaseKeys(caseId: number) {
  return {
    detail: ["cases", caseId, "social-case"] as const,
  }
}

export function useSocialCase(caseId: number | undefined) {
  const canViewCases = usePermission("cases.view")
  const enabled = Boolean(caseId) && canViewCases

  return useQuery<SocialCase | null>({
    queryKey: caseId ? socialCaseKeys(caseId).detail : ["cases", 0, "social-case"],
    queryFn: async () => {
      if (!caseId) return null
      const raw = await getSocialCase(caseId)
      return raw ? toSocialCase(raw) : null
    },
    enabled,
    retry: false,
  })
}

export function useStartSocialCase(caseId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload?: StartSocialCasePayload) => startSocialCase(caseId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialCaseKeys(caseId).detail })
    },
  })
}

export function useUpdateSocialCase(caseId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateSocialCasePayload) => updateSocialCase(caseId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialCaseKeys(caseId).detail })
    },
  })
}

export function useSubmitSocialCase(caseId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => submitSocialCase(caseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialCaseKeys(caseId).detail })
    },
  })
}

export function useFinalizeSocialCase(caseId: number, patientId?: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => finalizeSocialCase(caseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialCaseKeys(caseId).detail })
      if (patientId) {
        queryClient.invalidateQueries({ queryKey: patientDetailKeys(patientId).history })
        queryClient.invalidateQueries({ queryKey: patientDetailKeys(patientId).profile })
      }
    },
  })
}

export function useAmendSocialCase(caseId: number, patientId?: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (reason: string) => amendSocialCase(caseId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialCaseKeys(caseId).detail })
      if (patientId) {
        queryClient.invalidateQueries({ queryKey: patientDetailKeys(patientId).history })
        queryClient.invalidateQueries({ queryKey: patientDetailKeys(patientId).profile })
      }
    },
  })
}
