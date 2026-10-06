import { useQuery } from "@tanstack/react-query"
import { usePermission } from "@/features/auth/hooks/use-permission"
import {
  getCase,
  getCaseActivities,
  getCaseHistory,
  getCaseProfile,
  getCases,
  getMyCaseload,
} from "../api/cases-api"
import type { GetCasesParams, GetMyCaseloadParams } from "../api/cases-api"
import { toCaseListItem, toCaseRecord } from "../api/cases-adapter"
import type { CaseRecord } from "../types/case.types"


export const caseKeys = {
  all: ["cases"] as const,
  lists: () => [...caseKeys.all, "list"] as const,
  list: (params?: GetCasesParams) => [...caseKeys.lists(), params ?? {}] as const,
  caseloads: () => [...caseKeys.all, "caseload"] as const,
  caseload: (params?: GetMyCaseloadParams) => [...caseKeys.caseloads(), params ?? {}] as const,
  details: () => [...caseKeys.all, "detail"] as const,
  detail: (id: number | string) => [...caseKeys.details(), String(id)] as const,
  profiles: () => [...caseKeys.all, "profile"] as const,
  profile: (id: number | string) => [...caseKeys.profiles(), String(id)] as const,
  histories: () => [...caseKeys.all, "history"] as const,
  history: (id: number | string) => [...caseKeys.histories(), String(id)] as const,
  activities: () => [...caseKeys.all, "activities"] as const,
  activity: (id: number | string) => [...caseKeys.activities(), String(id)] as const,
}

export function useCases(params?: GetCasesParams) {
  const canView = usePermission("cases.view")

  return useQuery({
    queryKey: caseKeys.list(params),
    queryFn: async () => {
      const response = await getCases(params)
      return {
        data: (response.data || []).map(toCaseListItem),
        meta: response.meta,
      }
    },
    enabled: canView,
    staleTime: 1000 * 60,
  })
}

export function useMyCaseload(params?: GetMyCaseloadParams) {
  const canView = usePermission("cases.view")

  return useQuery({
    queryKey: caseKeys.caseload(params),
    queryFn: async () => {
      const response = await getMyCaseload(params)
      return {
        data: (response.data || []).map(toCaseListItem),
        meta: response.meta,
      }
    },
    enabled: canView,
    staleTime: 1000 * 30,
  })
}

export function useCase(id?: number | string | null) {
  const canView = usePermission("cases.view")
  const validId = id ? String(id) : null

  return useQuery<CaseRecord | null>({
    queryKey: caseKeys.detail(validId ?? ""),
    queryFn: async () => {
      if (!validId) return null
      const raw = await getCase(validId)
      return toCaseRecord(raw)
    },
    enabled: Boolean(canView && validId),
    staleTime: 1000 * 30,
  })
}

export function useCaseProfile(id?: number | string | null) {
  const canView = usePermission("cases.view")
  const validId = id ? String(id) : null

  return useQuery({
    queryKey: caseKeys.profile(validId ?? ""),
    queryFn: async () => {
      if (!validId) return null
      return getCaseProfile(validId)
    },
    enabled: Boolean(canView && validId),
    staleTime: 1000 * 60,
  })
}

export function useCaseHistory(id?: number | string | null) {
  const canView = usePermission("cases.view")
  const validId = id ? String(id) : null

  return useQuery({
    queryKey: caseKeys.history(validId ?? ""),
    queryFn: async () => {
      if (!validId) return []
      return getCaseHistory(validId)
    },
    enabled: Boolean(canView && validId),
  })
}

export function useCaseActivities(id?: number | string | null) {
  const canView = usePermission("cases.view")
  const validId = id ? String(id) : null

  return useQuery({
    queryKey: caseKeys.activity(validId ?? ""),
    queryFn: async () => {
      if (!validId) return []
      return getCaseActivities(validId)
    },
    enabled: Boolean(canView && validId),
  })
}
