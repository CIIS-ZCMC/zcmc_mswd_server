import { apiClient } from "@/lib/api-client"
import type {
  ApiEnvelope,
  ApiPaginated,
  ApiPatient,
} from "@/features/patients/types/api.types"
import type { ApiHospitalPatient } from "../types/api.types"

export interface HospitalPatientSearchParams {
  search?: string
  page?: number
  perPage?: number
}

/**
 * GET /hospital-patients — searches HIS patients by patid/hospital number,
 * last name or first name. Returns paginated ApiHospitalPatient records
 * with local_patient_id set for already-registered patients.
 */
export function searchHospitalPatients(
  params: HospitalPatientSearchParams = {}
) {
  return apiClient.get<ApiPaginated<ApiHospitalPatient>>("/hospital-patients", {
    params: {
      search: params.search || undefined,
      page: params.page ?? 1,
      per_page: params.perPage ?? 5,
    },
  })
}

export interface ImportHospitalPatientPayload {
  sector_id?: number | null
}

/**
 * POST /hospital-patients/{id}/import — imports or refreshes the HIS patient
 * into the local MSWD registry, keyed on hospital_id.
 */
export function importHospitalPatient(
  id: number | string,
  payload: ImportHospitalPatientPayload = {}
) {
  return apiClient
    .post<ApiEnvelope<ApiPatient>>(`/hospital-patients/${id}/import`, payload)
    .then((res) => res.data)
}
