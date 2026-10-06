import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  archiveCase,
  assignCase,
  closeCase,
  openCase,
  referCase,
  reopenCase,
  restoreCase,
  updateCase,
} from "../api/cases-api"
import { toCaseRecord } from "../api/cases-adapter"
import { caseKeys } from "./use-cases"
import type {
  AssignPayload,
  CloseCasePayload,
  OpenCasePayload,
  ReferPayload,
  UpdateCasePayload,
} from "../types/case.types"

export function useCaseMutations(caseId?: number | string | null) {
  const queryClient = useQueryClient()
  const id = caseId ? String(caseId) : null

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: caseKeys.all })
    queryClient.invalidateQueries({ queryKey: ["patients"] })
    queryClient.invalidateQueries({ queryKey: ["patient-transactions"] })
  }

  const openMutation = useMutation({
    mutationFn: async (payload: OpenCasePayload) => {
      const raw = await openCase(payload)
      return toCaseRecord(raw)
    },
    onSuccess: (newCase) => {
      invalidateAll()
      if (newCase?.id) {
        queryClient.setQueryData(caseKeys.detail(newCase.id), newCase)
      }
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id: targetId, payload }: { id?: number | string; payload: UpdateCasePayload }) => {
      const activeId = targetId ?? id
      if (!activeId) throw new Error("Case ID is required for update")
      const raw = await updateCase(activeId, payload)
      return toCaseRecord(raw)
    },
    onSuccess: (updatedCase) => {
      invalidateAll()
      if (updatedCase?.id) {
        queryClient.setQueryData(caseKeys.detail(updatedCase.id), updatedCase)
      }
    },
  })

  const assignMutation = useMutation({
    mutationFn: async ({ id: targetId, payload }: { id?: number | string; payload: AssignPayload }) => {
      const activeId = targetId ?? id
      if (!activeId) throw new Error("Case ID is required for assignment")
      const raw = await assignCase(activeId, payload)
      return toCaseRecord(raw)
    },
    onSuccess: () => {
      invalidateAll()
    },
  })

  const closeMutation = useMutation({
    mutationFn: async ({ id: targetId, payload }: { id?: number | string; payload?: CloseCasePayload }) => {
      const activeId = targetId ?? id
      if (!activeId) throw new Error("Case ID is required to close")
      const raw = await closeCase(activeId, payload)
      return toCaseRecord(raw)
    },
    onSuccess: () => {
      invalidateAll()
    },
  })

  const referMutation = useMutation({
    mutationFn: async ({ id: targetId, payload }: { id?: number | string; payload: ReferPayload }) => {
      const activeId = targetId ?? id
      if (!activeId) throw new Error("Case ID is required to refer")
      const raw = await referCase(activeId, payload)
      return toCaseRecord(raw)
    },
    onSuccess: () => {
      invalidateAll()
    },
  })

  const reopenMutation = useMutation({
    mutationFn: async ({ id: targetId, notes }: { id?: number | string; notes?: string }) => {
      const activeId = targetId ?? id
      if (!activeId) throw new Error("Case ID is required to reopen")
      const raw = await reopenCase(activeId, notes)
      return toCaseRecord(raw)
    },
    onSuccess: () => {
      invalidateAll()
    },
  })

  const archiveMutation = useMutation({
    mutationFn: async (targetId?: number | string) => {
      const activeId = targetId ?? id
      if (!activeId) throw new Error("Case ID is required to archive")
      await archiveCase(activeId)
    },
    onSuccess: () => {
      invalidateAll()
    },
  })

  const restoreMutation = useMutation({
    mutationFn: async (targetId?: number | string) => {
      const activeId = targetId ?? id
      if (!activeId) throw new Error("Case ID is required to restore")
      const raw = await restoreCase(activeId)
      return toCaseRecord(raw)
    },
    onSuccess: () => {
      invalidateAll()
    },
  })

  return {
    openCase: openMutation.mutateAsync,
    isOpenPending: openMutation.isPending,
    openError: openMutation.error,

    updateCase: updateMutation.mutateAsync,
    isUpdatePending: updateMutation.isPending,
    updateError: updateMutation.error,

    assignCase: assignMutation.mutateAsync,
    isAssignPending: assignMutation.isPending,
    assignError: assignMutation.error,

    closeCase: closeMutation.mutateAsync,
    isClosePending: closeMutation.isPending,
    closeError: closeMutation.error,

    referCase: referMutation.mutateAsync,
    isReferPending: referMutation.isPending,
    referError: referMutation.error,

    reopenCase: reopenMutation.mutateAsync,
    isReopenPending: reopenMutation.isPending,
    reopenError: reopenMutation.error,

    archiveCase: archiveMutation.mutateAsync,
    isArchivePending: archiveMutation.isPending,
    archiveError: archiveMutation.error,

    restoreCase: restoreMutation.mutateAsync,
    isRestorePending: restoreMutation.isPending,
    restoreError: restoreMutation.error,
  }
}
