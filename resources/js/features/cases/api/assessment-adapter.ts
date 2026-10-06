import type { ApiAssessment, ApiMswdClassificationMatrix } from "@/features/patients/types/api.types"
import type {
  Assessment,
  LegacyClassification,
  MswdClassificationCode,
  MswdClassificationMatrix,
} from "../types/assessment.types"

export function adaptMswdClassificationMatrix(
  api: ApiMswdClassificationMatrix
): MswdClassificationMatrix {
  return {
    id: api.id,
    code: api.code as MswdClassificationCode,
    name: api.name,
    minPerCapitaIncome: api.min_per_capita_income !== null ? Number(api.min_per_capita_income) : null,
    maxPerCapitaIncome: api.max_per_capita_income !== null ? Number(api.max_per_capita_income) : null,
    discountPercentage: Number(api.discount_percentage || 0),
    maxAssistanceCap: api.max_assistance_cap !== null ? Number(api.max_assistance_cap) : null,
    isIndigent: Boolean(api.is_indigent),
    description: api.description ?? null,
  }
}

export function adaptAssessment(api: ApiAssessment): Assessment {
  const expenses = (api.expenses || []).map((e) => ({
    id: e.id,
    assessmentId: e.assessment_id,
    expenseType: e.expense_type,
    amount: Number(e.amount || 0),
  }))

  const expensesTotal = expenses.reduce((sum, e) => sum + e.amount, 0)

  return {
    id: api.id,
    caseId: api.case_id,
    createdBy: api.created_by,
    createdByName: api.created_by_user?.name || null,
    parentAssessmentId: api.parent_assessment_id ?? null,
    reassessmentReason: api.reassessment_reason ?? null,
    totalFamilyIncome: api.total_family_income !== null ? Number(api.total_family_income) : null,
    expensesTotal,
    expenses,
    householdSize: api.household_size ?? 1,
    netPerCapitaIncome: api.net_per_capita_income !== null && api.net_per_capita_income !== undefined
      ? Number(api.net_per_capita_income)
      : null,
    calculatedClassification: (api.calculated_classification as MswdClassificationCode) || null,
    // Never default to a bracket: an empty value is "not on file", not class D.
    classification: (api.classification as MswdClassificationCode | LegacyClassification) || null,
    classificationOverrideReason: api.classification_override_reason ?? null,
    calculatedDiscountRate: api.calculated_discount_rate !== undefined && api.calculated_discount_rate !== null
      ? Number(api.calculated_discount_rate)
      : null,
    hasOverride: Boolean(api.has_override),
    housingType: api.housing_type ?? null,
    utilitiesAccess: api.utilities_access ?? null,
    houseTenure: api.house_tenure ?? null,
    lightSource: api.light_source ?? [],
    waterSource: api.water_source ?? [],
    presentingProblem: api.presenting_problem ?? null,
    problemCategories: api.problem_categories ?? [],
    problemSpecify: api.problem_specify ?? null,
    informantName: api.informant_name ?? null,
    informantFirstName: api.informant_first_name ?? null,
    informantMiddleName: api.informant_middle_name ?? null,
    informantLastName: api.informant_last_name ?? null,
    informantRelationship: api.informant_relationship ?? null,
    informantAddress: api.informant_address ?? null,
    informantContact: api.informant_contact_number ?? api.informant_contact ?? null,
    otherIncomeSources: (api.other_income_sources ?? []).map((i) => ({
      source: i.source,
      amount: i.amount !== null && i.amount !== undefined ? Number(i.amount) : null,
    })),
    referralSource: api.referral_source ?? null,
    medicalHistory: api.medical_history ?? null,
    recommendation: api.recommendation ?? null,
    recommendationMode: api.recommendation_mode ?? null,
    fundSource: api.fund_source ?? null,
    familyBackground: api.family_background ?? null,
    socialFunctioning: api.social_functioning ?? null,
    assessmentNotes: api.assessment_notes ?? null,
    interventionPlan: api.intervention_plan ?? null,
    socialCaseStatus: api.social_case_status ?? null,
    parentAssessment: api.parent_assessment ? adaptAssessment(api.parent_assessment) : null,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  }
}
