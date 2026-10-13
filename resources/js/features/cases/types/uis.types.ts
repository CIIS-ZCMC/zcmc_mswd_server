import type { ApiUisMissingSection } from "./api.types"
import type {
  Assessment,
  LegacyClassification,
  MswdClassificationCode,
} from "./assessment.types"

/** A slot is null when no expense line matched it (shown blank, like the printed form). */
export interface PatientUisExpenseSlots {
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

export interface PatientUisCase {
  id: number
  caseCode: string
  status: string
  transactionId: number | null
  transactionType: string | null
  dateOpened: string
}

export interface PatientUisClassification {
  classification: MswdClassificationCode | LegacyClassification | null
  calculatedClassification: MswdClassificationCode | null
  discountRate: number | null
  netPerCapitaIncome: number | null
  hasOverride: boolean
}

export interface PatientUisInfo {
  hasAssessment: boolean
  assessmentId: number | null
  ready: boolean
  missing: ApiUisMissingSection[]
  classification: PatientUisClassification | null
  printCount: number
  lastPrintedAt: string | null
  hasSocialCase: boolean
  householdSize: number
  /** null when the case has no intake assessment. */
  expenseSlots: PatientUisExpenseSlots | null
  assessment: Assessment | null
}

/** The HIS encounter an intake (or an unassessed case) is for. */
export interface PatientUisEncounter {
  transactionId: number | null
  transactionType: string | null
  date: string | null
}

/**
 * One UIS of the patient: an Intake Assessment of an encounter, with or
 * without a case, or a case with no intake yet. See docs/INTAKE_ASSESSMENT_PLAN.md.
 */
export interface PatientUisRow {
  /** Stable row id: the assessment, else the case. */
  key: string
  encounter: PatientUisEncounter
  case: PatientUisCase | null
  /** The guarantors recorded on the encounter. */
  guarantees: { count: number; total: number }
  uis: PatientUisInfo
}
