import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  cancelVisit,
  completeVisit,
  getPatientVisits,
  getQueue,
  startVisit,
  timeInVisit,
} from "../api/queue-api"
import type {
  CancelVisitInput,
  CompleteVisitInput,
  TimeInInput,
} from "../types"

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

export function useQueue(date?: string) {
  return useQuery({
    queryKey: queueKeys.queue(date),
    queryFn: () => getQueue(date),
    refetchInterval: 30000,
    staleTime: 10000,
  })
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queueKeys.all })
    },
  })
}

export function useStartVisit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (visitId: number) => startVisit(visitId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queueKeys.all })
    },
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queueKeys.all })
    },
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queueKeys.all })
    },
  })
}
