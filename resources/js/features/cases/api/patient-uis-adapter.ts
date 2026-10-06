import type { ApiPatientUisRow } from "../types/api.types"
import type {
  LegacyClassification,
  MswdClassificationCode,
} from "../types/assessment.types"
import type { PatientUisRow } from "../types/uis.types"
import { adaptAssessment } from "./assessment-adapter"

/** A slot with no matching expense line stays null (blank on the printed form), never 0. */
function slotAmount(value: number | string | null | undefined): number | null {
  return value === null || value === undefined ? null : Number(value)
}

export function adaptPatientUisRow(api: ApiPatientUisRow): PatientUisRow {
  return {
    case: {
      id: api.case.id,
      caseCode: api.case.case_code,
      status: api.case.status,
      transactionId: api.case.transaction_id,
      transactionType: api.case.transaction_type,
      dateOpened: api.case.date_opened,
    },
    uis: {
      hasAssessment: Boolean(api.uis.has_assessment),
      assessmentId: api.uis.assessment_id,
      ready: Boolean(api.uis.ready),
      missing: api.uis.missing ?? [],
      classification: api.uis.classification
        ? {
            classification:
              (api.uis.classification.classification as
                | MswdClassificationCode
                | LegacyClassification) || null,
            calculatedClassification:
              (api.uis.classification.calculated_classification as MswdClassificationCode) ||
              null,
            discountRate:
              api.uis.classification.discount_rate !== null &&
              api.uis.classification.discount_rate !== undefined
                ? Number(api.uis.classification.discount_rate)
                : null,
            netPerCapitaIncome:
              api.uis.classification.net_per_capita_income !== null &&
              api.uis.classification.net_per_capita_income !== undefined
                ? Number(api.uis.classification.net_per_capita_income)
                : null,
            hasOverride: Boolean(api.uis.classification.has_override),
          }
        : null,
      printCount: Number(api.uis.print_count || 0),
      lastPrintedAt: api.uis.last_printed_at ?? null,
      hasSocialCase: Boolean(api.uis.has_social_case),
      householdSize: Number(api.uis.household_size || 1),
      expenseSlots: api.uis.expense_slots
        ? {
            housing: slotAmount(api.uis.expense_slots.housing),
            food: slotAmount(api.uis.expense_slots.food),
            education: slotAmount(api.uis.expense_slots.education),
            transport: slotAmount(api.uis.expense_slots.transport),
            clothing: slotAmount(api.uis.expense_slots.clothing),
            medical: slotAmount(api.uis.expense_slots.medical),
            house_help: slotAmount(api.uis.expense_slots.house_help),
            insurance: slotAmount(api.uis.expense_slots.insurance),
            others: slotAmount(api.uis.expense_slots.others),
          }
        : null,
      assessment: api.uis.assessment ? adaptAssessment(api.uis.assessment) : null,
    },
  }
}
