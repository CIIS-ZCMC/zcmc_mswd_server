import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { getPsgcCity, listPsgcBarangays, searchPsgcCities } from "../api/psgc-api"

const HOUR = 1000 * 60 * 60

export const psgcKeys = {
  all: ["reference", "psgc"] as const,
  citySearch: (search: string) => ["reference", "psgc", "cities", { search }] as const,
  city: (code: string) => ["reference", "psgc", "city", code] as const,
  barangays: (cityCode: string) => ["reference", "psgc", "barangays", cityCode] as const,
}

/** Cities and municipalities matching what the user has typed (empty: the first few). */
export function usePsgcCitySearch(search: string, enabled = true) {
  return useQuery({
    queryKey: psgcKeys.citySearch(search),
    queryFn: () => searchPsgcCities(search),
    enabled,
    staleTime: HOUR,
    placeholderData: keepPreviousData,
  })
}

/** One city by code, so a saved address can show its name before any search. */
export function usePsgcCity(code: string | null) {
  return useQuery({
    queryKey: psgcKeys.city(code ?? ""),
    queryFn: () => getPsgcCity(code as string),
    enabled: !!code,
    staleTime: HOUR,
  })
}

/** Every barangay of a city; waits until a city is chosen. */
export function usePsgcBarangays(cityCode: string | null) {
  return useQuery({
    queryKey: psgcKeys.barangays(cityCode ?? ""),
    queryFn: () => listPsgcBarangays(cityCode as string),
    enabled: !!cityCode,
    staleTime: HOUR,
  })
}
