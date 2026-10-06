import { useQuery, keepPreviousData } from "@tanstack/react-query"
import {
  getActivityLog,
  getRecordHistory,
  type ActivityLogFilters,
} from "../api/activity-log-api"
import type { ApiActivityLogPage } from "@/features/patients/types/api.types"

export function useActivityLog(filters: ActivityLogFilters) {
  return useQuery<ApiActivityLogPage>({
    queryKey: ["activity-log", filters],
    queryFn: () => getActivityLog(filters),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  })
}

export function useRecordHistory(
  subjectType: string,
  subjectId: number,
  limit = 5,
  enabled = true
) {
  return useQuery<ApiActivityLogPage>({
    queryKey: ["record-history", subjectType, subjectId, limit],
    queryFn: () => getRecordHistory(subjectType, subjectId, limit),
    enabled: enabled && Boolean(subjectType) && Boolean(subjectId),
    staleTime: 30 * 1000,
  })
}
