import { useState, useEffect, useCallback } from "react"
import { usePage } from "@inertiajs/react"
import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { usePermission } from "@/features/auth/hooks/use-permission"
import { listPatients } from "../api/patients-api"
import { toPatientListRecord } from "../api/patients-adapter"
import type { PatientRecord } from "../types"

export const PATIENTS_LIST_QUERY_KEY = ["patients", "list"] as const

/**
 * The sidebar/master list hook. Owns pagination and server-driven filter state.
 */
export function usePatients() {
  const canViewPatients = usePermission("patients.view")
  const pageObj = usePage<{ patientId?: string }>()
  const pathPatientId = pageObj.url.match(/^\/patients\/([^/?#]+)/)?.[1] || ""
  const routePatientId = pageObj.props?.patientId ?? pathPatientId ?? ""

  const [page, setPage] = useState<number>(1)
  const [search, setSearch] = useState<string>("")
  const [debouncedSearch, setDebouncedSearch] = useState<string>("")
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

  const handleSetIntakeDate = useCallback((val: string | undefined) => {
    setIntakeDate(val)
    setPage(1)
  }, [])

  const clearFilters = useCallback(() => {
    setSearch("")
    setDebouncedSearch("")
    setIntakeDate(undefined)
    setPage(1)
  }, [])

  const queryKey = [
    ...PATIENTS_LIST_QUERY_KEY,
    { page, search: debouncedSearch, intakeDate },
  ] as const

  const query = useQuery({
    queryKey,
    queryFn: () =>
      listPatients({
        page,
        perPage: 25,
        search: debouncedSearch,
        intakeDate,
      }),
    placeholderData: keepPreviousData,
    // Roles without Patients (e.g. Head) would only get a 403.
    enabled: canViewPatients,
  })

  const patients: PatientRecord[] = (query.data?.data ?? []).map(toPatientListRecord)
  const meta = query.data?.meta
  const totalPages = meta?.last_page ?? 1
  const total = meta?.total ?? 0

  const [selectedPatientId, setSelectedPatientId] = useState<string>(routePatientId)

  useEffect(() => {
    if (routePatientId) {
      setSelectedPatientId(routePatientId)
    }
  }, [routePatientId])

  const effectiveSelectedId = routePatientId || selectedPatientId || ""

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
    intakeDate,
    setIntakeDate: handleSetIntakeDate,
    clearFilters,
  }
}
