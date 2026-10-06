import { useQuery } from "@tanstack/react-query"
import { getGuarantorOptions } from "../api/guarantee-api"

export const guarantorOptionKeys = {
  all: ["guarantors", "options"] as const,
  list: (activeOnly: boolean) =>
    [...guarantorOptionKeys.all, { activeOnly }] as const,
}

export function useGuarantorOptions(activeOnly = true) {
  return useQuery({
    queryKey: guarantorOptionKeys.list(activeOnly),
    queryFn: () => getGuarantorOptions(activeOnly),
    staleTime: 5 * 60 * 1000,
  })
}
