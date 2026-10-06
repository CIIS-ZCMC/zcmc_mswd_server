import { apiClient } from "@/lib/api-client"
import type {
  ApiAssistanceSource,
  ApiGuaranteesResponse,
  ApiGuarantorOption,
  ApiPatientGuarantee,
  AssistanceSource,
  GuaranteesResponse,
  GuarantorOption,
  PatientGuarantee,
  SaveAssistanceSourceInput,
  SaveGuaranteeInput,
} from "../types"
import {
  toAssistanceSource,
  toGuaranteesResponse,
  toGuarantorOption,
  toPatientGuarantee,
  toApiSaveAssistanceSourcePayload,
  toApiSaveGuaranteePayload,
} from "./guarantee-adapter"

/**
 * GET /api/patients/{id}/guarantees?transaction={transactionId}
 */
export async function getGuarantees(
  patientId: number | string,
  transactionId?: number | string
): Promise<GuaranteesResponse> {
  const params: Record<string, string | number> = {}
  if (transactionId !== undefined && transactionId !== null) {
    params.transaction = transactionId
  }

  const res = await apiClient.get<ApiGuaranteesResponse>(
    `/patients/${patientId}/guarantees`,
    {
      params,
    }
  )
  return toGuaranteesResponse(res)
}

/**
 * GET /api/guarantees/{id}
 */
export async function getGuarantee(
  id: number | string
): Promise<PatientGuarantee> {
  const res = await apiClient.get<{ data: ApiPatientGuarantee }>(
    `/guarantees/${id}`
  )
  return toPatientGuarantee(res.data)
}

/**
 * POST /api/patients/{id}/guarantees
 */
export async function createGuarantee(
  patientId: number | string,
  input: SaveGuaranteeInput
): Promise<PatientGuarantee> {
  const payload = toApiSaveGuaranteePayload(input)
  const res = await apiClient.post<{ data: ApiPatientGuarantee }>(
    `/patients/${patientId}/guarantees`,
    payload
  )
  return toPatientGuarantee(res.data)
}

/**
 * PUT /api/guarantees/{id}
 */
export async function updateGuarantee(
  id: number | string,
  input: SaveGuaranteeInput
): Promise<PatientGuarantee> {
  const payload = toApiSaveGuaranteePayload(input)
  const res = await apiClient.put<{ data: ApiPatientGuarantee }>(
    `/guarantees/${id}`,
    payload
  )
  return toPatientGuarantee(res.data)
}

/**
 * DELETE /api/guarantees/{id}
 */
export async function deleteGuarantee(id: number | string): Promise<void> {
  await apiClient.delete(`/guarantees/${id}`)
}

/**
 * GET /api/assistance-sources?active=1
 */
export async function getAssistanceSources(
  activeOnly = true
): Promise<AssistanceSource[]> {
  const res = await apiClient.get<{ data: ApiAssistanceSource[] }>(
    "/assistance-sources",
    {
      params: activeOnly ? { active: 1 } : {},
    }
  )
  const list = Array.isArray(res.data) ? res.data : []
  return list.map(toAssistanceSource)
}

/**
 * POST /api/assistance-sources
 */
export async function createAssistanceSource(
  input: SaveAssistanceSourceInput
): Promise<AssistanceSource> {
  const payload = toApiSaveAssistanceSourcePayload(input)
  const res = await apiClient.post<{ data: ApiAssistanceSource }>(
    "/assistance-sources",
    payload
  )
  return toAssistanceSource(res.data)
}

/**
 * PUT /api/assistance-sources/{id}
 */
export async function updateAssistanceSource(
  id: number | string,
  input: SaveAssistanceSourceInput
): Promise<AssistanceSource> {
  const payload = toApiSaveAssistanceSourcePayload(input)
  const res = await apiClient.put<{ data: ApiAssistanceSource }>(
    `/assistance-sources/${id}`,
    payload
  )
  return toAssistanceSource(res.data)
}

/**
 * DELETE /api/assistance-sources/{id}
 */
export async function deleteAssistanceSource(
  id: number | string
): Promise<void> {
  await apiClient.delete(`/assistance-sources/${id}`)
}

/**
 * GET /api/guarantors?active=1
 */
export async function getGuarantorOptions(
  activeOnly = true
): Promise<GuarantorOption[]> {
  const res = await apiClient.get<{ data: ApiGuarantorOption[] }>(
    "/guarantors",
    {
      params: activeOnly ? { active: 1 } : {},
    }
  )
  const list = Array.isArray(res.data) ? res.data : []
  return list.map(toGuarantorOption)
}
