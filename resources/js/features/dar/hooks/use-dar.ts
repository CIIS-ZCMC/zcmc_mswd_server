import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createDarEntry,
  deleteDarEntry,
  getDar,
  updateDarEntry,
} from "../api/dar-api"
import type {
  StoreDarEntryPayload,
  UpdateDarEntryPayload,
} from "../types/dar.types"

export const DAR_QUERY_KEY = ["dar"] as const

/**
 * Fetch DAR records and summary for the specified date.
 */
export function useDarEntries(date: string) {
  return useQuery({
    queryKey: [...DAR_QUERY_KEY, date],
    queryFn: () => getDar(date),
    enabled: Boolean(date),
  })
}

/**
 * Mutation hook to create a new DAR entry.
 */
export function useCreateDarEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: StoreDarEntryPayload) => createDarEntry(payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...DAR_QUERY_KEY, variables.entry_date],
      })
      queryClient.invalidateQueries({
        queryKey: DAR_QUERY_KEY,
      })
    },
  })
}

/**
 * Mutation hook to update an existing DAR entry.
 */
export function useUpdateDarEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number
      payload: UpdateDarEntryPayload
    }) => updateDarEntry(id, payload),
    onSuccess: (_data, variables) => {
      if (variables.payload.entry_date) {
        queryClient.invalidateQueries({
          queryKey: [...DAR_QUERY_KEY, variables.payload.entry_date],
        })
      }
      queryClient.invalidateQueries({
        queryKey: DAR_QUERY_KEY,
      })
    },
  })
}

/**
 * Mutation hook to delete a DAR entry.
 */
export function useDeleteDarEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteDarEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: DAR_QUERY_KEY,
      })
    },
  })
}
