/**
 * Raw shapes returned by the Laravel API (snake_case, as the backend
 * Resources emit them) — kept separate from the UI-facing types in
 * `patient.types.ts` etc. `patients-adapter.ts` is the only place that
 * should read these directly.
 */

export interface ApiPaginationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number | null
  to: number | null
  path: string
}

export interface ApiPaginated<T> {
  data: T[]
  meta: ApiPaginationMeta
  links: Record<string, string | null>
}

export interface ApiEnvelope<T> {
  data: T
}

export interface ApiSector {
  id: number
  name: string
  code: string | null
  created_at?: string
  updated_at?: string
}

export interface ApiPatientId {
  id: number
  patient_id: number
  id_type: string
  id_number: string
  date_issued: string | null
  date_expiry: string | null
  is_verified: boolean
  created_at?: string
  updated_at?: string
}

export interface ApiFamilyMember {
  id: number
  patient_id: number
  name: string
  relationship: string | null
  age: number | null
  birthdate: string | null
  sex: string | null
  /** Free-text on the server (UIS §II civil-status column). */
  civil_status: string | null
  occupation: string | null
  monthly_income: string | number | null
  educational_attainment: string | null
  contact_number: string | null
  is_living_with_patient: boolean
  created_at?: string
  updated_at?: string
}

export interface ApiWatcher {
  id: number
  patient_id: number
  name: string
  relationship: string | null
  contact_number: string | null
  address: string | null
  is_primary: boolean
  created_at?: string
  updated_at?: string
}

export interface ApiCaretaker {
  id: number
  patient_id: number
  user_id: number
  role: string
  assigned_date: string
  unassigned_date: string | null
  is_active: boolean
  /**
   * Custody-hardening fields. All optional: they arrive only once the
   * server's Phase 3 ships, and `PatientResource` keeps emitting the
   * original column set until then.
   */
  user?: ApiUserLite | null
  assigned_by?: ApiUserLite | null
  reason?: string | null
  unassigned_by?: ApiUserLite | null
  unassigned_reason?: string | null
  replaced_by_id?: number | null
  created_at?: string
  updated_at?: string
}

/**
 * GET /patients/{id}/caretake — custody and its recent trail in one payload.
 *
 * The active/history split is made server-side on purpose: "who is responsible
 * now" and "who has been" are two different questions, and the client is not
 * meant to re-derive the split from `is_active`.
 *
 * No episode handler here — that is case data, and reaches the UI through
 * `assignedStaff` instead.
 */
export interface ApiCaretakeSummary {
  caretakers: {
    active: ApiCaretaker[]
    history: ApiCaretaker[]
  }
  recent_activity?: ApiActivity[]
}

export interface ApiDocument {
  id: number
  case_id: number | null
  patient_id: number | null
  intervention_id: number | null
  uploaded_by: number | null
  document_type: string
  file_name: string
  file_path: string
  file_type: string
  created_at: string
  updated_at: string
}

export interface ApiUserLite {
  id: number
  name: string
}

export interface ApiCase {
  id: number
  case_code: string
  patient_id: number
  assigned_user_id: number | null
  case_type: string | null
  priority_level: string | null
  status: string
  admission_type: string | null
  transaction_id?: number | null
  transaction_type?: string | null
  date_opened: string | null
  date_closed: string | null
  assigned_user?: ApiUserLite | null
  patient?: ApiPatient
  diagnostics_count?: number
  assessments_count?: number
  interventions_count?: number
  documents_count?: number
  activities_count?: number
  created_at: string
  updated_at: string
}

export interface ApiAssessmentExpense {
  id: number
  assessment_id: number
  expense_type: string
  amount: string | number
  created_at: string
  updated_at: string
}

export interface ApiMswdClassificationMatrix {
  id: number
  code: string
  name: string
  min_per_capita_income: string | number | null
  max_per_capita_income: string | number | null
  discount_percentage: number
  max_assistance_cap: string | number | null
  is_indigent: boolean
  description?: string | null
}

/** UIS §II "other source/s of family income" — one row per source. */
export interface ApiOtherIncomeSource {
  source: string
  amount: string | number | null
}

export interface ApiAssessment {
  id: number
  case_id: number
  created_by: number
  created_by_user?: ApiUserLite | null
  parent_assessment_id?: number | null
  reassessment_reason?: string | null
  total_family_income: string | number | null
  household_size?: number | null
  net_per_capita_income?: string | number | null
  calculated_classification?: string | null
  classification: string
  classification_override_reason?: string | null
  calculated_discount_rate?: number | null
  has_override?: boolean
  housing_type: string | null
  utilities_access: string | null
  // UIS §III/§IV checkbox vocabularies (server Assessment::HOUSE_TENURES etc.).
  house_tenure?: string | null
  light_source?: string[] | null
  water_source?: string[] | null
  presenting_problem: string | null
  problem_categories?: string[] | null
  problem_specify?: string | null
  // UIS header / §II / §V fields.
  informant_name?: string | null
  informant_first_name?: string | null
  informant_middle_name?: string | null
  informant_last_name?: string | null
  informant_relationship?: string | null
  informant_address?: string | null
  informant_contact_number?: string | null
  informant_contact?: string | null
  other_income_sources?: ApiOtherIncomeSource[] | null
  referral_source?: string | null
  medical_history?: string | null
  recommendation?: string | null
  recommendation_mode?: string | null
  fund_source?: string | null
  family_background: string | null
  social_functioning: string | null
  assessment_notes: string | null
  intervention_plan: string | null
  social_case_status?: string | null
  expenses?: ApiAssessmentExpense[]
  parent_assessment?: ApiAssessment | null
  created_at: string
  updated_at: string
}


export interface ApiSocialCaseExpense {
  id: number
  social_case_id?: number
  assessment_id?: number
  expense_type: string
  amount: string | number
  created_at?: string
  updated_at?: string
}

export interface ApiSocialCase {
  id: number
  case_id: number
  social_case_no: string
  status: "draft" | "for_review" | "finalized"
  revision: number
  classification: string
  total_family_income: string | number | null
  housing_type: string | null
  utilities_access: string | null
  presenting_problem: string | null
  family_background: string | null
  social_functioning: string | null
  assessment_notes: string | null
  intervention_plan: string | null
  environmental_factors?: string | null
  economic_status_notes?: string | null
  health_condition_notes?: string | null
  psycho_social_evaluation?: string | null
  recommendations?: string | null
  prepared_by_user?: ApiUserLite | null
  prepared_by?: number | null
  prepared_at?: string | null
  noted_by_user?: ApiUserLite | null
  noted_by?: number | null
  noted_at?: string | null
  review_requested_at?: string | null
  recommended_assistance?: string | null
  recommended_amount?: string | number | null
  expenses?: ApiSocialCaseExpense[]
  expenses_total?: string | number | null
  is_editable: boolean
  can_finalize: boolean
  latest_document?: ApiDocument | null
  created_at: string
  updated_at: string
}

/**
 * `changes` is spatie's `properties` verbatim (see `ActivityResource`):
 * `attributes` holds the new values, `old` the previous ones. `old` is
 * absent on a create and `attributes` on a delete.
 */
export interface ApiActivityChanges {
  attributes?: Record<string, unknown>
  old?: Record<string, unknown>
}

export interface ApiActivity {
  id: number
  log_name: string | null
  event: string | null
  description: string
  subject_type: string
  subject_id: number
  /** Identifying label for the subject, e.g. "Watcher: Maria Cruz". Server Phase 4. */
  subject_label?: string | null
  /** Ownership columns stamped at write time. Server Phase 2. */
  patient_id?: number | null
  case_id?: number | null
  causer?: { id: number; name: string | null } | null
  changes: ApiActivityChanges | null
  created_at: string
}

/** GET /activity-log — the paginated, server-filtered global trail (server Phase 4). */
export type ApiActivityLogPage = ApiPaginated<ApiActivity>

export interface ApiPatient {
  id: number
  sector_id: number
  hospital_id: number | null
  mswd_id: number | null
  first_name: string
  last_name: string
  middle_name: string | null
  extension_name: string | null
  birthdate: string | null
  estimated_age: number | null
  sex: string
  civil_status: string | null
  address: string | null
  barangay: string | null
  municipality: string | null
  province: string | null
  contact_number: string | null
  religion: string | null
  nationality: string | null
  place_of_birth: string | null
  permanent_address: string | null
  present_address: string | null
  educational_attainment: string | null
  occupation: string | null
  employer: string | null
  monthly_income: string | number | null
  archived_at: string | null
  cases_count?: number
  patient_ids_count?: number
  family_members_count?: number
  watchers_count?: number
  documents_count?: number
  /** Profile-only embedded relations (not returned on GET /patients list items) */
  latest_case?: ApiCase
  latest_assessment?: ApiAssessment
  sector?: ApiSector
  patient_ids?: ApiPatientId[]
  family_members?: ApiFamilyMember[]
  watchers?: ApiWatcher[]
  caretakers?: ApiCaretaker[]
  cases?: ApiCase[]
  documents?: ApiDocument[]
  created_at: string
  updated_at: string
}

export interface ApiAssistantType {
  id: number
  name: string
  code: string | null
  category: string | null
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ApiDiagnostic {
  id: number
  case_id: number
  created_by: number
  diagnosis_name: string
  diagnosis_description: string | null
  diagnosis_date: string | null
  attending_physician: string | null
  facility_name: string | null
  created_at: string
  updated_at: string
}

export interface ApiWatcherRelationshipType {
  id: number
  name: string
  code: string
  created_at: string
  updated_at: string
}

