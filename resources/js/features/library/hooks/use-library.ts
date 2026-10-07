import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createAssistantType,
  createFundSource,
  createGuarantor,
  createModeOfAssistance,
  deleteAssistantType,
  deleteFundSource,
  deleteGuarantor,
  deleteModeOfAssistance,
  getAssistantTypes,
  getFundSources,
  getGuarantors,
  getModeOfAssistances,
  updateAssistantType,
  updateFundSource,
  updateGuarantor,
  updateModeOfAssistance,
} from "../api/library-api"
import type {
  SaveAssessmentLookupInput,
  SaveAssistantTypeInput,
  SaveGuarantorInput,
} from "../types"
import { guarantorOptionKeys } from "@/features/guarantees/hooks/use-guarantor-options"
import { assistanceSourceKeys } from "@/features/guarantees/hooks/use-assistance-sources"
import { guaranteeKeys } from "@/features/guarantees/hooks/use-guarantees"

export const libraryKeys = {
  all: ["library"] as const,
  assistantTypes: {
    all: ["library", "assistant-types"] as const,
    list: (activeOnly: boolean) =>
      [...libraryKeys.assistantTypes.all, "list", { activeOnly }] as const,
    options: (activeOnly: boolean) =>
      ["assistant-types", "options", { activeOnly }] as const,
  },
  modes: {
    all: ["library", "modes"] as const,
    list: (activeOnly: boolean) =>
      [...libraryKeys.modes.all, "list", { activeOnly }] as const,
    options: (activeOnly: boolean) =>
      ["mode-of-assistances", "options", { activeOnly }] as const,
  },
  fundSources: {
    all: ["library", "fund-sources"] as const,
    list: (activeOnly: boolean) =>
      [...libraryKeys.fundSources.all, "list", { activeOnly }] as const,
    options: (activeOnly: boolean) =>
      ["fund-sources", "options", { activeOnly }] as const,
  },
  guarantors: {
    all: ["library", "guarantors"] as const,
    list: (activeOnly: boolean) =>
      [...libraryKeys.guarantors.all, "list", { activeOnly }] as const,
  },
}

/**
 * Invalidate all option keys and related queries when library lookups change.
 */
export function invalidateLibraryCaches(
  queryClient: ReturnType<typeof useQueryClient>
) {
  queryClient.invalidateQueries({ queryKey: libraryKeys.all })
  queryClient.invalidateQueries({ queryKey: ["assistant-types"] })
  queryClient.invalidateQueries({ queryKey: ["mode-of-assistances"] })
  queryClient.invalidateQueries({ queryKey: ["fund-sources"] })
  queryClient.invalidateQueries({ queryKey: guarantorOptionKeys.all })
  queryClient.invalidateQueries({ queryKey: assistanceSourceKeys.all })
  queryClient.invalidateQueries({ queryKey: guaranteeKeys.all })
}

/**
 * Types of Assistance Hooks
 */
export function useAssistantTypes(activeOnly = false, enabled = true) {
  return useQuery({
    queryKey: libraryKeys.assistantTypes.list(activeOnly),
    queryFn: () => getAssistantTypes(activeOnly),
    enabled,
  })
}

export function useCreateAssistantType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SaveAssistantTypeInput) => createAssistantType(input),
    onSuccess: () => {
      invalidateLibraryCaches(queryClient)
    },
  })
}

export function useUpdateAssistantType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: number | string
      input: SaveAssistantTypeInput
    }) => updateAssistantType(id, input),
    onSuccess: () => {
      invalidateLibraryCaches(queryClient)
    },
  })
}

export function useDeleteAssistantType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) => deleteAssistantType(id),
    onSuccess: () => {
      invalidateLibraryCaches(queryClient)
    },
  })
}

/**
 * Modes of Assistance Hooks
 */
export function useModeOfAssistances(activeOnly = false, enabled = true) {
  return useQuery({
    queryKey: libraryKeys.modes.list(activeOnly),
    queryFn: () => getModeOfAssistances(activeOnly),
    enabled,
  })
}

export function useCreateModeOfAssistance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SaveAssessmentLookupInput) =>
      createModeOfAssistance(input),
    onSuccess: () => {
      invalidateLibraryCaches(queryClient)
    },
  })
}

export function useUpdateModeOfAssistance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: number | string
      input: SaveAssessmentLookupInput
    }) => updateModeOfAssistance(id, input),
    onSuccess: () => {
      invalidateLibraryCaches(queryClient)
    },
  })
}

export function useDeleteModeOfAssistance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) => deleteModeOfAssistance(id),
    onSuccess: () => {
      invalidateLibraryCaches(queryClient)
    },
  })
}

/**
 * Fund Sources Hooks
 */
export function useFundSources(activeOnly = false, enabled = true) {
  return useQuery({
    queryKey: libraryKeys.fundSources.list(activeOnly),
    queryFn: () => getFundSources(activeOnly),
    enabled,
  })
}

export function useCreateFundSource() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SaveAssessmentLookupInput) => createFundSource(input),
    onSuccess: () => {
      invalidateLibraryCaches(queryClient)
    },
  })
}

export function useUpdateFundSource() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: number | string
      input: SaveAssessmentLookupInput
    }) => updateFundSource(id, input),
    onSuccess: () => {
      invalidateLibraryCaches(queryClient)
    },
  })
}

export function useDeleteFundSource() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) => deleteFundSource(id),
    onSuccess: () => {
      invalidateLibraryCaches(queryClient)
    },
  })
}

/**
 * Guarantors Hooks
 */
export function useGuarantors(activeOnly = false, enabled = true) {
  return useQuery({
    queryKey: libraryKeys.guarantors.list(activeOnly),
    queryFn: () => getGuarantors(activeOnly),
    enabled,
  })
}

export function useCreateGuarantor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SaveGuarantorInput) => createGuarantor(input),
    onSuccess: () => {
      invalidateLibraryCaches(queryClient)
    },
  })
}

export function useUpdateGuarantor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: number | string
      input: SaveGuarantorInput
    }) => updateGuarantor(id, input),
    onSuccess: () => {
      invalidateLibraryCaches(queryClient)
    },
  })
}

export function useDeleteGuarantor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) => deleteGuarantor(id),
    onSuccess: () => {
      invalidateLibraryCaches(queryClient)
    },
  })
}
