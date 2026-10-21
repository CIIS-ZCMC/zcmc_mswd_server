import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createAssessmentExpense,
  createCaseAssessment,
  createIntakeAssessment,
  deleteAssessment,
  deleteAssessmentExpense,
  getCaseAssessments,
  getLatestAssessment,
  getMswdClassificationMatrix,
  listAssessmentExpenses,
  promoteAssessmentToSocialCase,
  reassessCase,
  refreshUisSnapshot,
  updateAssessment,
  updateAssessmentExpense,
} from "../api/assessment-api"
import type {
  CreateAssessmentExpensePayload,
  CreateAssessmentPayload,
  ReassessmentPayload,
  UpdateAssessmentExpensePayload,
  UpdateAssessmentPayload,
} from "../types/assessment.types"
import { patientUisKeys, uisPrintKeys } from "./use-uis-prints"

export const assessmentKeys = {
  matrix: ["mswd-classification-matrix"] as const,
  caseAssessments: (caseId: number) => ["cases", caseId, "assessments"] as const,
  latestAssessment: (caseId: number) => ["cases", caseId, "assessments", "latest"] as const,
  expenses: (assessmentId: number) => ["assessments", assessmentId, "expenses"] as const,
}

export function useMswdClassificationMatrix() {
  return useQuery({
    queryKey: assessmentKeys.matrix,
    queryFn: () => getMswdClassificationMatrix(),
    staleTime: 1000 * 60 * 30, // 30 minutes cache
  })
}

export function useCaseAssessments(caseId: number | null | undefined) {
  return useQuery({
    queryKey: assessmentKeys.caseAssessments(caseId ?? 0),
    queryFn: () => getCaseAssessments(caseId!),
    enabled: Boolean(caseId && caseId > 0),
  })
}

export function useLatestAssessment(caseId: number | null | undefined) {
  return useQuery({
    queryKey: assessmentKeys.latestAssessment(caseId ?? 0),
    queryFn: () => getLatestAssessment(caseId!),
    enabled: Boolean(caseId && caseId > 0),
  })
}

export function useAssessmentExpenses(assessmentId: number | null | undefined) {
  return useQuery({
    queryKey: assessmentKeys.expenses(assessmentId ?? 0),
    queryFn: () => listAssessmentExpenses(assessmentId!),
    enabled: Boolean(assessmentId && assessmentId > 0),
  })
}

export function useCreateAssessment(caseId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateAssessmentPayload) => createCaseAssessment(caseId, payload),
    onSuccess: (assessment) => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.caseAssessments(caseId) })
      queryClient.invalidateQueries({ queryKey: assessmentKeys.latestAssessment(caseId) })
      queryClient.invalidateQueries({ queryKey: uisPrintKeys.all })
      queryClient.invalidateQueries({ queryKey: patientUisKeys.all })
      queryClient.invalidateQueries({ queryKey: ["cases", caseId, "social-case"] })
      if (assessment?.id) {
        queryClient.invalidateQueries({ queryKey: assessmentKeys.expenses(assessment.id) })
      }
    },
  })
}

/**
 * Take an Intake Assessment (UIS) for a patient's HIS encounter, with no case.
 */
export function useCreateIntakeAssessment(
  patientId: number | string | null | undefined,
  hisTransactionId: number | null | undefined
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateAssessmentPayload) => {
      if (!patientId || !hisTransactionId) {
        throw new Error("Pick the hospital encounter for this intake.")
      }
      return createIntakeAssessment(patientId, hisTransactionId, payload)
    },
    onSuccess: (assessment) => {
      queryClient.invalidateQueries({ queryKey: patientUisKeys.all })
      queryClient.invalidateQueries({ queryKey: uisPrintKeys.all })
      if (assessment?.caseId) {
        queryClient.invalidateQueries({
          queryKey: assessmentKeys.caseAssessments(assessment.caseId),
        })
        queryClient.invalidateQueries({
          queryKey: assessmentKeys.latestAssessment(assessment.caseId),
        })
      }
    },
  })
}

export function useUpdateAssessment(caseId: number, assessmentId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateAssessmentPayload) => updateAssessment(assessmentId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.caseAssessments(caseId) })
      queryClient.invalidateQueries({ queryKey: assessmentKeys.latestAssessment(caseId) })
      queryClient.invalidateQueries({ queryKey: uisPrintKeys.all })
      queryClient.invalidateQueries({ queryKey: patientUisKeys.all })
      queryClient.invalidateQueries({ queryKey: ["cases", caseId, "social-case"] })
      queryClient.invalidateQueries({ queryKey: assessmentKeys.expenses(assessmentId) })
    },
  })
}

export function useCreateAssessmentExpense(caseId: number, assessmentId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateAssessmentExpensePayload) =>
      createAssessmentExpense(assessmentId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.expenses(assessmentId) })
      queryClient.invalidateQueries({ queryKey: assessmentKeys.caseAssessments(caseId) })
      queryClient.invalidateQueries({ queryKey: assessmentKeys.latestAssessment(caseId) })
      queryClient.invalidateQueries({ queryKey: uisPrintKeys.all })
      queryClient.invalidateQueries({ queryKey: patientUisKeys.all })
    },
  })
}

export function useUpdateAssessmentExpense(caseId: number, assessmentId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      expenseId,
      payload,
    }: {
      expenseId: number
      payload: UpdateAssessmentExpensePayload
    }) => updateAssessmentExpense(expenseId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.expenses(assessmentId) })
      queryClient.invalidateQueries({ queryKey: assessmentKeys.caseAssessments(caseId) })
      queryClient.invalidateQueries({ queryKey: assessmentKeys.latestAssessment(caseId) })
      queryClient.invalidateQueries({ queryKey: uisPrintKeys.all })
      queryClient.invalidateQueries({ queryKey: patientUisKeys.all })
    },
  })
}

export function useDeleteAssessmentExpense(caseId: number, assessmentId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (expenseId: number) => deleteAssessmentExpense(expenseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.expenses(assessmentId) })
      queryClient.invalidateQueries({ queryKey: assessmentKeys.caseAssessments(caseId) })
      queryClient.invalidateQueries({ queryKey: assessmentKeys.latestAssessment(caseId) })
      queryClient.invalidateQueries({ queryKey: uisPrintKeys.all })
      queryClient.invalidateQueries({ queryKey: patientUisKeys.all })
    },
  })
}

export function useReassessCase(caseId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: ReassessmentPayload) => reassessCase(caseId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.caseAssessments(caseId) })
      queryClient.invalidateQueries({ queryKey: assessmentKeys.latestAssessment(caseId) })
      queryClient.invalidateQueries({ queryKey: uisPrintKeys.all })
      queryClient.invalidateQueries({ queryKey: patientUisKeys.all })
      queryClient.invalidateQueries({ queryKey: ["cases", caseId, "social-case"] })
    },
  })
}

export function usePromoteAssessmentToSocialCase(caseId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (assessmentId: number) => promoteAssessmentToSocialCase(assessmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cases", caseId, "social-case"] })
      queryClient.invalidateQueries({ queryKey: assessmentKeys.caseAssessments(caseId) })
      queryClient.invalidateQueries({ queryKey: assessmentKeys.latestAssessment(caseId) })
      queryClient.invalidateQueries({ queryKey: uisPrintKeys.all })
      queryClient.invalidateQueries({ queryKey: patientUisKeys.all })
    },
  })
}

/**
 * Pulls the patient's current identity and family onto the sheet, replacing the copy
 * frozen at intake. The intake form collects no family or income — those are filled in
 * on the patient afterwards — so a sheet not yet issued needs a way to catch up.
 * See docs/UIS_SNAPSHOT_PLAN.md.
 */
export function useRefreshUisSnapshot(caseId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (assessmentId: number) => refreshUisSnapshot(assessmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.caseAssessments(caseId) })
      queryClient.invalidateQueries({ queryKey: assessmentKeys.latestAssessment(caseId) })
      queryClient.invalidateQueries({ queryKey: uisPrintKeys.all })
      queryClient.invalidateQueries({ queryKey: patientUisKeys.all })
    },
  })
}

export function useDeleteAssessment(caseId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (assessmentId: number) => deleteAssessment(assessmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.caseAssessments(caseId) })
      queryClient.invalidateQueries({ queryKey: assessmentKeys.latestAssessment(caseId) })
      queryClient.invalidateQueries({ queryKey: uisPrintKeys.all })
      queryClient.invalidateQueries({ queryKey: patientUisKeys.all })
      queryClient.invalidateQueries({ queryKey: ["cases", caseId, "social-case"] })
    },
  })
}
