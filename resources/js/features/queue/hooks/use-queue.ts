import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  cancelVisit,
  completeVisit,
  getPatientVisits,
  getQueue,
  startVisit,
  takeOverVisit,
  timeInVisit,
} from "../api/queue-api"
import type {
  CancelVisitInput,
  CompleteVisitInput,
  ServiceVisit,
  TakeOverVisitInput,
  TimeInInput,
} from "../types"
import { PATIENTS_LIST_QUERY_KEY } from "@/features/patients/hooks/use-patients"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { usePermission } from "@/features/auth/hooks/use-permission"

/**
 * Every visit mutation changes a patient's queue status, which the registry
 * list shows as a badge (`active_visit`), so refresh both.
 */
function invalidateVisitQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queueKeys.all })
  queryClient.invalidateQueries({ queryKey: PATIENTS_LIST_QUERY_KEY })
}

export const queueKeys = {
  all: ["service-visits"] as const,
  queue: (date?: string) => [...queueKeys.all, "queue", { date }] as const,
  patientVisits: (patientId: number | string, transactionId?: number) =>
    [
      ...queueKeys.all,
      "patient",
      String(patientId),
      { transactionId },
    ] as const,
}

export function useQueue(date?: string, enabled = true) {
  return useQuery({
    queryKey: queueKeys.queue(date),
    queryFn: () => getQueue(date),
    refetchInterval: 30000,
    staleTime: 10000,
    enabled,
  })
}

/**
 * The visit the signed-in worker is serving right now, if any. A worker serves one
 * visit at a time (ServiceVisitService refuses a second Start or Take Over), so this
 * is at most one row. Reads today's queue board, which lists every open visit.
 */
export function useMyActiveVisit(): ServiceVisit | null {
  const { user } = useAuth()
  const canManage = usePermission("queue.manage")
  const { data } = useQueue(undefined, canManage && Boolean(user))

  if (!user || !data) return null

  return (
    data.inProgress.find(
      (visit) => String(visit.servedBy?.id) === String(user.id)
    ) ?? null
  )
}

export function usePatientVisits(
  patientId?: number | string | null,
  transactionId?: number | null,
  enabled = true
) {
  return useQuery({
    queryKey: queueKeys.patientVisits(
      patientId || "",
      transactionId ?? undefined
    ),
    queryFn: () => getPatientVisits(patientId!, transactionId ?? undefined),
    // The endpoint needs queue.manage; callers pass that check here.
    enabled: enabled && Boolean(patientId),
    staleTime: 10000,
  })
}

/** An ISO timestamp as the "HH:mm" an `<input type="time">` takes. */
export function toTimeInput(iso: string | null): string {
  if (!iso) return ""
  const date = new Date(iso)
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
}

/**
 * The encounter's turnaround as the slips print it: start of service and
 * completion of its latest visit that started and was not cancelled (mirrors
 * ServiceVisit::lastServedFor). Blank strings when there is none.
 */
export function useEncounterServiceTimes(
  patientId?: number | string | null,
  transactionId?: number | null,
  enabled = true
) {
  const query = usePatientVisits(patientId, transactionId, enabled)
  // The endpoint already returns the newest arrival first.
  const visit =
    query.data?.find(
      (item) => item.status !== "cancelled" && item.startedAt !== null
    ) ?? null

  return {
    visit,
    started: toTimeInput(visit?.startedAt ?? null),
    ended: toTimeInput(visit?.completedAt ?? null),
    isLoading: enabled && query.isLoading,
  }
}

export function useTimeInVisit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      patientId,
      input,
    }: {
      patientId: number | string
      input: TimeInInput
    }) => timeInVisit(patientId, input),
    onSuccess: () => invalidateVisitQueries(queryClient),
  })
}

// The mutations below refresh on failure too: a refusal usually means another
// worker got there first, and the screen should show that straight away.

export function useStartVisit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (visitId: number) => startVisit(visitId),
    onSettled: () => invalidateVisitQueries(queryClient),
  })
}

export function useCompleteVisit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      visitId,
      input,
    }: {
      visitId: number
      input?: CompleteVisitInput
    }) => completeVisit(visitId, input),
    onSettled: () => invalidateVisitQueries(queryClient),
  })
}

export function useCancelVisit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      visitId,
      input,
    }: {
      visitId: number
      input: CancelVisitInput
    }) => cancelVisit(visitId, input),
    onSettled: () => invalidateVisitQueries(queryClient),
  })
}

export function useTakeOverVisit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      visitId,
      input,
    }: {
      visitId: number
      input: TakeOverVisitInput
    }) => takeOverVisit(visitId, input),
    onSettled: () => invalidateVisitQueries(queryClient),
  })
}
