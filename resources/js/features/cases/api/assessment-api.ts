import { apiClient } from "@/lib/api-client"
import type {
  ApiEnvelope,
  ApiAssessment,
  ApiAssessmentExpense,
  ApiMswdClassificationMatrix,
  ApiSocialCase,
} from "@/features/patients/types/api.types"
import type {
  Assessment,
  AssessmentExpense,
  CreateAssessmentPayload,
  CreateAssessmentExpensePayload,
  MswdClassificationMatrix,
  ReassessmentPayload,
  UpdateAssessmentPayload,
  UpdateAssessmentExpensePayload,
} from "../types/assessment.types"
import { adaptAssessment, adaptMswdClassificationMatrix } from "./assessment-adapter"

function adaptExpense(api: ApiAssessmentExpense): AssessmentExpense {
  return {
    id: api.id,
    assessmentId: api.assessment_id,
    expenseType: api.expense_type,
    amount: Number(api.amount || 0),
  }
}

/** GET /mswd-classification-matrix — fetches list of classification tiers */
export async function getMswdClassificationMatrix(): Promise<MswdClassificationMatrix[]> {
  const res = await apiClient.get<ApiEnvelope<ApiMswdClassificationMatrix[]> | ApiMswdClassificationMatrix[]>(
    "/mswd-classification-matrix"
  )
  const rawData = Array.isArray(res) ? res : (res as ApiEnvelope<ApiMswdClassificationMatrix[]>).data || []
  return rawData.map(adaptMswdClassificationMatrix)
}

/** GET /cases/{case}/assessments — fetches historical assessments list for a case episode */
export async function getCaseAssessments(caseId: number): Promise<Assessment[]> {
  const res = await apiClient.get<ApiEnvelope<ApiAssessment[]> | ApiAssessment[]>(
    `/cases/${caseId}/assessments`
  )
  const rawData = Array.isArray(res) ? res : (res as ApiEnvelope<ApiAssessment[]>).data || []
  return rawData.map(adaptAssessment)
}

/**
 * The latest assessment for a case episode, or null when it has none.
 */
export async function getLatestAssessment(caseId: number): Promise<Assessment | null> {
  const assessments = await getCaseAssessments(caseId)
  return assessments[0] ?? null
}

/** POST /cases/{case}/assessments — creates a new intake assessment for a case */
export async function createCaseAssessment(
  caseId: number,
  payload: CreateAssessmentPayload
): Promise<Assessment> {
  const res = await apiClient.post<ApiEnvelope<ApiAssessment>>(`/cases/${caseId}/assessments`, payload)
  return adaptAssessment(res.data)
}

/** PUT /assessments/{assessment} — updates an existing assessment */
export async function updateAssessment(
  assessmentId: number,
  payload: UpdateAssessmentPayload
): Promise<Assessment> {
  const res = await apiClient.put<ApiEnvelope<ApiAssessment>>(`/assessments/${assessmentId}`, payload)
  return adaptAssessment(res.data)
}

/** GET /assessments/{assessment}/expenses — lists expenses for an assessment */
export async function listAssessmentExpenses(assessmentId: number): Promise<AssessmentExpense[]> {
  const res = await apiClient.get<ApiEnvelope<ApiAssessmentExpense[]> | ApiAssessmentExpense[]>(
    `/assessments/${assessmentId}/expenses`
  )
  const rawData = Array.isArray(res) ? res : (res as ApiEnvelope<ApiAssessmentExpense[]>).data || []
  return rawData.map(adaptExpense)
}

/** POST /assessments/{assessment}/expenses — creates a new expense item */
export async function createAssessmentExpense(
  assessmentId: number,
  payload: CreateAssessmentExpensePayload
): Promise<AssessmentExpense> {
  const res = await apiClient.post<ApiEnvelope<ApiAssessmentExpense>>(
    `/assessments/${assessmentId}/expenses`,
    payload
  )
  return adaptExpense(res.data)
}

/** PUT /assessment-expenses/{expense} — updates an existing expense item */
export async function updateAssessmentExpense(
  expenseId: number,
  payload: UpdateAssessmentExpensePayload
): Promise<AssessmentExpense> {
  const res = await apiClient.put<ApiEnvelope<ApiAssessmentExpense>>(
    `/assessment-expenses/${expenseId}`,
    payload
  )
  return adaptExpense(res.data)
}

/** DELETE /assessment-expenses/{expense} — deletes an expense item */
export async function deleteAssessmentExpense(expenseId: number): Promise<void> {
  await apiClient.delete<void>(`/assessment-expenses/${expenseId}`)
}

/** POST /cases/{case}/reassess — creates a new linked re-assessment snapshot */
export async function reassessCase(caseId: number, payload: ReassessmentPayload): Promise<Assessment> {
  const res = await apiClient.post<ApiEnvelope<ApiAssessment>>(`/cases/${caseId}/reassess`, payload)
  return adaptAssessment(res.data)
}

/** POST /assessments/{assessment}/promote-to-social-case — elevates assessment snapshot to draft SCSR */
export async function promoteAssessmentToSocialCase(assessmentId: number): Promise<ApiSocialCase> {
  const res = await apiClient.post<ApiEnvelope<ApiSocialCase>>(
    `/assessments/${assessmentId}/promote-to-social-case`
  )
  return res.data
}

/** DELETE /assessments/{assessment} — soft-deletes an assessment (a finalized SCSR is refused with 422) */
export async function deleteAssessment(assessmentId: number): Promise<void> {
  await apiClient.delete<void>(`/assessments/${assessmentId}`)
}
