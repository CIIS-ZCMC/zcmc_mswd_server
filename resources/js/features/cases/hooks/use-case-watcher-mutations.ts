import { useMutation, useQueryClient } from "@tanstack/react-query"
import { patientDetailKeys } from "@/features/patients/hooks/use-patient-detail"
import {
  createCaseWatcher,
  deleteCaseWatcher,
  destroyWatcherWaiver,
  issueWatcherPass,
  promoteCaseWatcher,
  revokeWatcherPass,
  storeWatcherWaiver,
  updateCaseWatcher,
  type CreateCaseWatcherPayload,
  type IssueWatcherPassPayload,
  type StoreWatcherWaiverPayload,
  type UpdateCaseWatcherPayload,
} from "../api/case-watchers-api"
import { caseWatcherKeys } from "./use-case-watchers"

interface MutationParams {
  caseId: number
  patientId?: number
}

export function useCaseWatcherMutations({ caseId, patientId }: MutationParams) {
  const queryClient = useQueryClient()

  const invalidateWatcherQueries = () => {
    if (caseId) {
      queryClient.invalidateQueries({ queryKey: caseWatcherKeys(caseId).list })
      queryClient.invalidateQueries({ queryKey: caseWatcherKeys(caseId).status })
    }
    if (patientId) {
      queryClient.invalidateQueries({ queryKey: patientDetailKeys(patientId).latestCase })
      queryClient.invalidateQueries({ queryKey: patientDetailKeys(patientId).profile })
    }
  }

  const createWatcherMutation = useMutation({
    mutationFn: (payload: CreateCaseWatcherPayload) => createCaseWatcher(caseId, payload),
    onSuccess: invalidateWatcherQueries,
  })

  const updateWatcherMutation = useMutation({
    mutationFn: ({ watcherId, payload }: { watcherId: number; payload: UpdateCaseWatcherPayload }) =>
      updateCaseWatcher(watcherId, payload),
    onSuccess: invalidateWatcherQueries,
  })

  const deleteWatcherMutation = useMutation({
    mutationFn: (watcherId: number) => deleteCaseWatcher(watcherId),
    onSuccess: invalidateWatcherQueries,
  })

  const promoteWatcherMutation = useMutation({
    mutationFn: (watcherId: number) => promoteCaseWatcher(watcherId),
    onSuccess: invalidateWatcherQueries,
  })

  const issuePassMutation = useMutation({
    mutationFn: ({ watcherId, payload }: { watcherId: number; payload?: IssueWatcherPassPayload }) =>
      issueWatcherPass(watcherId, payload),
    onSuccess: invalidateWatcherQueries,
  })

  const revokePassMutation = useMutation({
    mutationFn: (watcherId: number) => revokeWatcherPass(watcherId),
    onSuccess: invalidateWatcherQueries,
  })

  const storeWaiverMutation = useMutation({
    mutationFn: (payload: StoreWatcherWaiverPayload) => storeWatcherWaiver(caseId, payload),
    onSuccess: invalidateWatcherQueries,
  })

  const destroyWaiverMutation = useMutation({
    mutationFn: () => destroyWatcherWaiver(caseId),
    onSuccess: invalidateWatcherQueries,
  })

  return {
    createWatcher: createWatcherMutation.mutateAsync,
    isCreating: createWatcherMutation.isPending,

    updateWatcher: updateWatcherMutation.mutateAsync,
    isUpdating: updateWatcherMutation.isPending,

    deleteWatcher: deleteWatcherMutation.mutateAsync,
    isDeleting: deleteWatcherMutation.isPending,

    promoteWatcher: promoteWatcherMutation.mutateAsync,
    isPromoting: promoteWatcherMutation.isPending,

    issuePass: issuePassMutation.mutateAsync,
    isIssuingPass: issuePassMutation.isPending,

    revokePass: revokePassMutation.mutateAsync,
    isRevokingPass: revokePassMutation.isPending,

    storeWaiver: storeWaiverMutation.mutateAsync,
    isStoringWaiver: storeWaiverMutation.isPending,

    destroyWaiver: destroyWaiverMutation.mutateAsync,
    isDestroyingWaiver: destroyWaiverMutation.isPending,
  }
}
