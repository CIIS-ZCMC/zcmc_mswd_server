import React, { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { usePermission } from "@/features/auth/hooks/use-permission"
import { useCaseUisReadiness } from "../hooks/use-uis-prints"
import { useLatestAssessment } from "../hooks/use-assessment"
import { formatTransactionType } from "@/features/hospital/lib/transaction-type"
import { PrintUisDialog } from "./dialogs/print-uis-dialog"
import { IntakeAssessmentDialog } from "./dialogs/intake-assessment-dialog"
import { UisPrintHistoryTable } from "./uis-print-history-table"
import { MISSING_SECTION_LABELS } from "../lib/uis-labels"
import {
  AlertCircle,
  FileEdit,
  FolderPlus,
  Printer,
  Sparkles,
} from "lucide-react"

export interface EncounterUisPanelProps {
  caseId?: number | null
  caseCode?: string | null
  patientName?: string | null
  patientAddress?: string | null
  patientContact?: string | null
  patientMonthlyIncome?: number | null
  transactionId?: number | null
  transactionType?: string | null
  onOpenCaseNeeded?: () => void
  onAssessNeeded?: () => void
  className?: string
}

export const EncounterUisPanel: React.FC<EncounterUisPanelProps> = ({
  caseId,
  caseCode,
  patientName,
  patientAddress,
  patientContact,
  patientMonthlyIncome,
  transactionId,
  transactionType,
  onOpenCaseNeeded,
  onAssessNeeded,
  className = "",
}) => {
  const canView = usePermission("intake.view")
  const canUpdate = usePermission("cases.update")
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false)
  const [isIntakeDialogOpen, setIsIntakeDialogOpen] = useState(false)

  const { data: readiness, isLoading: isReadinessLoading } = useCaseUisReadiness(caseId)
  const { data: latestAssessment } = useLatestAssessment(caseId)

  const handleOpenAssess = () => {
    if (onAssessNeeded) {
      onAssessNeeded()
    } else {
      setIsIntakeDialogOpen(true)
    }
  }

  // No case opened for this encounter
  if (!caseId) {
    return (
      <Card className={`border shadow-2xs bg-card/70 ${className}`}>
        <CardHeader className="p-4 border-b border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2 text-foreground">
              <Printer className="size-4.5 text-muted-foreground shrink-0" />
              Unified Intake Sheet (ANNEX B)
            </CardTitle>
            <CardDescription className="text-xs">
              {transactionId
                ? `Encounter #${transactionId}${transactionType ? ` · ${formatTransactionType(transactionType)}` : ""} does not have an active social case episode.`
                : "No case episode linked."}
            </CardDescription>
          </div>

          {onOpenCaseNeeded && (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={onOpenCaseNeeded}
              className="h-9 px-3.5 text-xs font-bold gap-1.5 shadow-2xs cursor-pointer"
            >
              <FolderPlus className="size-4" />
              Open a Case to Print UIS
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-6 text-center text-xs text-muted-foreground bg-muted/10">
          The Unified Intake Sheet is generated from case and assessment records. Open a case episode for this encounter to assess the patient and generate the official ANNEX B printable.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`border shadow-2xs bg-card/70 ${className}`}>
      <CardHeader className="p-4 border-b border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2 text-primary">
            <Printer className="size-4.5 text-primary shrink-0" />
            Unified Intake Sheet (ANNEX B) Printable
            <Badge variant="secondary" className="font-mono text-xs px-2 py-0.2 font-semibold">
              {readiness?.print_count ?? 0} Print{(readiness?.print_count ?? 0) !== 1 ? "s" : ""}
            </Badge>
          </CardTitle>
          <CardDescription className="text-xs">
            Official MSWD intake printable for Case #{caseCode ?? caseId}
            {transactionId ? ` (HIS Encounter #${transactionId}${transactionType ? ` · ${formatTransactionType(transactionType)}` : ""})` : ""}.
          </CardDescription>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {canUpdate && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenAssess}
              className="h-9 px-3 text-xs font-bold gap-1.5 border shadow-2xs cursor-pointer"
            >
              <FileEdit className="size-3.5 text-primary" />
              {readiness?.has_assessment ? "Edit Assessment" : "Assess"}
            </Button>
          )}

          {canView && (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => setIsPrintDialogOpen(true)}
              className="h-9 px-3.5 text-xs font-bold gap-1.5 shadow-2xs shrink-0 cursor-pointer"
              title="Print options, copies, remarks and blank templates"
            >
              <Printer className="size-4" />
              Print UIS
            </Button>
          )}
        </div>
      </CardHeader>

      {/* Readiness Status Banner */}
      {!isReadinessLoading && readiness && (
        <div className="px-4 py-3 border-b border-border/40 bg-muted/20 space-y-2">
          {!readiness.has_assessment ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-2 font-medium">
                <AlertCircle className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>No intake assessment recorded yet. Full UIS print requires an assessment.</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {canUpdate && (
                  <Button
                    size="sm"
                    className="h-7 text-xs font-bold gap-1 bg-primary text-primary-foreground shadow-xs cursor-pointer"
                    onClick={handleOpenAssess}
                  >
                    <Sparkles className="size-3" /> Assess Now
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs font-bold border-amber-500/40 hover:bg-amber-500/15 cursor-pointer"
                  onClick={() => setIsPrintDialogOpen(true)}
                >
                  Print Blank Form
                </Button>
              </div>
            </div>
          ) : (
            readiness.missing && readiness.missing.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted-foreground font-medium">Unfilled sections hint:</span>
                {readiness.missing.map((section) => (
                  <Badge
                    key={section}
                    variant="outline"
                    onClick={canUpdate ? handleOpenAssess : undefined}
                    className={`text-[11px] font-semibold ${canUpdate ? "cursor-pointer hover:bg-muted" : ""}`}
                  >
                    {MISSING_SECTION_LABELS[section] || section}
                  </Badge>
                ))}
              </div>
            )
          )}
        </div>
      )}

      <CardContent className="p-0">
        <UisPrintHistoryTable caseId={caseId} />
      </CardContent>

      <PrintUisDialog
        open={isPrintDialogOpen}
        onOpenChange={setIsPrintDialogOpen}
        caseId={caseId}
        caseCode={caseCode ?? undefined}
        patientName={patientName ?? undefined}
        onAssessNeeded={handleOpenAssess}
      />

      <IntakeAssessmentDialog
        open={isIntakeDialogOpen}
        onOpenChange={setIsIntakeDialogOpen}
        caseId={Number(caseId)}
        caseCode={caseCode ?? undefined}
        patientName={patientName ?? undefined}
        patientAddress={patientAddress ?? undefined}
        patientContact={patientContact ?? undefined}
        patientMonthlyIncome={patientMonthlyIncome}
        existingAssessment={latestAssessment}
      />
    </Card>
  )
}
