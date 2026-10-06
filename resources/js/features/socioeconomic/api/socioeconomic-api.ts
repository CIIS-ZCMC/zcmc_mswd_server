import { apiClient } from "@/lib/api-client"
import type {
  ApiEnvelope,
  ApiSocioeconomicOverview,
  ApiSocioeconomicProfile,
} from "../types/api.types"
import type {
  SocioeconomicOverview,
  SocioeconomicProfile,
  SaveSocioeconomicInput,
} from "../types/socioeconomic.types"
import {
  toSocioeconomicOverview,
  toSocioeconomicCurrent,
  toApiSaveSocioeconomicPayload,
} from "./socioeconomic-adapter"

/**
 * GET /api/patients/{id}/socioeconomic — Fetch a patient's full socioeconomic overview
 */
export async function getSocioeconomicOverview(patientId: number | string): Promise<SocioeconomicOverview> {
  const res = await apiClient.get<ApiEnvelope<ApiSocioeconomicOverview>>(`/patients/${patientId}/socioeconomic`)
  return toSocioeconomicOverview(res.data)
}

/**
 * GET /api/socioeconomic-profiles/{id} — Fetch a single socioeconomic profile snapshot
 */
export async function getSocioeconomicProfile(id: number | string): Promise<SocioeconomicProfile> {
  const res = await apiClient.get<ApiEnvelope<ApiSocioeconomicProfile>>(`/socioeconomic-profiles/${id}`)
  return toSocioeconomicCurrent(res.data)
}

/**
 * POST /api/patients/{id}/socioeconomic-profiles — Create a new socioeconomic profile for a patient
 */
export async function createSocioeconomicProfile(
  patientId: number | string,
  input: SaveSocioeconomicInput
): Promise<SocioeconomicProfile> {
  const payload = toApiSaveSocioeconomicPayload(input)
  const res = await apiClient.post<ApiEnvelope<ApiSocioeconomicProfile>>(
    `/patients/${patientId}/socioeconomic-profiles`,
    payload
  )
  return toSocioeconomicCurrent(res.data)
}

/**
 * PUT /api/socioeconomic-profiles/{id} — Update an existing socioeconomic profile
 */
export async function updateSocioeconomicProfile(
  id: number | string,
  input: SaveSocioeconomicInput
): Promise<SocioeconomicProfile> {
  const payload = toApiSaveSocioeconomicPayload(input)
  const res = await apiClient.put<ApiEnvelope<ApiSocioeconomicProfile>>(
    `/socioeconomic-profiles/${id}`,
    payload
  )
  return toSocioeconomicCurrent(res.data)
}

/**
 * DELETE /api/socioeconomic-profiles/{id} — Delete a socioeconomic profile
 */
export async function deleteSocioeconomicProfile(id: number | string): Promise<void> {
  await apiClient.delete(`/socioeconomic-profiles/${id}`)
}
