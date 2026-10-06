import React, { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { usePermission } from "@/features/auth/hooks/use-permission"
import {
  useAmendSocialCase,
  useFinalizeSocialCase,
  useSocialCase,
  useStartSocialCase,
  useSubmitSocialCase,
  useUpdateSocialCase,
} from "@/features/cases/hooks/use-social-case"
import {
  useCaseAssessments,
  useLatestAssessment,
  usePromoteAssessmentToSocialCase,
} from "@/features/cases/hooks/use-assessment"
import { downloadSocialCasePdf } from "@/features/cases/api/social-case-api"
import { useCase } from "@/features/cases/hooks/use-cases"
import { SocialCaseContextHeader } from "@/features/cases/components/social-case-context-header"
import { SocialCaseEditor } from "@/features/cases/components/social-case-editor"
import { SocialCaseSignoff } from "@/features/cases/components/social-case-signoff"
import { AmendSocialCaseDialog } from "@/features/cases/components/dialogs/amend-social-case-dialog"
import { ReassessCaseDialog } from "@/features/cases/components/dialogs/reassess-case-dialog"
import { MswdClassificationCard } from "@/features/cases/components/mswd-classification-card"
import { AssessmentHistoryTimeline } from "@/features/cases/components/assessment-history-timeline"
import type { UpdateSocialCasePayload } from "@/features/cases/types"
import type { PatientRecord } from "../../types"
import { useNavigate } from "@/lib/inertia-router-hooks"
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  Calculator,
  CheckCircle,
  Download,
  Edit,
  ExternalLink,
  FileCheck,
  FilePlus,
  FileText,
  Loader2,
  Lock,
  RotateCcw,
  Save,
  Send,
} from "lucide-react"

interface SocialCaseTabProps {
  caseId?: number | null
  patientId?: number
  patientName?: string
  caseCode?: string
  showCaseContext?: boolean
  patient?: PatientRecord
}

export const SocialCaseTab: React.FC<SocialCaseTabProps> = ({
  caseId: propCaseId,
  patientId: propPatientId,
  caseCode: propCaseCode,
  showCaseContext = true,
  patient,
}) => {
  const navigate = useNavigate()
  const caseId = propCaseId ?? patient?.latestCaseId ?? undefined
  const patientId = propPatientId ?? (patient ? Number(patient.id) : 0)

  const canViewCases = usePermission("cases.view")
  const canCreateCase = usePermission("cases.create")
  const canUpdateCase = usePermission("cases.update")
  const canFinalizeCase = usePermission("cases.finalize_social_case")

  const { data: caseRecord } = useCase(caseId)
  const caseCode = propCaseCode ?? caseRecord?.caseCode ?? patient?.caseStudy?.caseNumber ?? (caseId ? `CASE-${caseId}` : "—")

  const { data: socialCase, isLoading, error } = useSocialCase(caseId)
  const { data: latestAssessment } = useLatestAssessment(caseId)
  const { data: assessmentsHistory = [] } = useCaseAssessments(caseId)

  const startMutation = useStartSocialCase(caseId ?? 0)
  const promoteMutation = usePromoteAssessmentToSocialCase(caseId ?? 0)
  const updateMutation = useUpdateSocialCase(caseId ?? 0)
  const submitMutation = useSubmitSocialCase(caseId ?? 0)
  const finalizeMutation = useFinalizeSocialCase(caseId ?? 0, patientId)
  const amendMutation = useAmendSocialCase(caseId ?? 0, patientId)

  const [isEditing, setIsEditing] = useState(false)
  const [formState, setFormState] = useState<UpdateSocialCasePayload>({})
  const [actionError, setActionError] = useState<string | null>(null)
  const [amendDialogOpen, setAmendDialogOpen] = useState(false)
  const [reassessDialogOpen, setReassessDialogOpen] = useState(false)
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)

  // 0. Permission Gate
  if (!canViewCases) {
    return (
      <Card className="border border-border/80 shadow-sm">
        <CardContent className="py-12 px-4 text-center space-y-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">Permission Required</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            You do not hold permission (<code className="font-mono text-primary font-bold">cases.view</code>) to access the Social Case Study Report module.
          </p>
        </CardContent>
      </Card>
    )
  }

  // 1. State 1: No Case Episode
  if (!caseId) {
    return (
      <Card className="border border-border/80 shadow-sm">
        <CardContent className="py-12 px-4 text-center space-y-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">No Active Case Episode</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            This patient has no active case episode on file. A Social Case Study Report can only be attached to an open case episode.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Loading State
  if (isLoading) {
    return (
      <Card className="border border-border/80 shadow-sm">
        <CardContent className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span>Loading Social Case Study Report...</span>
        </CardContent>
      </Card>
    )
  }

  // Error State (non-404)
  if (error) {
    return (
      <Card className="border border-destructive/30 bg-destructive/5 shadow-sm">
        <CardContent className="py-8 px-4 text-center space-y-2">
          <AlertCircle className="w-6 h-6 text-destructive mx-auto" />
          <h4 className="text-sm font-bold text-destructive">Failed to Load Social Case Study</h4>
          <p className="text-xs text-muted-foreground">{(error as Error)?.message || "An unexpected error occurred."}</p>
        </CardContent>
      </Card>
    )
  }

  const getErrorMessage = (err: unknown, fallback: string) => {
    if (typeof err === "object" && err !== null) {
      const responseMessage = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      if (responseMessage) return responseMessage
      const errorMsg = (err as Error).message
      if (errorMsg) return errorMsg
    }
    return fallback
  }

  // 2. State 2: No SCSR Yet (data === null)
  if (!socialCase) {
    const handleStart = async () => {
      setActionError(null)
      try {
        if (latestAssessment?.id) {
          await promoteMutation.mutateAsync(latestAssessment.id)
        } else {
          await startMutation.mutateAsync({})
        }
      } catch (err: unknown) {
        setActionError(getErrorMessage(err, "Failed to start Social Case Study Report."))
      }
    }

    return (
      <div className="space-y-6">
        {/* Case Context Header (shown on patient detail, suppressed on case detail) */}
        {showCaseContext && caseRecord && <SocialCaseContextHeader caseRecord={caseRecord} />}

        {/* Active MSWD Classification Card */}
        {latestAssessment && <MswdClassificationCard assessment={latestAssessment} />}

        <Card className="border border-border/80 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold">Social Safety Net Case Study Report</CardTitle>
              <Badge variant="outline" className="text-xs font-bold">Uninitiated Snapshot</Badge>
            </div>
            <CardDescription className="text-xs font-mono font-semibold">
              Case Code: {caseCode}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 py-4">
            {/* Phase 4 Promotion Banner */}
            <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-background border border-primary/20 p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary shrink-0 mt-0.5">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-foreground">
                    Elevate Assessment Snapshot to Social Case Study Report (SCSR)
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    This assessment is currently an intake snapshot. Elevate to a formal Social Case Study Report (SCSR) to initiate narrative drafting and section head sign-off.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1 flex-wrap">
                {canCreateCase ? (
                  <Button
                    onClick={handleStart}
                    disabled={startMutation.isPending || promoteMutation.isPending}
                    size="senior"
                    className="font-extrabold text-sm px-6 h-11 shadow-md hover:shadow-lg transition-all"
                  >
                    {startMutation.isPending || promoteMutation.isPending ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <FilePlus className="w-5 h-5 mr-2" />
                    )}
                    Elevate to Social Case Study Report
                  </Button>
                ) : (
                  <p className="text-xs text-amber-600 font-medium">
                    You do not hold permission (`cases.create`) to initiate a Social Case Study Report.
                  </p>
                )}

                <Button
                  variant="outline"
                  size="senior"
                  onClick={() => setReassessDialogOpen(true)}
                  className="font-bold text-sm h-11 border-2 border-primary/40 text-primary hover:bg-primary/10"
                >
                  <Calculator className="w-4 h-4 mr-2" />
                  Re-assess Patient
                </Button>
              </div>
            </div>

            {actionError && (
              <Alert variant="destructive" className="text-xs">
                <AlertCircle className="w-4 h-4" />
                <AlertTitle>Action Failed</AlertTitle>
                <AlertDescription>{actionError}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Assessment Snapshot History Timeline */}
        <AssessmentHistoryTimeline assessments={assessmentsHistory} />

        {/* Re-Assessment Modal */}
        <ReassessCaseDialog
          open={reassessDialogOpen}
          onOpenChange={setReassessDialogOpen}
          caseId={caseId}
          latestAssessment={latestAssessment}
        />
      </div>
    )
  }

  // 3. State 3: SCSR Exists
  const currentStatus = socialCase.status ?? "draft"
  const statusBadgeVariant =
    currentStatus === "finalized"
      ? "default"
      : currentStatus === "for_review"
      ? "secondary"
      : "outline"

  const handleSaveDraft = async () => {
    setActionError(null)
    try {
      await updateMutation.mutateAsync(formState)
      setIsEditing(false)
      setFormState({})
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, "Failed to save SCSR draft changes."))
    }
  }

  const handleSubmitReview = async () => {
    setActionError(null)
    try {
      if (Object.keys(formState).length > 0) {
        await updateMutation.mutateAsync(formState)
      }
      await submitMutation.mutateAsync()
      setIsEditing(false)
      setFormState({})
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, "Failed to submit SCSR for review."))
    }
  }

  const handleFinalize = async () => {
    setActionError(null)
    try {
      if (Object.keys(formState).length > 0) {
        await updateMutation.mutateAsync(formState)
      }
      await finalizeMutation.mutateAsync()
      setIsEditing(false)
      setFormState({})
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, "Failed to finalize Social Case Study Report."))
    }
  }

  const handleAmendConfirm = async (reason: string) => {
    setActionError(null)
    try {
      await amendMutation.mutateAsync(reason)
      setIsEditing(true)
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, "Failed to amend Social Case Study Report."))
    }
  }

  const handleDownloadPdf = async () => {
    setActionError(null)
    setIsDownloadingPdf(true)
    try {
      const fileName = socialCase.latestDocument?.fileName || `${socialCase.socialCaseNo}.pdf`
      await downloadSocialCasePdf(socialCase.caseId, fileName)
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, "Failed to download SCSR PDF."))
    } finally {
      setIsDownloadingPdf(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Case Context Header (shown on patient detail, suppressed on case detail) */}
      {showCaseContext && caseRecord && <SocialCaseContextHeader caseRecord={caseRecord} />}

      {/* Active MSWD Classification Card */}
      {latestAssessment && <MswdClassificationCard assessment={latestAssessment} />}

      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/60 bg-card">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-lg font-extrabold text-foreground">
                  Social Safety Net Case Study Report
                </CardTitle>
                <Badge variant={statusBadgeVariant} className="font-bold text-xs uppercase tracking-wider px-2.5 py-1">
                  {currentStatus === "finalized" && <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-400" />}
                  {currentStatus.replace("_", " ")}
                </Badge>

                {socialCase.revision > 1 && (
                  <Badge variant="outline" className="text-xs border-amber-400 text-amber-700 dark:text-amber-300 font-bold px-2 py-0.5">
                    Revision {socialCase.revision}
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs font-mono font-bold text-muted-foreground">
                SCSR Control No: <span className="text-primary font-extrabold text-sm">{socialCase.socialCaseNo}</span> · Case Code: {caseCode}
              </CardDescription>
            </div>

            {/* Action Bar — Senior Friendly Touch Targets */}
            <div className="flex items-center gap-3 flex-wrap">
              {caseId && (
                <Button
                  variant="outline"
                  size="senior"
                  onClick={() => navigate(`/cases/${caseId}`)}
                  className="border-2 border-primary/40 text-foreground font-bold text-xs sm:text-sm h-11 px-4 hover:bg-primary/10 transition-all gap-1.5"
                >
                  <ExternalLink className="w-4 h-4 text-primary" />
                  View Case Episode
                </Button>
              )}

              {/* Re-assess Patient Button */}
              <Button
                variant="outline"
                size="senior"
                onClick={() => setReassessDialogOpen(true)}
                className="border-2 border-primary/40 text-primary font-extrabold text-sm h-11 px-4 hover:bg-primary/10 transition-all"
              >
                <Calculator className="w-5 h-5 mr-2" />
                Re-assess Patient
              </Button>

              {/* Download PDF button */}
              {(socialCase.latestDocument || socialCase.status !== "draft") && (
                <Button
                  variant="outline"
                  size="senior"
                  onClick={handleDownloadPdf}
                  disabled={isDownloadingPdf}
                  className="border-2 border-primary/40 text-foreground font-bold text-sm h-11 px-4 hover:bg-primary/10 transition-all"
                >
                  {isDownloadingPdf ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin text-primary" />
                  ) : (
                    <Download className="w-5 h-5 mr-2 text-primary" />
                  )}
                  Download PDF
                </Button>
              )}

              {/* Edit / Save Toggle */}
              {socialCase.isEditable && canUpdateCase && (
                <>
                  {!isEditing ? (
                    <Button
                      variant="outline"
                      size="senior"
                      onClick={() => {
                        setIsEditing(true)
                        setActionError(null)
                      }}
                      className="border-2 border-primary text-primary font-extrabold text-sm h-11 px-4 hover:bg-primary/15 transition-all"
                    >
                      <Edit className="w-5 h-5 mr-2" />
                      Edit Report
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="senior"
                      onClick={handleSaveDraft}
                      disabled={updateMutation.isPending}
                      className="border-2 border-slate-400 dark:border-slate-600 font-extrabold text-sm h-11 px-5 shadow-sm hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
                    >
                      {updateMutation.isPending ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-5 h-5 mr-2 text-foreground" />
                      )}
                      Save Draft
                    </Button>
                  )}
                </>
              )}

              {/* Submit for Review Button (Draft state, Case Manager role) */}
              {socialCase.status === "draft" && canUpdateCase && (
                <Button
                  variant="default"
                  size="senior"
                  onClick={handleSubmitReview}
                  disabled={submitMutation.isPending || updateMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm h-11 px-5 shadow-md hover:shadow-lg transition-all"
                >
                  {submitMutation.isPending ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5 mr-2" />
                  )}
                  Submit for Review
                </Button>
              )}

              {/* Finalize Button (Gated strictly on cases.finalize_social_case authority) */}
              {canFinalizeCase && socialCase.status !== "finalized" && (
                <Button
                  variant="default"
                  size="senior"
                  onClick={handleFinalize}
                  disabled={finalizeMutation.isPending || (socialCase.canFinalize === false && !isEditing)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm h-11 px-6 shadow-md hover:shadow-lg transition-all"
                >
                  {finalizeMutation.isPending ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <FileCheck className="w-5 h-5 mr-2" />
                  )}
                  Finalize & Sign
                </Button>
              )}

              {/* Amend Button (Finalized state, Section Head authority) */}
              {socialCase.status === "finalized" && canFinalizeCase && (
                <Button
                  variant="outline"
                  size="senior"
                  onClick={() => {
                    setAmendDialogOpen(true)
                    setActionError(null)
                  }}
                  className="border-2 border-amber-500 text-amber-800 dark:text-amber-300 font-extrabold text-sm h-11 px-5 hover:bg-amber-500/15 shadow-sm transition-all"
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Amend Report
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-5">
          {/* Action Error Alert */}
          {actionError && (
            <Alert variant="destructive" className="text-xs border border-destructive/50">
              <AlertTriangle className="w-4 h-4" />
              <AlertTitle className="font-bold">
                {actionError.toLowerCase().includes("watcher") ? "Watcher Requirement Missing" : "SCSR Action Failed"}
              </AlertTitle>
              <AlertDescription className="mt-1 leading-relaxed">
                {actionError}
                {actionError.toLowerCase().includes("watcher") && (
                  <p className="mt-2 font-medium text-destructive-foreground/90">
                    💡 Tip: Case sign-off requires an active Case Watcher. Please switch to the <strong>Watchers</strong> tab to register or verify the patient watcher details before retrying.
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Section Head Authority Notice for Case Managers */}
          {!canFinalizeCase && socialCase.status === "for_review" && (
            <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3.5 flex items-center justify-between text-xs text-blue-900 dark:text-blue-200">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
                <span>
                  This report is submitted for review. Final sign-off requires Section Head authority (`cases.finalize_social_case`).
                </span>
              </div>
            </div>
          )}

          {/* Main Editor / Viewer Component */}
          <SocialCaseEditor
            socialCase={socialCase}
            isEditing={isEditing}
            formState={formState}
            onChangeState={setFormState}
          />

          {/* Signature Blocks */}
          <SocialCaseSignoff socialCase={socialCase} />

          {/* Amend Dialog */}
          <AmendSocialCaseDialog
            open={amendDialogOpen}
            onOpenChange={setAmendDialogOpen}
            onConfirm={handleAmendConfirm}
            isSubmitting={amendMutation.isPending}
          />
        </CardContent>
      </Card>

      {/* Assessment History Timeline */}
      <AssessmentHistoryTimeline assessments={assessmentsHistory} />

      {/* Re-Assessment Modal */}
      <ReassessCaseDialog
        open={reassessDialogOpen}
        onOpenChange={setReassessDialogOpen}
        caseId={caseId}
        latestAssessment={latestAssessment}
      />
    </div>
  )
}

