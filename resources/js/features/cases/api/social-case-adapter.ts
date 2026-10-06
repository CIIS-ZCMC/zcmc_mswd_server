import type { ApiSocialCase } from "@/features/patients/types/api.types"
import type { SocialCase, SocialCaseExpense } from "../types"

export function toSocialCase(raw: ApiSocialCase): SocialCase {
  const expenses: SocialCaseExpense[] = (raw.expenses ?? []).map((e) => ({
    id: e.id,
    expenseType: e.expense_type,
    amount: Number(e.amount ?? 0),
  }))

  const expensesTotal = raw.expenses_total != null
    ? Number(raw.expenses_total)
    : expenses.reduce((sum, item) => sum + item.amount, 0)

  return {
    id: raw.id,
    caseId: raw.case_id,
    socialCaseNo: raw.social_case_no,
    status: raw.status ?? "draft",
    revision: raw.revision ?? 1,
    classification: raw.classification ?? "Indigent",
    totalFamilyIncome: raw.total_family_income != null ? Number(raw.total_family_income) : null,
    housingType: raw.housing_type ?? null,
    utilitiesAccess: raw.utilities_access ?? null,

    // Ten narrative sections
    presentingProblem: raw.presenting_problem ?? null,
    familyBackground: raw.family_background ?? null,
    socialFunctioning: raw.social_functioning ?? null,
    assessmentNotes: raw.assessment_notes ?? null,
    interventionPlan: raw.intervention_plan ?? null,
    environmentalFactors: raw.environmental_factors ?? null,
    economicStatusNotes: raw.economic_status_notes ?? null,
    healthConditionNotes: raw.health_condition_notes ?? null,
    psychoSocialEvaluation: raw.psycho_social_evaluation ?? null,
    recommendations: raw.recommendations ?? null,

    // Signatures / Audit
    preparedBy: raw.prepared_by_user?.name ?? (raw.prepared_by ? `User #${raw.prepared_by}` : null),
    preparedAt: raw.prepared_at ?? null,
    notedBy: raw.noted_by_user?.name ?? (raw.noted_by ? `User #${raw.noted_by}` : null),
    notedAt: raw.noted_at ?? null,
    reviewRequestedAt: raw.review_requested_at ?? null,

    // Financial Assistance
    recommendedAssistance: raw.recommended_assistance ?? null,
    recommendedAmount: raw.recommended_amount != null ? Number(raw.recommended_amount) : null,

    // Expenses
    expenses,
    expensesTotal,

    // Policy & server flags
    isEditable: Boolean(raw.is_editable),
    canFinalize: Boolean(raw.can_finalize),

    // PDF Document
    latestDocument: raw.latest_document
      ? {
        id: raw.latest_document.id,
        fileName: raw.latest_document.file_name,
        filePath: raw.latest_document.file_path,
      }
      : null,
  }
}
