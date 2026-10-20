import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createWatcher,
  deleteWatcher,
  listPatientWatchers,
  updateWatcher,
  type CreateWatcherPayload,
  type UpdateWatcherPayload,
} from "../api/patients-api"
import { toWatcher } from "../api/patients-adapter"
import type { Watcher } from "../types/watcher.types"
import { patientDetailKeys } from "./use-patient-detail"

export function patientWatcherKeys(patientId: number) {
  return { list: ["patients", patientId, "watchers"] as const }
}

/** The patient's watchers, each with the cases it is assigned to. Works with or without a case. */
export function usePatientWatchers(patientId: number | null | undefined) {
  return useQuery<Watcher[]>({
    queryKey: patientId ? patientWatcherKeys(patientId).list : ["patients", "none", "watchers"],
    queryFn: async () => (await listPatientWatchers(patientId as number)).map(toWatcher),
    enabled: Boolean(patientId),
  })
}

/** Add, edit and remove a patient's watchers (the person, not their case assignment). */
export function usePatientWatcherMutations(patientId: number) {
  const queryClient = useQueryClient()

  // A watcher's details also show on every case they are assigned to, so the
  // case watcher lists and the profile are refreshed along with the directory.
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: patientWatcherKeys(patientId).list })
    queryClient.invalidateQueries({ queryKey: patientDetailKeys(patientId).profile })
    queryClient.invalidateQueries({ queryKey: ["cases"] })
  }

  const create = useMutation({
    mutationFn: (payload: CreateWatcherPayload) => createWatcher(patientId, payload),
    onSuccess: invalidate,
  })

  const update = useMutation({
    mutationFn: ({ watcherId, payload }: { watcherId: number; payload: UpdateWatcherPayload }) =>
      updateWatcher(watcherId, payload),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: (watcherId: number) => deleteWatcher(watcherId),
    onSuccess: invalidate,
  })

  return {
    createWatcher: create.mutateAsync,
    isCreating: create.isPending,
    updateWatcher: update.mutateAsync,
    isUpdating: update.isPending,
    deleteWatcher: remove.mutateAsync,
    isDeleting: remove.isPending,
  }
}
