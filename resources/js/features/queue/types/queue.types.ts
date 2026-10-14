export type ServiceVisitStatus =
  "waiting" | "in_progress" | "completed" | "cancelled"

export interface ServiceVisitUser {
  id: number
  name: string
}

export interface ServiceVisitPatient {
  id?: number
  name?: string
  hospital_no?: string
  hospitalNo?: string
  sex?: string
  birth_date?: string
  birthDate?: string
  age?: number
  case_number?: string
  caseNumber?: string
  sector?: string
  category?: string
  classification?: string
}

export interface ApiServiceVisit {
  id: number
  patient_id: number
  his_transaction_id: number
  status: ServiceVisitStatus
  purpose?: string | null
  remarks?: string | null
  arrived_at: string
  started_at?: string | null
  completed_at?: string | null
  cancelled_at?: string | null
  cancel_reason?: string | null
  waiting_minutes?: number | null
  processing_minutes?: number | null
  total_minutes?: number | null
  within_target?: {
    waiting: boolean | null
    processing: boolean | null
    total: boolean | null
  }
  received_by?: ServiceVisitUser | null
  served_by?: ServiceVisitUser | null
  completed_by?: ServiceVisitUser | null
  cancelled_by?: ServiceVisitUser | null
  patient?: ServiceVisitPatient | null
  created_at: string
  updated_at: string
}

export interface ServiceVisit {
  id: number
  patientId: number
  hisTransactionId: number
  status: ServiceVisitStatus
  purpose: string | null
  remarks: string | null
  arrivedAt: string
  startedAt: string | null
  completedAt: string | null
  cancelledAt: string | null
  cancelReason: string | null
  waitingMinutes: number | null
  processingMinutes: number | null
  totalMinutes: number | null
  withinTarget: {
    waiting: boolean | null
    processing: boolean | null
    total: boolean | null
  }
  receivedBy: ServiceVisitUser | null
  servedBy: ServiceVisitUser | null
  completedBy: ServiceVisitUser | null
  cancelledBy: ServiceVisitUser | null
  patient: ServiceVisitPatient | null
  createdAt: string
  updatedAt: string
}

export interface ApiQueueResponse {
  date: string
  waiting: ApiServiceVisit[]
  in_progress: ApiServiceVisit[]
  completed: ApiServiceVisit[]
  summary: {
    waiting: number
    in_progress: number
    completed: number
  }
}

export interface QueueBoardData {
  date: string
  waiting: ServiceVisit[]
  inProgress: ServiceVisit[]
  completed: ServiceVisit[]
  summary: {
    waiting: number
    inProgress: number
    completed: number
  }
}

export interface TimeInInput {
  hisTransactionId: number
  purpose?: string
  remarks?: string
}

export interface CompleteVisitInput {
  remarks?: string
}

export interface CancelVisitInput {
  cancelReason: string
}
