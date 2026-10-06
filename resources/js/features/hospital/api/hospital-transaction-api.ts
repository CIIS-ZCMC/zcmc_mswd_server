import { apiClient, ApiError } from "@/lib/api-client"
import type { ApiEnvelope } from "@/features/patients/types/api.types"
import type {
  ApiAssignableCase,
  ApiCaseHospitalTransaction,
  ApiPatientTransaction,
} from "../types/api.types"

/**
 * GET /patient-transactions/find?hospital_number=… — a patient's HIS encounters.
 * The server 404s when nothing matches (a patient with no HIS visits is
 * ordinary), which is normalized to an empty list. Scalar fields only; the
 * lookups and guarantors load per-encounter via getEncounter().
 */
export function getPatientEncounters(
  hospitalNumber: string | number,
  filters?: { name?: string; date?: string },
): Promise<ApiPatientTransaction[]> {
  return apiClient
    .get<ApiEnvelope<ApiPatientTransaction[]>>("/patient-transactions/find", {
      params: {
        hospital_number: hospitalNumber,
        name: filters?.name,
        date: filters?.date,
      },
    })
    .then((res) => res.data)
    .catch((err: unknown) => {
      if (err instanceof ApiError && err.status === 404) return []
      throw err
    })
}

/** GET /patient-transactions/{id} — one encounter with lookups + guarantors. */
export function getEncounter(id: number): Promise<ApiPatientTransaction> {
  return apiClient
    .get<ApiEnvelope<ApiPatientTransaction>>(`/patient-transactions/${id}`)
    .then((res) => res.data)
}

/** GET /patient-transactions/{id}/cases — the patient's open cases to assess into. */
export function getAssignableCases(id: number): Promise<ApiAssignableCase[]> {
  return apiClient
    .get<ApiEnvelope<ApiAssignableCase[]>>(`/patient-transactions/${id}/cases`)
    .then((res) => res.data)
}

/** POST /patient-transactions/{id}/assess — attach the encounter to a case. */
export function assessEncounter(
  id: number,
  caseId: number,
): Promise<ApiCaseHospitalTransaction> {
  return apiClient
    .post<ApiEnvelope<ApiCaseHospitalTransaction>>(`/patient-transactions/${id}/assess`, {
      case_id: caseId,
    })
    .then((res) => res.data)
}
