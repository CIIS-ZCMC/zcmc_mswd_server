import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { usePermission } from "@/features/auth/hooks/use-permission"
import {
  completeProgressNoteFollowUp,
  createCaseProgressNote,
  deleteCaseProgressNote,
  getCaseProgressNotes,
  getMyFollowUps,
  updateCaseProgressNote,
} from "../api/progress-notes-api"
import type {
  CreateProgressNotePayload,
  UpdateProgressNotePayload,
} from "../types/progress-note.types"
import { caseKeys } from "./use-cases"

export const progressNoteKeys = {
  all: ["progress-notes"] as const,
  byCase: (caseId: number | string) => [...progressNoteKeys.all, "case", String(caseId)] as const,
  myFollowUps: () => [...progressNoteKeys.all, "my-follow-ups"] as const,
}

export function useProgressNotes(caseId?: number | string | null) {
  const canView = usePermission("cases.view")
  const validId = caseId ? String(caseId) : null

  return useQuery({
    queryKey: progressNoteKeys.byCase(validId ?? ""),
    queryFn: async () => {
      if (!validId) return []
      return getCaseProgressNotes(validId)
    },
    enabled: Boolean(canView && validId),
    staleTime: 1000 * 30,
  })
}

export function useMyFollowUps() {
  const canView = usePermission("cases.view")

  return useQuery({
    queryKey: progressNoteKeys.myFollowUps(),
    queryFn: async () => {
      return getMyFollowUps()
    },
    enabled: canView,
    staleTime: 1000 * 30,
  })
}

export function useProgressNoteMutations(caseId?: number | string | null) {
  const queryClient = useQueryClient()
  const validCaseId = caseId ? String(caseId) : null

  const invalidate = () => {
    if (validCaseId) {
      queryClient.invalidateQueries({ queryKey: progressNoteKeys.byCase(validCaseId) })
      queryClient.invalidateQueries({ queryKey: caseKeys.activity(validCaseId) })
    }
    queryClient.invalidateQueries({ queryKey: progressNoteKeys.myFollowUps() })
    queryClient.invalidateQueries({ queryKey: caseKeys.caseloads() })
  }

  const createMutation = useMutation({
    mutationFn: (payload: CreateProgressNotePayload) => {
      if (!validCaseId) throw new Error("Case ID required")
      return createCaseProgressNote(validCaseId, payload)
    },
    onSuccess: () => {
      invalidate()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({
      noteId,
      payload,
    }: {
      noteId: number | string
      payload: UpdateProgressNotePayload
    }) => updateCaseProgressNote(noteId, payload),
    onSuccess: () => {
      invalidate()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (noteId: number | string) => deleteCaseProgressNote(noteId),
    onSuccess: () => {
      invalidate()
    },
  })

  const completeFollowUpMutation = useMutation({
    mutationFn: (noteId: number | string) => completeProgressNoteFollowUp(noteId),
    onSuccess: () => {
      invalidate()
    },
  })

  return {
    createNote: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateNote: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteNote: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    completeFollowUp: completeFollowUpMutation.mutateAsync,
    isCompletingFollowUp: completeFollowUpMutation.isPending,
  }
}
