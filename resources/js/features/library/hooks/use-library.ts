import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createAssistantType,
  createDocumentType,
  createFundSource,
  createGuarantor,
  createModeOfAssistance,
  createSignatory,
  deleteAssistantType,
  deleteDocumentType,
  deleteFundSource,
  deleteGuarantor,
  deleteModeOfAssistance,
  deleteSignatory,
  getAssistantTypes,
  getDocumentTypes,
  getFundSources,
  getGuarantors,
  getModeOfAssistances,
  getSignatories,
  getTurnaroundTargets,
  updateAssistantType,
  updateDocumentType,
  updateFundSource,
  updateGuarantor,
  updateModeOfAssistance,
  updateSignatory,
  updateTurnaroundTarget,
} from "../api/library-api"
import type {
  SaveAssessmentLookupInput,
  SaveAssistantTypeInput,
  SaveDocumentTypeInput,
  SaveGuarantorInput,
  SaveSignatoryInput,
  SaveTurnaroundTargetInput,
} from "../types"
import { guarantorOptionKeys } from "@/features/guarantees/hooks/use-guarantor-options"
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
  documentTypes: {
    all: ["library", "document-types"] as const,
    list: (activeOnly: boolean) =>
      [...libraryKeys.documentTypes.all, "list", { activeOnly }] as const,
    options: (activeOnly: boolean) =>
      ["document-types", "options", { activeOnly }] as const,
  },
  guarantors: {
    all: ["library", "guarantors"] as const,
    list: (activeOnly: boolean) =>
      [...libraryKeys.guarantors.all, "list", { activeOnly }] as const,
  },
  signatories: {
    all: ["library", "signatories"] as const,
  },
  turnaroundTargets: {
    all: ["library", "turnaround-targets"] as const,
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
  queryClient.invalidateQueries({ queryKey: ["document-types"] })
  queryClient.invalidateQueries({ queryKey: guarantorOptionKeys.all })
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
 * Document Types Hooks
 */
export function useDocumentTypes(activeOnly = false, enabled = true) {
  return useQuery({
    queryKey: libraryKeys.documentTypes.list(activeOnly),
    queryFn: () => getDocumentTypes(activeOnly),
    enabled,
  })
}

export function useCreateDocumentType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SaveDocumentTypeInput) => createDocumentType(input),
    onSuccess: () => {
      invalidateLibraryCaches(queryClient)
    },
  })
}

export function useUpdateDocumentType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: number | string
      input: SaveDocumentTypeInput
    }) => updateDocumentType(id, input),
    onSuccess: () => {
      invalidateLibraryCaches(queryClient)
    },
  })
}

export function useDeleteDocumentType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) => deleteDocumentType(id),
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

/**
 * Signatories Hooks
 */
export function useSignatories(enabled = true) {
  return useQuery({
    queryKey: libraryKeys.signatories.all,
    queryFn: getSignatories,
    enabled,
  })
}

export function useCreateSignatory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SaveSignatoryInput) => createSignatory(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: libraryKeys.signatories.all })
    },
  })
}

export function useUpdateSignatory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: number | string
      input: SaveSignatoryInput
    }) => updateSignatory(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: libraryKeys.signatories.all })
    },
  })
}

export function useDeleteSignatory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) => deleteSignatory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: libraryKeys.signatories.all })
    },
  })
}

/**
 * Turnaround Targets Hooks
 */
export function useTurnaroundTargets(enabled = true) {
  return useQuery({
    queryKey: libraryKeys.turnaroundTargets.all,
    queryFn: getTurnaroundTargets,
    enabled,
  })
}

export function useUpdateTurnaroundTarget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: number | string
      input: SaveTurnaroundTargetInput
    }) => updateTurnaroundTarget(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: libraryKeys.turnaroundTargets.all,
      })
      queryClient.invalidateQueries({ queryKey: ["service-visits"] })
    },
  })
}
