import { apiClient } from "@/lib/api-client"
import type {
  ApiAssessmentLookup,
  ApiAssistantType,
  ApiGuarantor,
  ApiSignatory,
  AssessmentLookup,
  AssistantType,
  Guarantor,
  LookupOption,
  SaveAssessmentLookupInput,
  SaveAssistantTypeInput,
  SaveGuarantorInput,
  SaveSignatoryInput,
  Signatory,
} from "../types"
import {
  toApiSaveAssessmentLookupPayload,
  toApiSaveAssistantTypePayload,
  toApiSaveGuarantorPayload,
  toApiSaveSignatoryPayload,
  toAssessmentLookup,
  toAssistantType,
  toAssistantTypeLookupOption,
  toGuarantor,
  toLookupOption,
  toSignatory,
} from "./library-adapter"

/**
 * Types of Assistance API (/api/assistant-types)
 */
export async function getAssistantTypes(
  activeOnly = false
): Promise<AssistantType[]> {
  const res = await apiClient.get<{ data: ApiAssistantType[] }>(
    "/assistant-types",
    {
      params: activeOnly ? { active: 1 } : {},
    }
  )
  const list = Array.isArray(res.data) ? res.data : []
  return list.map(toAssistantType)
}

export async function createAssistantType(
  input: SaveAssistantTypeInput
): Promise<AssistantType> {
  const payload = toApiSaveAssistantTypePayload(input)
  const res = await apiClient.post<{ data: ApiAssistantType }>(
    "/assistant-types",
    payload
  )
  return toAssistantType(res.data)
}

export async function updateAssistantType(
  id: number | string,
  input: SaveAssistantTypeInput
): Promise<AssistantType> {
  const payload = toApiSaveAssistantTypePayload(input)
  const res = await apiClient.put<{ data: ApiAssistantType }>(
    `/assistant-types/${id}`,
    payload
  )
  return toAssistantType(res.data)
}

export async function deleteAssistantType(id: number | string): Promise<void> {
  await apiClient.delete(`/assistant-types/${id}`)
}

export async function getAssistantTypeOptions(
  activeOnly = true
): Promise<LookupOption[]> {
  const items = await getAssistantTypes(activeOnly)
  return items.map(toAssistantTypeLookupOption)
}

/**
 * Modes of Assistance API (/api/mode-of-assistances)
 */
export async function getModeOfAssistances(
  activeOnly = false
): Promise<AssessmentLookup[]> {
  const res = await apiClient.get<{ data: ApiAssessmentLookup[] }>(
    "/mode-of-assistances",
    {
      params: activeOnly ? { active: 1 } : {},
    }
  )
  const list = Array.isArray(res.data) ? res.data : []
  return list.map(toAssessmentLookup)
}

export async function createModeOfAssistance(
  input: SaveAssessmentLookupInput
): Promise<AssessmentLookup> {
  const payload = toApiSaveAssessmentLookupPayload(input)
  const res = await apiClient.post<{ data: ApiAssessmentLookup }>(
    "/mode-of-assistances",
    payload
  )
  return toAssessmentLookup(res.data)
}

export async function updateModeOfAssistance(
  id: number | string,
  input: SaveAssessmentLookupInput
): Promise<AssessmentLookup> {
  const payload = toApiSaveAssessmentLookupPayload(input)
  const res = await apiClient.put<{ data: ApiAssessmentLookup }>(
    `/mode-of-assistances/${id}`,
    payload
  )
  return toAssessmentLookup(res.data)
}

export async function deleteModeOfAssistance(
  id: number | string
): Promise<void> {
  await apiClient.delete(`/mode-of-assistances/${id}`)
}

export async function getModeOfAssistanceOptions(
  activeOnly = true
): Promise<LookupOption[]> {
  const items = await getModeOfAssistances(activeOnly)
  return items.map(toLookupOption)
}

/**
 * Fund Sources API (/api/fund-sources)
 */
export async function getFundSources(
  activeOnly = false
): Promise<AssessmentLookup[]> {
  const res = await apiClient.get<{ data: ApiAssessmentLookup[] }>(
    "/fund-sources",
    {
      params: activeOnly ? { active: 1 } : {},
    }
  )
  const list = Array.isArray(res.data) ? res.data : []
  return list.map(toAssessmentLookup)
}

export async function createFundSource(
  input: SaveAssessmentLookupInput
): Promise<AssessmentLookup> {
  const payload = toApiSaveAssessmentLookupPayload(input)
  const res = await apiClient.post<{ data: ApiAssessmentLookup }>(
    "/fund-sources",
    payload
  )
  return toAssessmentLookup(res.data)
}

export async function updateFundSource(
  id: number | string,
  input: SaveAssessmentLookupInput
): Promise<AssessmentLookup> {
  const payload = toApiSaveAssessmentLookupPayload(input)
  const res = await apiClient.put<{ data: ApiAssessmentLookup }>(
    `/fund-sources/${id}`,
    payload
  )
  return toAssessmentLookup(res.data)
}

export async function deleteFundSource(id: number | string): Promise<void> {
  await apiClient.delete(`/fund-sources/${id}`)
}

export async function getFundSourceOptions(
  activeOnly = true
): Promise<LookupOption[]> {
  const items = await getFundSources(activeOnly)
  return items.map(toLookupOption)
}

/**
 * Guarantors API (/api/guarantors)
 */
export async function getGuarantors(activeOnly = false): Promise<Guarantor[]> {
  const res = await apiClient.get<{ data: ApiGuarantor[] }>("/guarantors", {
    params: activeOnly ? { active: 1 } : {},
  })
  const list = Array.isArray(res.data) ? res.data : []
  return list.map(toGuarantor)
}

export async function createGuarantor(
  input: SaveGuarantorInput
): Promise<Guarantor> {
  const payload = toApiSaveGuarantorPayload(input)
  const res = await apiClient.post<{ data: ApiGuarantor }>(
    "/guarantors",
    payload
  )
  return toGuarantor(res.data)
}

export async function updateGuarantor(
  id: number | string,
  input: SaveGuarantorInput
): Promise<Guarantor> {
  const payload = toApiSaveGuarantorPayload(input)
  const res = await apiClient.put<{ data: ApiGuarantor }>(
    `/guarantors/${id}`,
    payload
  )
  return toGuarantor(res.data)
}

export async function deleteGuarantor(id: number | string): Promise<void> {
  await apiClient.delete(`/guarantors/${id}`)
}

/**
 * Signatories API (/api/signatories) — officers printed on MSWD forms.
 */
export async function getSignatories(): Promise<Signatory[]> {
  const res = await apiClient.get<{ data: ApiSignatory[] }>("/signatories")
  const list = Array.isArray(res.data) ? res.data : []
  return list.map(toSignatory)
}

export async function createSignatory(
  input: SaveSignatoryInput
): Promise<Signatory> {
  const res = await apiClient.post<{ data: ApiSignatory }>(
    "/signatories",
    toApiSaveSignatoryPayload(input)
  )
  return toSignatory(res.data)
}

export async function updateSignatory(
  id: number | string,
  input: SaveSignatoryInput
): Promise<Signatory> {
  const res = await apiClient.put<{ data: ApiSignatory }>(
    `/signatories/${id}`,
    toApiSaveSignatoryPayload(input)
  )
  return toSignatory(res.data)
}

export async function deleteSignatory(id: number | string): Promise<void> {
  await apiClient.delete(`/signatories/${id}`)
}
