import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  assignCaretaker,
  reassignCaretaker,
  unassignCaretaker,
  type AssignCaretakerPayload,
  type ReassignCaretakerPayload,
  type UnassignCaretakerPayload,
} from "../api/patients-api"
import { patientDetailKeys } from "./use-patient-detail"

/**
 * Every custody write also writes to the audit trail, so each of these
 * invalidates `history` alongside `profile` and `caretake`. Invalidating
 * only the profile would leave the History tab showing a trail that is
 * missing the change the user just made.
 */
function useCaretakerInvalidation(patientId: string) {
  const queryClient = useQueryClient()
  const keys = patientDetailKeys(Number(patientId))

  return () => {
    queryClient.invalidateQueries({ queryKey: keys.profile })
    queryClient.invalidateQueries({ queryKey: keys.caretake })
    queryClient.invalidateQueries({ queryKey: keys.history })
  }
}

export function useAssignCaretaker(patientId: string) {
  const invalidate = useCaretakerInvalidation(patientId)
  const numericId = Number(patientId)

  return useMutation({
    mutationFn: (payload: AssignCaretakerPayload) => assignCaretaker(numericId, payload),
    onSuccess: invalidate,
  })
}

/**
 * Distinct from unassign-then-assign: only this path stamps
 * `replaced_by_id`, which is what links the outgoing and incoming holders
 * into a handover chain in the assignment history.
 */
export function useReassignCaretaker(patientId: string) {
  const invalidate = useCaretakerInvalidation(patientId)

  return useMutation({
    mutationFn: ({
      caretakerId,
      payload,
    }: {
      caretakerId: string | number
      payload: ReassignCaretakerPayload
    }) => reassignCaretaker(caretakerId, payload),
    onSuccess: invalidate,
  })
}

export function useUnassignCaretaker(patientId: string) {
  const invalidate = useCaretakerInvalidation(patientId)

  return useMutation({
    mutationFn: ({
      caretakerId,
      payload,
    }: {
      caretakerId: string | number
      payload?: UnassignCaretakerPayload
    }) => unassignCaretaker(caretakerId, payload),
    onSuccess: invalidate,
  })
}
