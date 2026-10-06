import { apiClient } from "@/lib/api-client"
import type { ApiEnvelope } from "@/features/patients/types/api.types"
import type { ApiPatientUisRow } from "../types/api.types"
import type { PatientUisRow } from "../types/uis.types"
import { adaptPatientUisRow } from "./patient-uis-adapter"

/**
 * GET /patients/{id}/uis — fetch all cases for a patient with their UIS status and ANNEX B dataset.
 */
export async function getPatientUis(patientId: number | string): Promise<PatientUisRow[]> {
  const res = await apiClient.get<ApiEnvelope<ApiPatientUisRow[]>>(`/patients/${patientId}/uis`)
  return (res.data || []).map(adaptPatientUisRow)
}
