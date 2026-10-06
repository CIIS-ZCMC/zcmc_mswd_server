import { useQuery } from "@tanstack/react-query"
import { getAssistanceSources } from "../api/guarantee-api"

export const assistanceSourceKeys = {
  all: ["assistance-sources"] as const,
  list: (activeOnly: boolean) =>
    [...assistanceSourceKeys.all, "list", { activeOnly }] as const,
}

export function useAssistanceSources(activeOnly = true) {
  return useQuery({
    queryKey: assistanceSourceKeys.list(activeOnly),
    queryFn: () => getAssistanceSources(activeOnly),
    staleTime: 5 * 60 * 1000,
  })
}
