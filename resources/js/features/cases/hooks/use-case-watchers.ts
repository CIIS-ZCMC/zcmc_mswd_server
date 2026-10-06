import { useQuery } from "@tanstack/react-query"
import { listWatcherRelationshipTypes } from "@/features/reference/api/watcher-relationship-types-api"
import { toCaseWatcher, toWatcherStatus } from "../api/case-watchers-adapter"
import { getWatcherStatus, listCaseWatchers } from "../api/case-watchers-api"
import type { CaseWatcher, WatcherRelationshipType, WatcherStatus } from "../types/watcher.types"

export function caseWatcherKeys(caseId: number) {
  return {
    list: ["cases", caseId, "watchers"] as const,
    status: ["cases", caseId, "watcher-status"] as const,
  }
}

export const referenceKeys = {
  watcherRelationshipTypes: ["reference", "watcher-relationship-types"] as const,
}

/** Fetches list of watchers for a case, mapped through adapter. */
export function useCaseWatchers(caseId: number | null | undefined) {
  const enabled = Boolean(caseId) && !Number.isNaN(caseId)

  return useQuery<CaseWatcher[]>({
    queryKey: caseId ? caseWatcherKeys(caseId).list : ["cases", "none", "watchers"],
    queryFn: async () => {
      const res = await listCaseWatchers(caseId as number)
      return res.map(toCaseWatcher)
    },
    enabled,
  })
}

/** Fetches watcher requirement and blocking status for a case. */
export function useWatcherStatus(caseId: number | null | undefined) {
  const enabled = Boolean(caseId) && !Number.isNaN(caseId)

  return useQuery<WatcherStatus>({
    queryKey: caseId ? caseWatcherKeys(caseId).status : ["cases", "none", "watcher-status"],
    queryFn: async () => {
      const res = await getWatcherStatus(caseId as number)
      return toWatcherStatus(res)
    },
    enabled,
  })
}

/** Master reference list for watcher relationships. */
export function useWatcherRelationshipTypes() {
  return useQuery<WatcherRelationshipType[]>({
    queryKey: referenceKeys.watcherRelationshipTypes,
    queryFn: listWatcherRelationshipTypes,
    staleTime: 1000 * 60 * 60, // 1 hour
  })
}
