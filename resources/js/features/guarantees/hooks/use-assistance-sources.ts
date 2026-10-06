import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createAssistanceSource,
  deleteAssistanceSource,
  getAssistanceSources,
  updateAssistanceSource,
} from "../api/guarantee-api"
import { guaranteeKeys } from "./use-guarantees"
import type { SaveAssistanceSourceInput } from "../types"

export const assistanceSourceKeys = {
  all: ["assistance-sources"] as const,
  list: (activeOnly: boolean) =>
    [...assistanceSourceKeys.all, "list", { activeOnly }] as const,
}

export function useAssistanceSources(activeOnly = true, enabled = true) {
  return useQuery({
    queryKey: assistanceSourceKeys.list(activeOnly),
    queryFn: () => getAssistanceSources(activeOnly),
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateAssistanceSource() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: SaveAssistanceSourceInput) =>
      createAssistanceSource(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: assistanceSourceKeys.all,
      })
    },
  })
}

export function useUpdateAssistanceSource() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: number | string
      input: SaveAssistanceSourceInput
    }) => updateAssistanceSource(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: assistanceSourceKeys.all,
      })
      queryClient.invalidateQueries({
        queryKey: guaranteeKeys.all,
      })
    },
  })
}

export function useDeleteAssistanceSource() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number | string) => deleteAssistanceSource(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: assistanceSourceKeys.all,
      })
      queryClient.invalidateQueries({
        queryKey: guaranteeKeys.all,
      })
    },
  })
}
