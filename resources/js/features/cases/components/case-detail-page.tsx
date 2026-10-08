import React, { useState } from "react"
import { useParams, useNavigate, useSearchParams } from "@/lib/inertia-router-hooks"
import { useCase, useCaseActivities } from "../hooks/use-cases"
import { useCaseMutations } from "../hooks/use-case-mutations"
import { useCaseAssessments } from "../hooks/use-assessment"
import { downloadCaseSummaryPdf } from "../api/cases-api"
import { CARD_COLORS, getCardColorConfig } from "../lib/case-card-color"
import type { CaseCardColor } from "../types/case.types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  CreditCard,
  Download,
  Eye,
  FileEdit,
  FileSpreadsheet,
  FileText,
  History,
  Printer,
  RotateCcw,
  Stethoscope,
  Trash2,
  User,
  UserCheck,
} from "lucide-react"
import { AssignCaseDialog } from "./dialogs/assign-case-dialog"
import { CloseCaseDialog } from "./dialogs/close-case-dialog"
import { ReferCaseDialog } from "./dialogs/refer-case-dialog"
import { PrintUisDialog } from "./dialogs/print-uis-dialog"
import { IntakeAssessmentDialog } from "./dialogs/intake-assessment-dialog"
import { ReassessCaseDialog } from "./dialogs/reassess-case-dialog"
import { SocialCaseTab } from "@/features/patients/components/tabs/social-case-tab"
import { WatchersTab } from "@/features/patients/components/tabs/watchers-tab"
import { CaseGuarantorsTab } from "./case-guarantors-tab"
import { EncounterUisPanel } from "./encounter-uis-panel"
import { formatTransactionType } from "@/features/hospital/lib/transaction-type"
import { ProgressNotesTab } from "./progress-notes-tab"
import { AssessmentHistoryTimeline } from "./assessment-history-timeline"
import { usePermission } from "@/features/auth/hooks/use-permission"
import { cn } from "@/lib/utils"

export const CaseDetailPage: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const activeTab = searchParams.get("tab") || "social-case"
  const handleTabChange = (tab: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set("tab", tab)
        return next
      },
      { replace: true }
    )
  }

  const canUpdate = usePermission("cases.update")
  const canDelete = usePermission("cases.delete")
  const canViewIntake = usePermission("intake.view")

  const { data: caseRecord, isLoading, error } = useCase(caseId)
  const { data: activities = [] } = useCaseActivities(caseId)
  const { data: assessments = [] } = useCaseAssessments(Number(caseId))
  const { updateCase, reopenCase, archiveCase } = useCaseMutations(caseId)

  const [isAssignOpen, setIsAssignOpen] = useState(false)
  const [isCloseOpen, setIsCloseOpen] = useState(false)
  const [isReferOpen, setIsReferOpen] = useState(false)
  const [isPrintUisOpen, setIsPrintUisOpen] = useState(false)
  const [isIntakeAssessmentOpen, setIsIntakeAssessmentOpen] = useState(false)
  const [isReassessOpen, setIsReassessOpen] = useState(false)
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)

  const handleDownloadSummaryPdf = async () => {
    if (!caseId) return
    try {
      setIsDownloadingPdf(true)
      const blob = await downloadCaseSummaryPdf(caseId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `case-summary-${caseRecord?.caseCode || caseId}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      console.error("Failed to download case summary PDF", err)
    } finally {
      setIsDownloadingPdf(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    )
  }

  if (error || !caseRecord) {
    return (
      <div className="p-6">
        <Alert variant="destructive" className="border-2 p-5">
          <AlertCircle className="size-5" />
          <AlertTitle className="text-base font-bold">Case Not Found</AlertTitle>
          <AlertDescription className="text-sm font-medium mt-1">
            The requested social case episode does not exist or you do not have permission to view it.
          </AlertDescription>
        </Alert>
        <Button variant="outline" className="mt-4 gap-2 font-bold" onClick={() => navigate("/caseload")}>
          <ArrowLeft className="size-4" /> Back to Caseload
        </Button>
      </div>
    )
  }

  const cardColorConfig = getCardColorConfig(caseRecord.cardColor)
  const isClosedOrReferred = caseRecord.status === "closed" || caseRecord.status === "referred"

  const handleCardColorChange = async (color: CaseCardColor) => {
    if (!caseId) return
    await updateCase({
      id: caseId,
      payload: { card_color: color },
    })
  }

  const handleReopen = async () => {
    if (window.confirm("Are you sure you want to reopen this case episode?")) {
      await reopenCase({ id: caseId })
    }
  }

  const handleArchive = async () => {
    if (window.confirm("Are you sure you want to delete/archive this case episode?")) {
      await archiveCase(caseId)
      navigate("/caseload")
    }
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-background text-foreground transition-colors duration-200">
      {/* Top Breadcrumb & Nav */}
      <div className="border-b border-border/80 bg-muted/20 px-6 py-2.5 flex items-center justify-between">
        <button
          onClick={() => navigate("/caseload")}
          className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary transition-colors cursor-pointer"
        >
          <ArrowLeft className="size-3.5" /> Back to Caseload
        </button>

        {caseRecord.patientId && (
          <button
            onClick={() => navigate(`/patients/${caseRecord.patientId}`)}
            className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline cursor-pointer"
          >
            <User className="size-3.5" /> Open Patient File
          </button>
        )}
      </div>

      {/* Case Header Banner */}
      <div className={cn("border-b-2 border-border bg-card p-6 shadow-2xs border-l-8", cardColorConfig.borderClass)}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight font-mono">
                {caseRecord.caseCode}
              </h1>

              <Badge
                variant="outline"
                className={cn(
                  "text-xs font-bold px-2.5 py-1 border-2",
                  caseRecord.status === "closed"
                    ? "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30"
                    : caseRecord.status === "referred"
                      ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
                      : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                )}
              >
                {caseRecord.status.toUpperCase()}
              </Badge>

              <Badge variant="outline" className="text-xs font-bold px-2.5 py-1 border">
                {caseRecord.priorityLevel} Priority
              </Badge>

              {/* Interactive Card Color Selector */}
              {canUpdate ? (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className={cn(
                      "inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border cursor-pointer transition-all hover:opacity-80",
                      cardColorConfig.badgeClass
                    )}
                  >
                    <span className={cn("size-2 rounded-full", cardColorConfig.dotClass)} />
                    {cardColorConfig.label}
                    <ChevronDown className="size-3 opacity-60" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="text-xs font-bold">Change Card Color</DropdownMenuLabel>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    {Object.values(CARD_COLORS).map((cfg) => (
                      <DropdownMenuItem
                        key={cfg.color}
                        onClick={() => handleCardColorChange(cfg.color)}
                        className="text-xs font-medium gap-2 cursor-pointer"
                      >
                        <span className={cn("size-2.5 rounded-full", cfg.dotClass)} />
                        {cfg.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Badge variant="outline" className={cn("text-xs font-bold border", cardColorConfig.badgeClass)}>
                  <span className={cn("size-2 rounded-full mr-1.5", cardColorConfig.dotClass)} />
                  {cardColorConfig.label}
                </Badge>
              )}
            </div>

            {/* Patient & Service Meta */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs sm:text-sm text-muted-foreground font-medium">
              <span className="text-foreground font-bold flex items-center gap-1.5">
                <User className="size-4 text-primary" />
                {caseRecord.patient?.fullName ?? `Patient #${caseRecord.patientId}`}
              </span>
              <span>•</span>
              <span className="font-mono">
                Hosp: <strong className="text-foreground">{caseRecord.patient?.hospitalNo ?? "—"}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 font-semibold text-foreground">
                <Stethoscope className="size-4 text-primary" />
                Case Type: <strong className="text-foreground font-bold">{caseRecord.caseType ?? "—"}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 font-semibold text-foreground">
                <Building2 className="size-4 text-primary" />
                Admission Type: <strong className="text-foreground font-bold">{caseRecord.admissionType ?? "—"}</strong>
              </span>
              {caseRecord.transactionId && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1.5 font-mono text-muted-foreground">
                    HIS Encounter #{caseRecord.transactionId}
                    <span className="bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full font-sans text-xs font-semibold">
                      {formatTransactionType(caseRecord.transactionType)}
                    </span>
                  </span>
                </>
              )}
            </div>


            {/* Social Worker Info */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
              <span>
                Assigned to:{" "}
                <strong className="text-foreground font-semibold">
                  {caseRecord.assignedUser?.name ?? "Unassigned"}
                </strong>
              </span>
              <span>•</span>
              <span>
                Opened by:{" "}
                <strong className="text-foreground font-semibold">
                  {caseRecord.createdByUser?.name ?? "System"}
                </strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5" />
                Opened: {caseRecord.dateOpened?.substring(0, 10) ?? "—"}
              </span>
            </div>
          </div>

          {/* Lifecycle Action Bar */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              disabled={isDownloadingPdf}
              onClick={handleDownloadSummaryPdf}
              className="font-bold text-xs sm:text-sm h-10 px-3.5 gap-1.5"
              title="Download Case Summary PDF"
            >
              <Download className="size-4 text-primary" />
              {isDownloadingPdf ? "Exporting..." : "Summary PDF"}
            </Button>

            {canViewIntake && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPrintUisOpen(true)}
                className="font-bold text-xs sm:text-sm h-10 px-3.5 gap-1.5 cursor-pointer"
                title="Configure print copies, remarks, preview and download UIS"
              >
                <Printer className="size-4 text-primary" />
                Print UIS (ANNEX B)
              </Button>
            )}

            {canUpdate && !isClosedOrReferred && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAssignOpen(true)}
                  className="font-bold text-xs sm:text-sm h-10 px-3.5 gap-1.5"
                >
                  <UserCheck className="size-4 text-primary" />
                  Assign
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsReferOpen(true)}
                  className="font-bold text-xs sm:text-sm h-10 px-3.5 gap-1.5"
                >
                  <ArrowUpRight className="size-4 text-blue-600" />
                  Refer
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setIsCloseOpen(true)}
                  className="font-bold text-xs sm:text-sm h-10 px-4 gap-1.5 shadow-sm"
                >
                  <CheckCircle2 className="size-4" />
                  Close Case
                </Button>
              </>
            )}

            {canUpdate && isClosedOrReferred && (
              <Button
                variant="default"
                size="sm"
                onClick={handleReopen}
                className="font-bold text-xs sm:text-sm h-10 px-4 gap-1.5 shadow-sm"
              >
                <RotateCcw className="size-4" />
                Reopen Case
              </Button>
            )}

            {canDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleArchive}
                className="text-destructive hover:bg-destructive/10 font-bold text-xs h-10 px-3"
                title="Archive case"
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Sub-Record Tabs */}
      <div className="flex-1 p-6 space-y-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="mb-6 flex flex-wrap items-center justify-start w-full gap-2 group-data-horizontal/tabs:h-auto h-auto p-1.5 bg-muted/60 rounded-xl border">
            <TabsTrigger
              value="social-case"
              className="rounded-lg px-4 py-2.5 h-auto text-xs sm:text-sm font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all cursor-pointer"
            >
              <FileSpreadsheet className="size-4" />
              <span>Social Case (SCSR)</span>
            </TabsTrigger>

            <TabsTrigger
              value="progress-notes"
              className="rounded-lg px-4 py-2.5 h-auto text-xs sm:text-sm font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all cursor-pointer"
            >
              <FileText className="size-4" />
              <span>Progress Notes</span>
            </TabsTrigger>

            <TabsTrigger
              value="assessments"
              className="rounded-lg px-4 py-2.5 h-auto text-xs sm:text-sm font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all cursor-pointer"
            >
              <Stethoscope className="size-4" />
              <span>MSWD Assessments</span>
            </TabsTrigger>

            <TabsTrigger
              value="intake-sheet"
              className="rounded-lg px-4 py-2.5 h-auto text-xs sm:text-sm font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all cursor-pointer"
            >
              <ClipboardList className="size-4" />
              <span>Intake Sheet History</span>
            </TabsTrigger>

            <TabsTrigger
              value="guarantors"
              className="rounded-lg px-4 py-2.5 h-auto text-xs sm:text-sm font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all cursor-pointer"
            >
              <CreditCard className="size-4" />
              <span>Patient Guarantors</span>
            </TabsTrigger>

            <TabsTrigger
              value="watchers"
              className="rounded-lg px-4 py-2.5 h-auto text-xs sm:text-sm font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all cursor-pointer"
            >
              <Eye className="size-4" />
              <span>Watchers</span>
            </TabsTrigger>

            <TabsTrigger
              value="activity"
              className="rounded-lg px-4 py-2.5 h-auto text-xs sm:text-sm font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all cursor-pointer"
            >
              <History className="size-4" />
              <span>History & Activity</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="social-case">
            <SocialCaseTab
              caseId={caseRecord.id}
              patientId={caseRecord.patientId}
              patientName={caseRecord.patient?.fullName}
              caseCode={caseRecord.caseCode}
              showCaseContext={false}
            />
          </TabsContent>

          <TabsContent value="intake-sheet">
            <EncounterUisPanel
              caseId={caseRecord.id}
              caseCode={caseRecord.caseCode}
              patientName={caseRecord.patient?.fullName}
              transactionId={caseRecord.transactionId}
              transactionType={caseRecord.transactionType}
              onAssessNeeded={() => handleTabChange("assessments")}
            />
          </TabsContent>

          <TabsContent value="progress-notes">
            <ProgressNotesTab caseId={Number(caseId)} />
          </TabsContent>

          <TabsContent value="assessments">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-card rounded-xl border border-border/70 shadow-2xs">
                <div>
                  <h3 className="font-extrabold text-base text-foreground">Case Assessment History</h3>
                  <p className="text-xs text-muted-foreground">
                    Record intake assessments, economic background, expenses, and re-assessment episodes.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {canUpdate && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsIntakeAssessmentOpen(true)}
                        className="font-bold text-xs h-9 px-3 gap-1.5 cursor-pointer"
                      >
                        <FileEdit className="size-3.5 text-primary" />
                        {assessments.length > 0 ? "Edit Intake Assessment" : "Intake Assessment"}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setIsReassessOpen(true)}
                        className="font-bold text-xs h-9 px-3.5 gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <RotateCcw className="size-3.5" />
                        Re-assess Case
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <AssessmentHistoryTimeline assessments={assessments} />
            </div>
          </TabsContent>

          <TabsContent value="guarantors">
            <CaseGuarantorsTab
              patientId={caseRecord.patientId}
              transactionId={caseRecord.transactionId}
              caseCode={caseRecord.caseCode}
            />
          </TabsContent>

          <TabsContent value="watchers">
            <WatchersTab
              patient={caseRecord.patient}
              patientId={caseRecord.patientId}
              caseId={caseRecord.id}
            />
          </TabsContent>

          <TabsContent value="activity">
            <div className="rounded-xl border p-5 bg-card/60 space-y-4">
              <div className="font-bold text-base text-primary flex items-center gap-2">
                <History className="size-5" />
                Case Timeline Activity
              </div>
              {activities.length === 0 ? (
                <div className="text-xs sm:text-sm text-muted-foreground py-6 text-center">
                  No activity events logged for this case episode yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {activities.map((act: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border text-xs">
                      <Activity className="size-4 text-primary shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <div className="font-semibold text-foreground">{act.description ?? act.event ?? "Activity"}</div>
                        <div className="text-muted-foreground font-mono">{act.created_at ?? "—"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <AssignCaseDialog
        caseId={Number(caseId)}
        caseCode={caseRecord.caseCode}
        currentAssignedId={caseRecord.assignedUserId}
        open={isAssignOpen}
        onOpenChange={setIsAssignOpen}
      />

      <CloseCaseDialog
        caseId={Number(caseId)}
        caseCode={caseRecord.caseCode}
        open={isCloseOpen}
        onOpenChange={setIsCloseOpen}
      />

      <ReferCaseDialog
        caseId={Number(caseId)}
        caseCode={caseRecord.caseCode}
        open={isReferOpen}
        onOpenChange={setIsReferOpen}
      />

      <PrintUisDialog
        caseId={Number(caseId)}
        caseCode={caseRecord.caseCode}
        patientName={caseRecord.patient?.fullName}
        open={isPrintUisOpen}
        onOpenChange={setIsPrintUisOpen}
        onAssessNeeded={() => setIsIntakeAssessmentOpen(true)}
      />

      <IntakeAssessmentDialog
        open={isIntakeAssessmentOpen}
        onOpenChange={setIsIntakeAssessmentOpen}
        caseId={Number(caseId)}
        caseCode={caseRecord.caseCode}
        patientName={caseRecord.patient?.fullName}
        patientAddress={
          caseRecord.patient?.address ||
          [caseRecord.patient?.barangay, caseRecord.patient?.city].filter(Boolean).join(", ")
        }
        patientContact={caseRecord.patient?.contactNo}
        patientMonthlyIncome={caseRecord.patient?.monthlyIncome}
        existingAssessment={assessments[0] ?? null}
        transactionId={caseRecord.transactionId}
      />

      <ReassessCaseDialog
        open={isReassessOpen}
        onOpenChange={setIsReassessOpen}
        caseId={Number(caseId)}
        latestAssessment={assessments[0] ?? null}
      />
    </div>
  )
}
