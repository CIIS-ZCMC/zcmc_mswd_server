import { apiClient } from "@/lib/api-client"
import type {
  ApiQueueResponse,
  ApiServiceVisit,
  CancelVisitInput,
  CompleteVisitInput,
  QueueBoardData,
  ServiceVisit,
  TimeInInput,
} from "../types"
import { toQueueBoardData, toServiceVisit } from "./queue-adapter"

export async function getQueue(date?: string): Promise<QueueBoardData> {
  const res = await apiClient.get<ApiQueueResponse>("/service-visits/queue", {
    params: date ? { date } : {},
  })
  return toQueueBoardData(res)
}

export async function getPatientVisits(
  patientId: number | string,
  transactionId?: number
): Promise<ServiceVisit[]> {
  const res = await apiClient.get<{ data: ApiServiceVisit[] }>(
    `/patients/${patientId}/service-visits`,
    {
      params: transactionId ? { his_transaction_id: transactionId } : {},
    }
  )
  const list = Array.isArray(res.data) ? res.data : []
  return list.map(toServiceVisit)
}

export async function timeInVisit(
  patientId: number | string,
  input: TimeInInput
): Promise<ServiceVisit> {
  const res = await apiClient.post<{ data: ApiServiceVisit }>(
    `/patients/${patientId}/service-visits`,
    {
      his_transaction_id: input.hisTransactionId,
      purpose: input.purpose || undefined,
      remarks: input.remarks || undefined,
    }
  )
  return toServiceVisit(res.data)
}

export async function startVisit(visitId: number): Promise<ServiceVisit> {
  const res = await apiClient.post<{ data: ApiServiceVisit }>(
    `/service-visits/${visitId}/start`
  )
  return toServiceVisit(res.data)
}

export async function completeVisit(
  visitId: number,
  input?: CompleteVisitInput
): Promise<ServiceVisit> {
  const res = await apiClient.post<{ data: ApiServiceVisit }>(
    `/service-visits/${visitId}/complete`,
    {
      remarks: input?.remarks || undefined,
    }
  )
  return toServiceVisit(res.data)
}

export async function cancelVisit(
  visitId: number,
  input: CancelVisitInput
): Promise<ServiceVisit> {
  const res = await apiClient.post<{ data: ApiServiceVisit }>(
    `/service-visits/${visitId}/cancel`,
    {
      cancel_reason: input.cancelReason,
    }
  )
  return toServiceVisit(res.data)
}
