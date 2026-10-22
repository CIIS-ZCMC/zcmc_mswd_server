import { useQuery } from "@tanstack/react-query"
import { getGuarantorOptions } from "../api/guarantee-api"

export const guarantorOptionKeys = {
  all: ["guarantors", "options"] as const,
  list: (activeOnly: boolean, transactionId?: number | string | null) =>
    [
      ...guarantorOptionKeys.all,
      { activeOnly, transactionId: transactionId ? String(transactionId) : null },
    ] as const,
}

export function useGuarantorOptions(
  activeOnly = true,
  transactionId?: number | string | null
) {
  return useQuery({
    queryKey: guarantorOptionKeys.list(activeOnly, transactionId),
    queryFn: () => getGuarantorOptions(activeOnly, transactionId),
    staleTime: 5 * 60 * 1000,
  })
}
