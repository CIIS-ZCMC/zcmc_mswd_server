import React, { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { usePermission } from "@/features/auth/hooks/use-permission"
import { useDeleteAssessment } from "@/features/cases/hooks/use-assessment"
import { formatTransactionType } from "@/features/hospital/lib/transaction-type"
import {
  formatCurrency,
  getBracketColor,
  getClassificationBadgeText,
} from "@/features/cases/lib/classification"
import {
  HOUSE_TENURE_OPTIONS,
  LIGHT_SOURCE_OPTIONS,
  WATER_SOURCE_OPTIONS,
  labelFor,
} from "@/features/cases/lib/assessment-constants"
import {
  useFundSourceOptions,
  useModeOfAssistanceOptions,
} from "@/features/library/hooks/use-lookup-options"
import { MISSING_SECTION_LABELS } from "@/features/cases/lib/uis-labels"
import { MswdClassificationCard } from "@/features/cases/components/mswd-classification-card"
import { UisPrintHistoryTable } from "@/features/cases/components/uis-print-history-table"
import { PrintUisDialog } from "@/features/cases/components/dialogs/print-uis-dialog"
import { IntakeAssessmentDialog } from "@/features/cases/components/dialogs/intake-assessment-dialog"
import { UisPdfPreviewDialog } from "@/features/cases/components/dialogs/uis-pdf-preview-dialog"
import type { PatientRecord } from "@/features/patients/types/patient.types"
import type { PatientUisRow } from "@/features/cases/types/uis.types"
import { ApiError } from "@/lib/api-client"
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  FileCheck2,
  FileEdit,
  FileText,
  HeartHandshake,
  Home,
  Info,
  Layers,
  Loader2,
  Lock,
  Plus,
  Printer,
  ShieldAlert,
  Trash2,
  User,
  Users,
} from "lucide-react"

interface UisSheetProps {
  row: PatientUisRow
  patient: PatientRecord
  className?: string
}

export const UisSheet: React.FC<UisSheetProps> = ({
  row,
  patient,
  className = "",
}) => {
  const canCreate = usePermission("cases.create")
  const canUpdate = usePermission("cases.update")

  const [isIntakeDialogOpen, setIsIntakeDialogOpen] = useState(false)
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false)
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const deleteAssessmentMutation = useDeleteAssessment(row.case.id)
  const { data: modeOptions = [] } = useModeOfAssistanceOptions(false)
  const { data: fundSourceOptions = [] } = useFundSourceOptions(false)

  const { case: caseData, uis } = row
  const assessment = uis.assessment
  const hasAssessment = uis.hasAssessment && Boolean(assessment)

  const handleDeleteAssessment = async () => {
    if (!uis.assessmentId) return
    setDeleteError(null)

    try {
      await deleteAssessmentMutation.mutateAsync(uis.assessmentId)
      setIsDeleteDialogOpen(false)
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setDeleteError(err.firstValidationMessage || err.message)
      } else {
        setDeleteError(err instanceof Error ? err.message : "Failed to delete assessment.")
      }
    }
  };

  const informantDisplayName =
    assessment?.informantLastName || assessment?.informantFirstName
      ? [
          assessment.informantLastName,
          assessment.informantFirstName,
          assessment.informantMiddleName,
        ]
          .filter(Boolean)
          .join(", ")
      : assessment?.informantName || "—"

  const informantEffectiveAddress =
    assessment?.informantAddress || patient.address || "—"
  const informantEffectiveContact =
    assessment?.informantContact || patient.contactNo || "—"

  const dateStr = caseData.dateOpened
    ? new Date(caseData.dateOpened).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—"

  const classCode =
    uis.classification?.classification ||
    uis.classification?.calculatedClassification ||
    assessment?.classification ||
    null

  // The server sends null slots when no expense line matched (or no assessment); the
  // printed form leaves those blank, so they render as "—" here, never as a made-up 0.
  const expenseSlots = uis.expenseSlots
  const slotText = (value: number | null | undefined) =>
    value === null || value === undefined ? "—" : formatCurrency(value)

  // Itemised total of the slots that have an amount; null when there is none to add.
  const slotValues = expenseSlots
    ? Object.values(expenseSlots).filter((v): v is number => v !== null)
    : []
  const totalMonthlyExpenses = slotValues.length > 0 ? slotValues.reduce((a, b) => a + b, 0) : null

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Banner & Action Bar */}
      <div className="bg-card border border-border/80 rounded-xl p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base sm:text-lg font-mono font-bold text-foreground">
                {caseData.caseCode}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-sm font-semibold text-foreground/90">
                {formatTransactionType(caseData.transactionType)}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{dateStr}</span>

              {hasAssessment && (
                <Badge
                  className={`text-xs font-bold uppercase tracking-wide ml-1 ${getBracketColor(
                    classCode
                  )}`}
                >
                  {getClassificationBadgeText(classCode)}
                </Badge>
              )}

              {uis.hasSocialCase && (
                <Badge variant="outline" className="text-xs bg-muted text-muted-foreground gap-1">
                  <Lock className="size-3" />
                  SCSR Finalized
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {uis.ready ? (
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="size-4" />
                  Ready to print (ANNEX B complete)
                </span>
              ) : hasAssessment ? (
                <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                  <AlertTriangle className="size-4" />
                  Missing sections for complete ANNEX B
                </span>
              ) : (
                <span className="text-muted-foreground font-medium">
                  No intake assessment completed for this episode
                </span>
              )}

              <span className="text-border">|</span>
              <span className="flex items-center gap-1 font-mono">
                <Printer className="size-3.5" />
                {uis.printCount} {uis.printCount === 1 ? "print" : "prints"}
              </span>

              {uis.lastPrintedAt && (
                <span>
                  (Last printed:{" "}
                  {new Date(uis.lastPrintedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                  )
                </span>
              )}
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-border/50">
            {hasAssessment ? (
              <>
                {canUpdate && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsIntakeDialogOpen(true)}
                    className="h-9 gap-1.5 text-xs font-semibold"
                  >
                    <FileEdit className="size-3.5 text-primary" />
                    Edit Assessment
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPreviewDialogOpen(true)}
                  className="h-9 gap-1.5 text-xs font-semibold"
                >
                  <Eye className="size-3.5" />
                  Preview
                </Button>

                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setIsPrintDialogOpen(true)}
                  className="h-9 gap-1.5 text-xs font-semibold shadow-2xs"
                >
                  <Printer className="size-3.5" />
                  Print UIS…
                </Button>

                {!uis.hasSocialCase && canUpdate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDeleteError(null)
                      setIsDeleteDialogOpen(true)
                    }}
                    className="h-9 px-2.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive font-medium"
                    title="Delete this assessment"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </>
            ) : (
              <>
                {canCreate && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setIsIntakeDialogOpen(true)}
                    className="h-9 gap-1.5 text-xs font-semibold shadow-2xs"
                  >
                    <Plus className="size-3.5" />
                    Assess Case
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPrintDialogOpen(true)}
                  className="h-9 gap-1.5 text-xs font-semibold"
                >
                  <Printer className="size-3.5" />
                  Print Blank Form
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Missing Sections warning alert */}
        {hasAssessment && uis.missing.length > 0 && (
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 p-3 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
              <AlertTriangle className="size-4 shrink-0" />
              Missing Information for Complete ANNEX B Intake Sheet:
            </div>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {uis.missing.map((section) => (
                <Badge
                  key={section}
                  variant="outline"
                  onClick={canUpdate ? () => setIsIntakeDialogOpen(true) : undefined}
                  className={`text-[11px] bg-background font-semibold border-amber-300 dark:border-amber-700 ${
                    canUpdate ? "cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/50" : ""
                  }`}
                >
                  {MISSING_SECTION_LABELS[section] || section}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Social Case Promotion Note */}
        {uis.hasSocialCase && (
          <div className="rounded-lg bg-muted/60 border border-border/70 p-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="size-4 text-primary shrink-0" />
            <span>
              This intake assessment has been incorporated into an official Social Case Study Report
              (SCSR) and is permanently locked for audit integrity.
            </span>
          </div>
        )}
      </div>

      {!hasAssessment ? (
        /* Not Assessed Empty State */
        <Card className="border border-dashed border-border/80 shadow-none text-center p-8 sm:p-12 space-y-4">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground mx-auto">
            <FileText className="size-7 opacity-70" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base sm:text-lg font-bold text-foreground">
              No Intake Assessment On File
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Encounter <strong>{caseData.caseCode}</strong> has been opened, but its MSWD intake
              assessment has not been conducted yet. Complete the assessment to generate a
              classification matrix and ANNEX B intake sheet.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {canCreate && (
              <Button
                onClick={() => setIsIntakeDialogOpen(true)}
                className="gap-2 text-xs font-semibold"
              >
                <Plus className="size-4" />
                Conduct Assessment
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setIsPrintDialogOpen(true)}
              className="gap-2 text-xs font-semibold"
            >
              <Printer className="size-4" />
              Print Blank Intake Sheet
            </Button>
          </div>
        </Card>
      ) : (
        /* Full ANNEX B Read-Only Sheet Cards */
        <div className="space-y-6">
          {/* Informant Details */}
          <Card className="border shadow-2xs">
            <CardHeader className="p-4 border-b bg-muted/30">
              <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-2">
                <User className="size-4 text-primary" />
                Informant Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground font-medium block">Informant Name</span>
                  <span className="font-bold text-foreground">{informantDisplayName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium block">Relationship to Patient</span>
                  <span className="font-semibold text-foreground">
                    {assessment?.informantRelationship || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium block">Contact Number</span>
                  <span className="font-mono text-foreground">{informantEffectiveContact}</span>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium block">Address</span>
                  <span className="text-foreground">{informantEffectiveAddress}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section I: Identifying Information */}
          <Card className="border shadow-2xs">
            <CardHeader className="p-4 border-b bg-muted/30">
              <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-2">
                <FileCheck2 className="size-4 text-primary" />
                Section I: Identifying Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground font-medium block">Patient Full Name</span>
                  <span className="font-bold text-foreground">{patient.fullName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium block">Hospital No.</span>
                  <span className="font-mono font-bold text-foreground">{patient.hospitalNo}</span>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium block">MSWD No.</span>
                  <span className="font-mono font-bold text-foreground">
                    {patient.mswdNo || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium block">Age / Sex</span>
                  <span className="font-semibold text-foreground">
                    {patient.age} yrs · {patient.gender}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium block">Civil Status</span>
                  <span className="font-semibold text-foreground">
                    {patient.civilStatus || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium block">Date of Birth</span>
                  <span className="font-mono text-foreground">{patient.birthDate || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium block">Place of Birth</span>
                  <span className="text-foreground">{patient.placeOfBirth || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium block">PhilHealth No.</span>
                  <span className="font-mono text-foreground">{patient.philHealthNo || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium block">Educational Attainment</span>
                  <span className="text-foreground">
                    {patient.educationalAttainment || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium block">Occupation</span>
                  <span className="text-foreground">{patient.occupation || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium block">Contact Number</span>
                  <span className="font-mono text-foreground">{patient.contactNo || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium block">Permanent Address</span>
                  <span className="text-foreground">
                    {patient.permanentAddress || patient.address || "—"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section II: Family Composition & Income */}
          <Card className="border shadow-2xs">
            <CardHeader className="p-4 border-b bg-muted/30 flex flex-row items-center justify-between">
              <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-2">
                <Users className="size-4 text-primary" />
                Section II: Family Composition &amp; Income
              </CardTitle>
              <div className="text-xs text-muted-foreground">
                Household Size:{" "}
                <span className="font-bold text-foreground">{uis.householdSize}</span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-muted/20 text-xs">
                      <TableHead className="font-bold">Full Name</TableHead>
                      <TableHead className="font-bold">Relationship</TableHead>
                      <TableHead className="font-bold">Age / Sex</TableHead>
                      <TableHead className="font-bold">Civil Status</TableHead>
                      <TableHead className="font-bold">Educ. Attainment</TableHead>
                      <TableHead className="font-bold">Occupation</TableHead>
                      <TableHead className="font-bold text-right">Monthly Income</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patient.familyMembers && patient.familyMembers.length > 0 ? (
                      patient.familyMembers.map((member) => (
                        <TableRow key={member.id} className="text-xs">
                          <TableCell className="font-semibold text-foreground">
                            {member.fullName}
                          </TableCell>
                          <TableCell>{member.relationship || "—"}</TableCell>
                          <TableCell>
                            {member.age ? `${member.age} yrs` : "—"}
                            {member.sex ? ` · ${member.sex}` : ""}
                          </TableCell>
                          <TableCell>{member.civilStatus || "—"}</TableCell>
                          <TableCell>{member.educationalAttainment || "—"}</TableCell>
                          <TableCell>{member.occupation || "—"}</TableCell>
                          <TableCell className="font-mono text-right font-medium">
                            {formatCurrency(member.monthlyIncome || 0)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4 text-xs text-muted-foreground">
                          No family members listed on file.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Other Income Sources & Total Family Income Summary */}
              <div className="p-4 border-t bg-muted/10 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-bold text-foreground block mb-1">
                    Other Sources of Income
                  </span>
                  {assessment?.otherIncomeSources && assessment.otherIncomeSources.length > 0 ? (
                    <ul className="space-y-1">
                      {assessment.otherIncomeSources.map((s, idx) => (
                        <li key={idx} className="flex justify-between text-muted-foreground">
                          <span>• {s.source}</span>
                          <span className="font-mono text-foreground font-medium">
                            {formatCurrency(Number(s.amount || 0))}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-muted-foreground italic">None recorded</span>
                  )}
                </div>

                <div className="flex flex-col justify-center items-start md:items-end">
                  <div className="space-y-1 text-right">
                    <span className="text-xs text-muted-foreground block">
                      Total Family Income
                    </span>
                    <span className="text-lg font-bold font-mono text-primary">
                      {formatCurrency(assessment?.totalFamilyIncome ?? 0)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section III: Socio-Economic Housing, Utilities & Expenses */}
          <Card className="border shadow-2xs">
            <CardHeader className="p-4 border-b bg-muted/30">
              <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-2">
                <Home className="size-4 text-primary" />
                Section III: Socio-Economic Data &amp; Monthly Expenses
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pb-3 border-b">
                <div>
                  <span className="text-muted-foreground font-medium block">House Tenure</span>
                  <span className="font-bold text-foreground">
                    {labelFor(HOUSE_TENURE_OPTIONS, assessment?.houseTenure) || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium block">Light / Power Source</span>
                  <span className="font-bold text-foreground">
                    {Array.isArray(assessment?.lightSource)
                      ? assessment.lightSource
                          .map((l) => labelFor(LIGHT_SOURCE_OPTIONS, l) || l)
                          .join(", ")
                      : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium block">Water Source</span>
                  <span className="font-bold text-foreground">
                    {Array.isArray(assessment?.waterSource)
                      ? assessment.waterSource
                          .map((w) => labelFor(WATER_SOURCE_OPTIONS, w) || w)
                          .join(", ")
                      : "—"}
                  </span>
                </div>
              </div>

              {/* Standard Expense Slots Grid */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider block">
                  Monthly Expense Breakdown (ANNEX B Slots)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-lg border bg-card">
                    <span className="text-muted-foreground block text-[11px]">House &amp; Lot</span>
                    <span className="font-mono font-bold text-foreground">
                      {slotText(expenseSlots?.housing)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border bg-card">
                    <span className="text-muted-foreground block text-[11px]">Food &amp; Nutrition</span>
                    <span className="font-mono font-bold text-foreground">
                      {slotText(expenseSlots?.food)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border bg-card">
                    <span className="text-muted-foreground block text-[11px]">Education</span>
                    <span className="font-mono font-bold text-foreground">
                      {slotText(expenseSlots?.education)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border bg-card">
                    <span className="text-muted-foreground block text-[11px]">Transportation</span>
                    <span className="font-mono font-bold text-foreground">
                      {slotText(expenseSlots?.transport)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border bg-card">
                    <span className="text-muted-foreground block text-[11px]">Clothing</span>
                    <span className="font-mono font-bold text-foreground">
                      {slotText(expenseSlots?.clothing)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border bg-card">
                    <span className="text-muted-foreground block text-[11px]">Medical Care</span>
                    <span className="font-mono font-bold text-foreground">
                      {slotText(expenseSlots?.medical)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border bg-card">
                    <span className="text-muted-foreground block text-[11px]">House Help</span>
                    <span className="font-mono font-bold text-foreground">
                      {slotText(expenseSlots?.house_help)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border bg-card">
                    <span className="text-muted-foreground block text-[11px]">Insurance Premium</span>
                    <span className="font-mono font-bold text-foreground">
                      {slotText(expenseSlots?.insurance)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border bg-card">
                    <span className="text-muted-foreground block text-[11px]">Others</span>
                    <span className="font-mono font-bold text-foreground">
                      {slotText(expenseSlots?.others)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border bg-primary/5 border-primary/30">
                    <span className="text-primary font-bold block text-[11px]">Itemised Total</span>
                    <span className="font-mono font-black text-primary">
                      {slotText(totalMonthlyExpenses)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section IV: Final Diagnosis & Medical Needs */}
          <Card className="border shadow-2xs">
            <CardHeader className="p-4 border-b bg-muted/30">
              <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-2">
                <Layers className="size-4 text-primary" />
                Section IV: Final Diagnosis &amp; Medical Needs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div>
                <span className="text-muted-foreground font-medium block">Final Diagnosis</span>
                <p className="text-foreground whitespace-pre-wrap leading-relaxed mt-0.5">
                  {assessment?.presentingProblem || "—"}
                </p>
              </div>

              {assessment?.problemCategories && assessment.problemCategories.length > 0 && (
                <div>
                  <span className="text-muted-foreground font-medium block mb-1.5">
                    Problem Categories
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {assessment.problemCategories.map((cat) => (
                      <Badge key={cat} variant="secondary" className="text-[11px]">
                        {cat}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {assessment?.problemSpecify && (
                <div>
                  <span className="text-muted-foreground font-medium block">Type of Assistance</span>
                  <p className="text-foreground font-semibold">{assessment.problemSpecify}</p>
                </div>
              )}

              {assessment?.medicalHistory && (
                <div className="pt-2 border-t">
                  <span className="text-muted-foreground font-medium block">Medical History</span>
                  <p className="text-foreground whitespace-pre-wrap leading-relaxed mt-0.5">
                    {assessment.medicalHistory}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section V: Findings, Recommendation & Fund Source */}
          <Card className="border shadow-2xs">
            <CardHeader className="p-4 border-b bg-muted/30">
              <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-2">
                <HeartHandshake className="size-4 text-primary" />
                Section V: Findings, Recommendation &amp; Assistance
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-3 border-b">
                <div>
                  <span className="text-muted-foreground font-medium block">Mode of Assistance</span>
                  <span className="font-bold text-foreground">
                    {labelFor(modeOptions, assessment?.recommendationMode) || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium block">Fund Source</span>
                  <span className="font-bold text-foreground">
                    {labelFor(fundSourceOptions, assessment?.fundSource) || "—"}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-muted-foreground font-medium block">
                  Social Worker Assessment &amp; Recommendation
                </span>
                <p className="text-foreground whitespace-pre-wrap leading-relaxed mt-1">
                  {assessment?.recommendation || "—"}
                </p>
              </div>

              {assessment?.interventionPlan && (
                <div className="pt-2 border-t">
                  <span className="text-muted-foreground font-medium block">Intervention Plan</span>
                  <p className="text-foreground whitespace-pre-wrap leading-relaxed mt-0.5">
                    {assessment.interventionPlan}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* MSWD Classification Card */}
          {assessment && <MswdClassificationCard assessment={assessment} />}

          {/* Print History */}
          <Card className="border shadow-2xs">
            <CardHeader className="p-4 border-b bg-muted/30">
              <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-2">
                <Printer className="size-4 text-primary" />
                Print History for this Encounter
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <UisPrintHistoryTable caseId={caseData.id} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dialogs */}
      <IntakeAssessmentDialog
        open={isIntakeDialogOpen}
        onOpenChange={setIsIntakeDialogOpen}
        caseId={caseData.id}
        caseCode={caseData.caseCode}
        patientName={patient.fullName}
        patientAddress={patient.address}
        patientContact={patient.contactNo}
        patientMonthlyIncome={patient.monthlyIncome}
        existingAssessment={assessment}
        transactionId={caseData.transactionId}
      />

      <PrintUisDialog
        open={isPrintDialogOpen}
        onOpenChange={setIsPrintDialogOpen}
        caseId={caseData.id}
        caseCode={caseData.caseCode}
        patientName={patient.fullName}
        onAssessNeeded={() => {
          setIsPrintDialogOpen(false)
          setIsIntakeDialogOpen(true)
        }}
      />

      <UisPdfPreviewDialog
        open={isPreviewDialogOpen}
        onOpenChange={setIsPreviewDialogOpen}
        caseId={caseData.id}
        caseCode={caseData.caseCode}
      />

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="size-5" />
              Delete Intake Assessment?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to delete the intake assessment for case{" "}
                <strong>{caseData.caseCode}</strong>? This action will permanently remove all
                assessed economic data, problem details, and MSWD classification for this encounter.
              </p>
              {deleteError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-xs font-semibold">
                  {deleteError}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAssessmentMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDeleteAssessment()
              }}
              disabled={deleteAssessmentMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAssessmentMutation.isPending ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="size-3.5 animate-spin" />
                  Deleting…
                </span>
              ) : (
                "Delete Assessment"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
