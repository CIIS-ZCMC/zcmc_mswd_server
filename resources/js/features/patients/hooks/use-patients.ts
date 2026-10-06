import { useState, useEffect, useCallback } from "react"
import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { listPatients } from "../api/patients-api"
import { toPatientListRecord } from "../api/patients-adapter"
import type { PatientRecord } from "../types"

export const PATIENTS_LIST_QUERY_KEY = ["patients", "list"] as const

/**
 * The sidebar/master list hook. Owns pagination and server-driven filter state.
 */
export function usePatients() {
  const [page, setPage] = useState<number>(1)
  const [search, setSearch] = useState<string>("")
  const [debouncedSearch, setDebouncedSearch] = useState<string>("")
  const [classification, setClassification] = useState<string>("ALL")
  const [intakeDate, setIntakeDate] = useState<string | undefined>(undefined)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const handleSetSearch = useCallback((val: string) => {
    setSearch(val)
    setPage(1)
  }, [])

  const handleSetClassification = useCallback((val: string) => {
    setClassification(val)
    setPage(1)
  }, [])

  const handleSetIntakeDate = useCallback((val: string | undefined) => {
    setIntakeDate(val)
    setPage(1)
  }, [])

  const clearFilters = useCallback(() => {
    setSearch("")
    setDebouncedSearch("")
    setClassification("ALL")
    setIntakeDate(undefined)
    setPage(1)
  }, [])

  const queryKey = [
    ...PATIENTS_LIST_QUERY_KEY,
    { page, search: debouncedSearch, classification, intakeDate },
  ] as const

  const query = useQuery({
    queryKey,
    queryFn: () =>
      listPatients({
        page,
        perPage: 25,
        search: debouncedSearch,
        classification,
        intakeDate,
      }),
    placeholderData: keepPreviousData,
  })

  const patients: PatientRecord[] = (query.data?.data ?? []).map(toPatientListRecord)
  const meta = query.data?.meta
  const totalPages = meta?.last_page ?? 1
  const total = meta?.total ?? 0

  const [selectedPatientId, setSelectedPatientId] = useState<string>("")

  const effectiveSelectedId = selectedPatientId || patients[0]?.id || ""

  return {
    patients,
    selectedPatientId: effectiveSelectedId,
    setSelectedPatientId,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    page,
    setPage,
    totalPages,
    total,
    search,
    setSearch: handleSetSearch,
    classification,
    setClassification: handleSetClassification,
    intakeDate,
    setIntakeDate: handleSetIntakeDate,
    clearFilters,
  }
}
