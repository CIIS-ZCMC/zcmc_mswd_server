import { useQuery } from "@tanstack/react-query"
import { usePermission } from "@/features/auth/hooks/use-permission"
import { getGuaranteeTotals } from "../api/dashboard-api"

export const dashboardKeys = {
  all: ["dashboard"] as const,
  guaranteeTotals: (from: string, to: string) =>
    [...dashboardKeys.all, "guarantee-totals", { from, to }] as const,
}

/** Guarantee amounts per day and guarantor between two `YYYY-MM-DD` dates. */
export function useGuaranteeTotals(from: string, to: string) {
  const canView = usePermission("guarantee.view")

  return useQuery({
    queryKey: dashboardKeys.guaranteeTotals(from, to),
    queryFn: () => getGuaranteeTotals(from, to),
    enabled: canView,
    staleTime: 60_000,
  })
}
