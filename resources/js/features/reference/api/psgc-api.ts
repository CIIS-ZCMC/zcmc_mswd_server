import { apiClient } from "@/lib/api-client"
import type { ApiEnvelope } from "@/features/patients/types/api.types"
import type { PsgcBarangay, PsgcCity } from "../types/psgc.types"

/** GET /psgc/cities?search= — at most 30, the hospital's home region first. */
export function searchPsgcCities(search: string): Promise<PsgcCity[]> {
  return apiClient
    .get<ApiEnvelope<PsgcCity[]>>("/psgc/cities", {
      params: search ? { search } : {},
    })
    .then((res) => res.data)
}

/** GET /psgc/cities?code= — one city, to label a saved code. */
export function getPsgcCity(code: string): Promise<PsgcCity | null> {
  return apiClient
    .get<ApiEnvelope<PsgcCity[]>>("/psgc/cities", { params: { code } })
    .then((res) => res.data[0] ?? null)
}

/** GET /psgc/cities/{code}/barangays — all of them, sorted by name. */
export function listPsgcBarangays(cityCode: string): Promise<PsgcBarangay[]> {
  return apiClient
    .get<ApiEnvelope<PsgcBarangay[]>>(`/psgc/cities/${cityCode}/barangays`)
    .then((res) => res.data)
}
