/**
 * Type definitions for the Patient Guarantor module (MSWD patient guarantees).
 */

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

interface ApiLineOption {
  id: number
  name: string
  code?: string | null
}

/** A breakdown line: Type of Assistance, amount, Mode of Assistance, Fund Source. */
export interface ApiGuaranteeItem {
  id?: number
  assistance_type?: ApiLineOption | null
  amount: number | string
  mode_of_assistance?: ApiLineOption | null
  fund_source?: (ApiLineOption & { requires_specify?: boolean }) | null
  others_specify?: string | null
}

/** Lines from before the breakdown rewrite have no type or mode (null). */
export interface GuaranteeItem {
  id?: number
  assistanceTypeId: number | null
  assistanceTypeName: string | null
  amount: number
  modeOfAssistanceId: number | null
  modeOfAssistanceName: string | null
  fundSourceId: number | null
  fundSourceName: string | null
  fundRequiresSpecify: boolean
  othersSpecify: string
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
  assistant_type_id: number
  amount: number
  mode_of_assistance_id: number
  fund_source_id: number
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
  assistanceTypeId: number
  amount: number
  modeOfAssistanceId: number
  fundSourceId: number
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
