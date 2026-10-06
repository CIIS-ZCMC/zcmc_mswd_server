/**
 * Type definitions for the Patient Guarantor module (MSWD patient guarantees).
 */

export interface ApiAssistanceSource {
  id: number
  name: string
  code?: string | null
  requires_specify?: boolean
  is_active?: boolean
  usage_count?: number
  created_at?: string
  updated_at?: string
}

export interface AssistanceSource {
  id: number
  name: string
  code: string | null
  requiresSpecify: boolean
  isActive: boolean
  usageCount: number
}

export interface ApiSaveAssistanceSourcePayload {
  name: string
  code?: string | null
  requires_specify?: boolean
  is_active?: boolean
}

export interface SaveAssistanceSourceInput {
  name: string
  code?: string | null
  requiresSpecify?: boolean
  isActive?: boolean
}

export interface ApiGuarantorOption {
  id: number
  name: string
  is_active?: boolean
}

export interface GuarantorOption {
  id: number
  name: string
  isActive?: boolean
}

export interface ApiGuaranteeItem {
  id?: number
  source?: {
    id: number
    name: string
    requires_specify?: boolean
  } | null
  others_specify?: string | null
  amount: number | string
}

export interface GuaranteeItem {
  id?: number
  sourceId: number
  sourceName: string
  requiresSpecify: boolean
  othersSpecify: string
  amount: number
}

export interface ApiPatientGuarantee {
  id: number
  patient_id: number
  his_transaction_id: number
  hospital_id: number | null
  guarantor?: {
    id: number
    name: string
  } | null
  reference_no?: string | null
  guaranteed_on?: string | null
  remarks?: string | null
  items?: ApiGuaranteeItem[]
  total?: number | string
  recorded_by?: {
    id: number
    name: string
  } | null
  created_at: string
  updated_at: string
}

export interface PatientGuarantee {
  id: number
  patientId: number
  hisTransactionId: number
  hospitalId: number | null
  guarantor: {
    id: number
    name: string
  } | null
  referenceNo: string | null
  guaranteedOn: string | null
  remarks: string | null
  items: GuaranteeItem[]
  total: number
  recordedBy: {
    id: number
    name: string
  } | null
  createdAt: string
  updatedAt: string
}

export interface ApiSaveGuaranteeItemPayload {
  assistance_source_id: number
  amount: number
  others_specify?: string | null
}

export interface ApiSaveGuaranteePayload {
  guarantor_id: number
  his_transaction_id?: number
  reference_no?: string | null
  guaranteed_on: string
  remarks?: string | null
  items: ApiSaveGuaranteeItemPayload[]
}

export interface SaveGuaranteeItemInput {
  sourceId: number
  amount: number
  othersSpecify?: string | null
}

export interface SaveGuaranteeInput {
  guarantorId: number
  hisTransactionId?: number
  referenceNo?: string | null
  guaranteedOn: string
  remarks?: string | null
  items: SaveGuaranteeItemInput[]
}

export interface ApiGuaranteesResponse {
  data: ApiPatientGuarantee[]
  grand_total?: number | string
}

export interface GuaranteesResponse {
  data: PatientGuarantee[]
  grandTotal: number
}
