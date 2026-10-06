export interface ApiCaseWatcher {
  id: number
  case_id: number
  patient_watcher_id: number | null
  name: string
  relationship: string
  contact_number: string | null
  address: string | null
  is_primary: boolean
  is_informant: boolean
  pass_number: string | null
  pass_valid_until: string | null
  pass_status: string
  present_from: string | null
  present_until: string | null
  added_by?: { id: number; name: string } | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ApiWatcherStatus {
  requirement: string
  has_primary: boolean
  satisfied: boolean
  blocking: boolean
}

export interface ApiWatcherRelationshipType {
  id: number
  name: string
  code: string
  created_at?: string
  updated_at?: string
}

/** GET /cases/{id}/uis/prints — mirrors the server's UisPrintLogResource. */
export interface ApiUisPrintLog {
  id: number
  case_id: number
  patient_id: number
  /** HIS transaction (encounter) the case was opened for. */
  transaction_id: number | null
  printed_by?: {
    id: number | null
    name: string | null
  } | null
  printed_at: string
  copies: number
  remarks: string | null
  created_at: string
}

/** Sections of the UIS the server reports as not yet filled in. */
export type ApiUisMissingSection =
  | "assessment"
  | "informant"
  | "family_composition"
  | "family_income"
  | "problem_presented"
  | "recommendation"

/**
 * GET /cases/{id}/uis — whether the case's UIS is ready to print. `missing`
 * is a hint only: the server prints regardless, except that a case with no
 * intake assessment 409s (`uis_no_assessment`) unless `blank=1`.
 */
export interface ApiUisReadiness {
  has_assessment: boolean
  assessment_id: number | null
  ready: boolean
  missing: ApiUisMissingSection[]
  classification: {
    classification: string | null
    calculated_classification: string | null
    discount_rate: string | number | null
    net_per_capita_income: string | number | null
    has_override: boolean
  } | null
  print_count: number
  last_printed_at: string | null
}

/**
 * ANNEX B section III amounts the server matched from the expense lines. A slot with no
 * matching line is null (the printed form leaves it blank), not 0.
 */
export interface ApiPatientUisExpenseSlots {
  housing: number | null
  food: number | null
  education: number | null
  transport: number | null
  clothing: number | null
  medical: number | null
  house_help: number | null
  insurance: number | null
  others: number | null
}

export interface ApiPatientUisCase {
  id: number
  case_code: string
  status: string
  transaction_id: number | null
  transaction_type: string | null
  date_opened: string
}

export interface ApiPatientUisInfo {
  has_assessment: boolean
  assessment_id: number | null
  ready: boolean
  missing: ApiUisMissingSection[]
  classification: ApiUisReadiness["classification"]
  print_count: number
  last_printed_at: string | null
  has_social_case: boolean
  household_size: number
  /** null when the case has no intake assessment. */
  expense_slots: ApiPatientUisExpenseSlots | null
  assessment: import("@/features/patients/types/api.types").ApiAssessment | null
}

export interface ApiPatientUisRow {
  case: ApiPatientUisCase
  uis: ApiPatientUisInfo
}

