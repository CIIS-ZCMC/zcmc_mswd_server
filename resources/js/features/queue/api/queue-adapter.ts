import type {
  ApiServiceVisit,
  ApiQueueResponse,
  QueueBoardData,
  ServiceVisit,
} from "../types"

export function toServiceVisit(raw: ApiServiceVisit): ServiceVisit {
  return {
    id: raw.id,
    patientId: raw.patient_id,
    hisTransactionId: raw.his_transaction_id,
    status: raw.status,
    purpose: raw.purpose ?? null,
    remarks: raw.remarks ?? null,
    arrivedAt: raw.arrived_at,
    startedAt: raw.started_at ?? null,
    completedAt: raw.completed_at ?? null,
    cancelledAt: raw.cancelled_at ?? null,
    cancelReason: raw.cancel_reason ?? null,
    waitingMinutes: raw.waiting_minutes ?? null,
    processingMinutes: raw.processing_minutes ?? null,
    totalMinutes: raw.total_minutes ?? null,
    withinTarget: {
      waiting: raw.within_target?.waiting ?? null,
      processing: raw.within_target?.processing ?? null,
      total: raw.within_target?.total ?? null,
    },
    receivedBy: raw.received_by ?? null,
    servedBy: raw.served_by ?? null,
    completedBy: raw.completed_by ?? null,
    cancelledBy: raw.cancelled_by ?? null,
    patient: raw.patient ?? null,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

export function toQueueBoardData(raw: ApiQueueResponse): QueueBoardData {
  return {
    date: raw.date,
    waiting: (raw.waiting || []).map(toServiceVisit),
    inProgress: (raw.in_progress || []).map(toServiceVisit),
    completed: (raw.completed || []).map(toServiceVisit),
    summary: {
      waiting: raw.summary?.waiting ?? 0,
      inProgress: raw.summary?.in_progress ?? 0,
      completed: raw.summary?.completed ?? 0,
    },
  }
}
