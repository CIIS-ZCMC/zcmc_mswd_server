import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { listPatients } from "../api/patients-api"

export const REGISTRY_QUICK_SEARCH_KEY = ["patients", "quick-search"] as const

export function useRegistryQuickSearch(term: string) {
  const trimmed = term.trim()
  const enabled = trimmed.length >= 2

  return useQuery({
    queryKey: [...REGISTRY_QUICK_SEARCH_KEY, trimmed],
    queryFn: () => listPatients({ search: trimmed, perPage: 5 }),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}
