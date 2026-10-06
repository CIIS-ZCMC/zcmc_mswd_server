export type SocialCaseStatus = "draft" | "for_review" | "finalized"

export interface SocialCaseExpense {
  id: number
  expenseType: string
  amount: number
}

export interface SocialCase {
  id: number
  caseId: number
  socialCaseNo: string
  status: SocialCaseStatus
  revision: number
  classification: string
  totalFamilyIncome: number | null
  housingType: string | null
  utilitiesAccess: string | null
  
  // Ten narrative sections
  presentingProblem: string | null
  familyBackground: string | null
  socialFunctioning: string | null
  assessmentNotes: string | null
  interventionPlan: string | null
  environmentalFactors: string | null
  economicStatusNotes: string | null
  healthConditionNotes: string | null
  psychoSocialEvaluation: string | null
  recommendations: string | null

  // Signatures / Audit
  preparedBy: string | null
  preparedAt: string | null
  notedBy: string | null
  notedAt: string | null
  reviewRequestedAt: string | null

  // Assistance
  recommendedAssistance: string | null
  recommendedAmount: number | null

  // Expenses
  expenses: SocialCaseExpense[]
  expensesTotal: number

  // Server state / policy flags
  isEditable: boolean
  canFinalize: boolean

  // PDF / Document
  latestDocument: {
    id: number
    fileName: string
    filePath: string
  } | null
}

export interface StartSocialCasePayload {
  assessment_id?: number
}

export interface UpdateSocialCasePayload {
  classification?: string
  total_family_income?: number
  housing_type?: string
  utilities_access?: string
  presenting_problem?: string
  family_background?: string
  social_functioning?: string
  assessment_notes?: string
  intervention_plan?: string
  environmental_factors?: string
  economic_status_notes?: string
  health_condition_notes?: string
  psycho_social_evaluation?: string
  recommendations?: string
  recommended_assistance?: string
  recommended_amount?: number
  expenses?: Array<{ expense_type: string; amount: number }>
}

export interface AmendSocialCasePayload {
  reason: string
}
