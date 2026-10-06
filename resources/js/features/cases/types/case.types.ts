import type { PatientRecord } from "@/features/patients/types"
import type { SocialCase } from "./social-case.types"
import type { ApiCaseWatcher, ApiWatcherStatus } from "./api.types"

export type CaseCardColor = "white" | "green" | "orange" | "pink"

export type CaseStatus =
  | "open"
  | "assigned"
  | "closed"
  | "referred"
  | "reopened"
  | "archived"
  | string

export type CasePriority = "Low" | "Medium" | "High" | "Urgent" | string

export interface CaseUser {
  id: number
  name: string
  email?: string
}

export interface CaseRecord {
  id: number
  caseCode: string
  patientId: number
  assignedUserId: number | null
  createdBy: number | null
  caseType: string | null
  priorityLevel: CasePriority
  status: CaseStatus
  admissionType: string | null
  transactionId: number | null
  transactionType: string | null
  cardColor: CaseCardColor
  dateOpened: string | null
  dateClosed: string | null
  patient?: Partial<PatientRecord> | null
  assignedUser?: CaseUser | null
  createdByUser?: CaseUser | null
  socialCase?: SocialCase | null

  watchers?: ApiCaseWatcher[]
  watcherStatus?: ApiWatcherStatus | null
  assessmentsCount?: number
  watchersCount?: number
  createdAt: string
  updatedAt: string
}

export interface CaseListItem {
  id: number
  caseCode: string
  patientId: number
  patientName: string
  patientHospitalNo?: string | null
  patientMswdNo?: string | null
  patientCategory?: string | null
  assignedUserId: number | null
  assignedUserName?: string | null
  createdByUserName?: string | null
  caseType: string | null
  priorityLevel: CasePriority
  status: CaseStatus
  admissionType: string | null
  transactionId: number | null
  transactionType: string | null
  cardColor: CaseCardColor
  socialCaseStatus?: string | null
  dateOpened: string | null
  dateClosed: string | null
  createdAt: string
  updatedAt: string
}

export interface OpenCasePayload {
  patient_id: number
  case_type?: string
  priority_level?: CasePriority
  card_color?: CaseCardColor
  transaction_id?: number
  admission_type?: string
  transaction_type?: string
  notes?: string
}

export interface UpdateCasePayload {
  case_type?: string
  priority_level?: CasePriority
  card_color?: CaseCardColor
  admission_type?: string
  transaction_type?: string
}

export interface AssignPayload {
  assigned_user_id: number
  notes?: string
}

export interface CloseCasePayload {
  reason?: string
  notes?: string
}

export interface ReferPayload {
  referred_to: string
  reason: string
  notes?: string
}

export interface HospitalLookupItem {
  id: number
  code: string
  name: string
  description?: string
}
