import { useQuery } from "@tanstack/react-query"
import {
  getFundSourceOptions,
  getModeOfAssistanceOptions,
} from "../api/library-api"
import { libraryKeys } from "./use-library"

export function useModeOfAssistanceOptions(activeOnly = true) {
  return useQuery({
    queryKey: libraryKeys.modes.options(activeOnly),
    queryFn: () => getModeOfAssistanceOptions(activeOnly),
    staleTime: 5 * 60 * 1000,
  })
}

export function useFundSourceOptions(activeOnly = true) {
  return useQuery({
    queryKey: libraryKeys.fundSources.options(activeOnly),
    queryFn: () => getFundSourceOptions(activeOnly),
    staleTime: 5 * 60 * 1000,
  })
}
