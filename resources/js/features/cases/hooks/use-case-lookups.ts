import { useQuery } from "@tanstack/react-query"
import { getHospitalCaseTypes, getHospitalTransactionTypes } from "../api/cases-api"

export function useAdmissionTypes() {
  return useQuery({
    queryKey: ["lookups", "admission-types"],
    queryFn: getHospitalCaseTypes,
    staleTime: 1000 * 60 * 30, // 30 mins
  })
}

export function useTransactionTypes() {
  return useQuery({
    queryKey: ["lookups", "transaction-types"],
    queryFn: getHospitalTransactionTypes,
    staleTime: 1000 * 60 * 30, // 30 mins
  })
}
