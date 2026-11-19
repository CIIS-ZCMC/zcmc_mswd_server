import { apiClient } from "@/lib/api-client"
import { toPatientGuarantee } from "./guarantee-adapter"
import type { ApiPatientGuarantee, PatientGuarantee } from "../types"

/** A guarantee waiting for sign-off, as the Approvals list shows it. */
export interface PendingGuarantee {
  id: number
  patient: { id: number; name: string; hospitalId: number | null } | null
  hisTransactionId: number
  guarantor: string | null
  referenceNo: string | null
  guaranteedOn: string
  total: number
  recordedBy: string | null
  createdAt: string
}

export interface PendingApprovals {
  data: PendingGuarantee[]
  count: number
  /** The amount a guarantee needs approval from. */
  threshold: number
}

interface ApiPendingApprovals {
  data: Array<{
    id: number
    patient: { id: number; name: string; hospital_id: number | null } | null
    his_transaction_id: number
    guarantor: string | null
    reference_no: string | null
    guaranteed_on: string
    total: number | string
    recorded_by: string | null
    created_at: string
  }>
  count: number
  threshold: number | string
}

/** GET /guarantees/pending-approval (guarantee.approve) */
export async function getPendingApprovals(): Promise<PendingApprovals> {
  const res = await apiClient.get<ApiPendingApprovals>(
    "/guarantees/pending-approval"
  )

  return {
    data: (res.data ?? []).map((row) => ({
      id: row.id,
      patient: row.patient
        ? {
            id: row.patient.id,
            name: row.patient.name,
            hospitalId: row.patient.hospital_id,
          }
        : null,
      hisTransactionId: row.his_transaction_id,
      guarantor: row.guarantor,
      referenceNo: row.reference_no,
      guaranteedOn: row.guaranteed_on,
      total: Number(row.total) || 0,
      recordedBy: row.recorded_by,
      createdAt: row.created_at,
    })),
    count: Number(res.count) || 0,
    threshold: Number(res.threshold) || 0,
  }
}

/** POST /guarantees/{id}/approve (guarantee.approve) */
export async function approveGuarantee(
  id: number | string
): Promise<PatientGuarantee> {
  const res = await apiClient.post<{ data: ApiPatientGuarantee }>(
    `/guarantees/${id}/approve`
  )
  return toPatientGuarantee(res.data)
}
