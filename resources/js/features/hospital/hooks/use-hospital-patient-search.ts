import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { searchHospitalPatients } from "../api/hospital-patient-api"

export const HOSPITAL_PATIENT_SEARCH_KEY = [
  "hospital-patients",
  "search",
] as const

export interface UseHospitalPatientSearchOptions {
  search: string
  page?: number
  perPage?: number
  enabled?: boolean
}

/**
 * Searches HIS (SQL Server) patients by hospital number, first name, or last name.
 * Automatically gates query execution on minimum 2-character search term.
 */
export function useHospitalPatientSearch({
  search,
  page = 1,
  perPage = 5,
  enabled = true,
}: UseHospitalPatientSearchOptions) {
  const trimmed = search.trim()
  const isQueryEnabled = enabled && trimmed.length >= 2

  return useQuery({
    queryKey: [
      ...HOSPITAL_PATIENT_SEARCH_KEY,
      { search: trimmed, page, perPage },
    ],
    queryFn: () => searchHospitalPatients({ search: trimmed, page, perPage }),
    enabled: isQueryEnabled,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}
