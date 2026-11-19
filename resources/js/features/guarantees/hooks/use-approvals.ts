import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { usePermission } from "@/features/auth/hooks/use-permission"
import { approveGuarantee, getPendingApprovals } from "../api/approval-api"

export const approvalKeys = {
  all: ["guarantee-approvals"] as const,
  pending: () => [...approvalKeys.all, "pending"] as const,
}

/** Guarantees waiting for sign-off; only for those who may approve them. */
export function usePendingApprovals() {
  const canApprove = usePermission("guarantee.approve")

  return useQuery({
    queryKey: approvalKeys.pending(),
    queryFn: getPendingApprovals,
    enabled: canApprove,
    refetchInterval: 60_000,
    staleTime: 15_000,
  })
}

export function useApproveGuarantee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number | string) => approveGuarantee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: approvalKeys.all })
      queryClient.invalidateQueries({ queryKey: ["guarantees"] })
      queryClient.invalidateQueries({ queryKey: ["patient-uis"] })
    },
  })
}
