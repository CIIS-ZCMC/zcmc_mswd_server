import React, { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
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
import { useQueryClient } from "@tanstack/react-query"
import {
  useDeleteAssessment,
  useRefreshUisSnapshot,
} from "@/features/cases/hooks/use-assessment"
import { uisSheetData } from "@/features/cases/lib/uis-sheet-data"
import {
  uisPrintKeys,
  patientUisKeys,
} from "@/features/cases/hooks/use-uis-prints"
import { printUisDirectly } from "@/features/cases/api/uis-print-api"
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
import { CaseGuarantorsTab } from "@/features/cases/components/case-guarantors-tab"
import type { PatientRecord } from "@/features/patients/types/patient.types"
import type { PatientUisRow } from "@/features/cases/types/uis.types"
import { ApiError } from "@/lib/api-client"
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  FileCheck2,
  FileEdit,
  HeartHandshake,
  Home,
  Info,
  Layers,
  Loader2,
  Lock,
  Plus,
  Printer,
  RefreshCw,
  ShieldAlert,
  User,
  Users,
  Wallet,
} from "lucide-react"

interface UisSheetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  row: PatientUisRow | null
  patient: PatientRecord
  initialAssessOpen?: boolean
  initialPrintOpen?: boolean
}

export const UisSheet: React.FC<UisSheetDialogProps> = ({
  open,
  onOpenChange,
  row,
  patient,
  initialAssessOpen = false,
  initialPrintOpen = false,
}) => {
  const canCreate = usePermission("cases.create")
  const canUpdate = usePermission("cases.update")

  const [activeSubTab, setActiveSubTab] = useState("identifying-family")
  const [isIntakeDialogOpen, setIsIntakeDialogOpen] =
    useState(initialAssessOpen)
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(initialPrintOpen)
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isRefreshDialogOpen, setIsRefreshDialogOpen] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const [isPrintingDirect, setIsPrintingDirect] = useState(false)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (initialAssessOpen) {
      setIsIntakeDialogOpen(true)
    }
  }, [initialAssessOpen])

  useEffect(() => {
    if (initialPrintOpen) {
      setIsPrintDialogOpen(true)
    }
  }, [initialPrintOpen])

  const caseId = row?.case?.id ?? 0
  const deleteAssessmentMutation = useDeleteAssessment(caseId)
  const refreshSnapshotMutation = useRefreshUisSnapshot(caseId)
  const { data: modeOptions = [] } = useModeOfAssistanceOptions(false)
  const { data: fundSourceOptions = [] } = useFundSourceOptions(false)

  if (!row) return null

  // An intake taken before any case was opened has no case (caseData null).
  const { case: caseData, encounter, guarantees, uis } = row
  const assessment = uis.assessment
  const uisLabel =
    caseData?.caseCode ??
    (encounter.transactionId
      ? `Encounter #${encounter.transactionId}`
      : "Intake Assessment")
  const hasAssessment = uis.hasAssessment && Boolean(assessment)

  const handleDirectPrint = async () => {
    if (!row) return
    setIsPrintingDirect(true)
    const target = uis.assessmentId
      ? { assessmentId: uis.assessmentId }
      : { caseId: caseData?.id ?? 0 }

    try {
      await printUisDirectly(target, {
        blank: !hasAssessment,
      })
      queryClient.invalidateQueries({ queryKey: uisPrintKeys.all })
      queryClient.invalidateQueries({ queryKey: patientUisKeys.all })
    } catch (err) {
      console.error("Failed to print UIS:", err)
    } finally {
      setIsPrintingDirect(false)
    }
  }

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
        setDeleteError(
          err instanceof Error ? err.message : "Failed to delete assessment."
        )
      }
    }
  }

  const handleRefreshSnapshot = async () => {
    if (!uis.assessmentId) return
    setRefreshError(null)

    try {
      await refreshSnapshotMutation.mutateAsync(uis.assessmentId)
      setIsRefreshDialogOpen(false)
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setRefreshError(err.firstValidationMessage || err.message)
      } else {
        setRefreshError(
          err instanceof Error
            ? err.message
            : "Failed to refresh from the patient record."
        )
      }
    }
  }

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

  // Sections I and II as the printed form reads them: the copy the intake froze,
  // today's record only when there is none. See docs/UIS_SNAPSHOT_PLAN.md.
  const sheet = uisSheetData(assessment, patient, uis.householdSize)

  const frozenAt = assessment?.uisSnapshotAt
    ? new Date(assessment.uisSnapshotAt).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null

  const informantEffectiveAddress =
    assessment?.informantAddress || sheet.permanentAddress || "—"
  const informantEffectiveContact =
    assessment?.informantContact || sheet.contactNo || "—"

  const encounterDate = encounter.date ?? caseData?.dateOpened ?? null
  const dateStr = encounterDate
    ? new Date(encounterDate).toLocaleDateString(undefined, {
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

  const expenseSlots = uis.expenseSlots
  const slotText = (value: number | null | undefined) =>
    value === null || value === undefined ? "—" : formatCurrency(value)

  const slotValues = expenseSlots
    ? Object.values(expenseSlots).filter((v): v is number => v !== null)
    : []
  const totalMonthlyExpenses =
    slotValues.length > 0 ? slotValues.reduce((a, b) => a + b, 0) : null

  const expenseRows = [
    {
      key: "housing",
      label: "House & Lot (Rent / Amortization)",
      value: expenseSlots?.housing,
    },
    { key: "food", label: "Food & Nutrition", value: expenseSlots?.food },
    {
      key: "education",
      label: "Education & Schooling",
      value: expenseSlots?.education,
    },
    {
      key: "transport",
      label: "Transportation / Travel",
      value: expenseSlots?.transport,
    },
    {
      key: "clothing",
      label: "Clothing & Footwear",
      value: expenseSlots?.clothing,
    },
    {
      key: "medical",
      label: "Medical Care & Prescriptions",
      value: expenseSlots?.medical,
    },
    {
      key: "house_help",
      label: "House Help / Domestic Services",
      value: expenseSlots?.house_help,
    },
    {
      key: "insurance",
      label: "Insurance Premium (SSS / PhilHealth)",
      value: expenseSlots?.insurance,
    },
    {
      key: "others",
      label: "Other Living Expenses / Miscellaneous",
      value: expenseSlots?.others,
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-full flex-col gap-0 overflow-hidden rounded-2xl border p-0 shadow-2xl sm:max-w-4xl">
        {/* Modal Header */}
        <DialogHeader className="shrink-0 space-y-3 border-b border-border/60 bg-card p-4 pr-12 sm:p-5 sm:pr-14">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle className="font-mono text-lg font-bold text-foreground">
                {uisLabel}
              </DialogTitle>
              <span className="text-muted-foreground">·</span>
              <span className="text-xs font-semibold text-foreground/90">
                {formatTransactionType(
                  encounter.transactionType ?? caseData?.transactionType
                )}
              </span>
              {!caseData && (
                <Badge
                  variant="outline"
                  className="text-xs font-semibold text-muted-foreground"
                >
                  No case
                </Badge>
              )}
              <span className="text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{dateStr}</span>

              {hasAssessment && (
                <Badge
                  className={`ml-1 text-xs font-bold tracking-wide uppercase ${getBracketColor(
                    classCode
                  )}`}
                >
                  {getClassificationBadgeText(classCode)}
                </Badge>
              )}

              {uis.hasSocialCase && (
                <Badge
                  variant="outline"
                  className="gap-1 bg-muted text-xs text-muted-foreground"
                >
                  <Lock className="size-3" />
                  SCSR Finalized
                </Badge>
              )}
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Unified Intake Sheet (ANNEX B) for patient{" "}
              <strong>{patient.fullName}</strong>
              {patient.hospitalNo && (
                <>
                  {" "}
                  · Hospital No.{" "}
                  <span className="font-mono font-semibold text-foreground">
                    {patient.hospitalNo}
                  </span>
                </>
              )}
            </DialogDescription>
          </div>

          {/* Unassessed Case Notice Banner */}
          {!hasAssessment && (
            <div className="flex flex-col justify-between gap-2.5 rounded-lg border border-primary/20 bg-primary/10 p-2.5 text-xs text-foreground sm:flex-row sm:items-center sm:p-3">
              <div className="flex items-center gap-2 font-medium text-primary">
                <Info className="size-4 shrink-0" />
                <span>
                  No intake assessment has been conducted yet for this
                  encounter.
                </span>
              </div>
              {canCreate && (
                <Button
                  size="sm"
                  onClick={() => setIsIntakeDialogOpen(true)}
                  className="h-7 shrink-0 cursor-pointer gap-1.5 self-start px-3 text-xs font-bold sm:self-auto"
                >
                  <Plus className="size-3.5" />
                  Conduct Assessment Now
                </Button>
              )}
            </div>
          )}

          {/* Missing Info Warning Banner */}
          {hasAssessment && uis.missing.length > 0 && (
            <div className="flex flex-col justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-800 sm:flex-row sm:items-center dark:text-amber-300">
              <span className="flex items-center gap-1.5 font-medium">
                <AlertTriangle className="size-4 shrink-0 text-amber-600" />
                Missing for complete ANNEX B:{" "}
                {uis.missing
                  .map((m) => MISSING_SECTION_LABELS[m] || m)
                  .join(", ")}
              </span>
              {canUpdate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsIntakeDialogOpen(true)}
                  className="h-6 shrink-0 self-start text-xs font-bold text-amber-700 hover:bg-amber-500/20 sm:self-auto dark:text-amber-300"
                >
                  Complete Now
                </Button>
              )}
            </div>
          )}
        </DialogHeader>

        {/* Modal Content with Sub-Tabs */}
        <Tabs
          value={activeSubTab}
          onValueChange={setActiveSubTab}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          {/* Responsive 5-Column Tabs Bar */}
          <div className="shrink-0 border-b border-border/50 bg-muted/20 px-4 py-2.5 sm:px-5">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl bg-muted/70 p-1 sm:grid-cols-5">
              <TabsTrigger
                value="identifying-family"
                className="cursor-pointer gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all data-[state=active]:bg-background data-[state=active]:shadow-xs"
              >
                <Users className="size-3.5 shrink-0 text-primary" />
                <span className="truncate">
                  1. Identifying{" "}
                  <span className="hidden md:inline">&amp; Family</span>
                </span>
              </TabsTrigger>

              <TabsTrigger
                value="socio-economic"
                className="cursor-pointer gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all data-[state=active]:bg-background data-[state=active]:shadow-xs"
              >
                <Home className="size-3.5 shrink-0 text-primary" />
                <span className="truncate">
                  2. Socio-Economic{" "}
                  <span className="hidden md:inline">&amp; Expenses</span>
                </span>
              </TabsTrigger>

              <TabsTrigger
                value="assessment-classification"
                className="cursor-pointer gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all data-[state=active]:bg-background data-[state=active]:shadow-xs"
              >
                <HeartHandshake className="size-3.5 shrink-0 text-primary" />
                <span className="truncate">
                  3. Assessment{" "}
                  <span className="hidden md:inline">&amp; Class</span>
                </span>
              </TabsTrigger>

              <TabsTrigger
                value="guarantors"
                className="cursor-pointer gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all data-[state=active]:bg-background data-[state=active]:shadow-xs"
              >
                <Wallet className="size-3.5 shrink-0 text-primary" />
                <span className="truncate">
                  4. Guarantors
                  {guarantees.count > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-1 px-1 py-0 font-mono text-[10px]"
                    >
                      {guarantees.count}
                    </Badge>
                  )}
                </span>
              </TabsTrigger>

              <TabsTrigger
                value="print-history"
                className="cursor-pointer gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all data-[state=active]:bg-background data-[state=active]:shadow-xs"
              >
                <Printer className="size-3.5 shrink-0 text-primary" />
                <span className="truncate">
                  5. Prints
                  {uis.printCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-1 px-1 py-0 font-mono text-[10px]"
                    >
                      {uis.printCount}
                    </Badge>
                  )}
                </span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            {/* Sub-Tab 1: Identifying & Family */}
            <TabsContent value="identifying-family" className="mt-0 space-y-4">
              {/* Informant Information */}
              <Card className="border shadow-2xs">
                <CardHeader className="border-b bg-muted/30 p-3.5">
                  <CardTitle className="flex items-center gap-2 text-xs font-bold sm:text-sm">
                    <User className="size-4 text-primary" />
                    Informant Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2 md:grid-cols-4">
                    <div>
                      <span className="block font-medium text-muted-foreground">
                        Informant Name
                      </span>
                      <span className="font-bold text-foreground">
                        {informantDisplayName}
                      </span>
                    </div>
                    <div>
                      <span className="block font-medium text-muted-foreground">
                        Relationship to Patient
                      </span>
                      <span className="font-semibold text-foreground">
                        {assessment?.informantRelationship || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="block font-medium text-muted-foreground">
                        Contact Number
                      </span>
                      <span className="font-mono text-foreground">
                        {informantEffectiveContact}
                      </span>
                    </div>
                    <div>
                      <span className="block font-medium text-muted-foreground">
                        Address
                      </span>
                      <span className="text-foreground">
                        {informantEffectiveAddress}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Where sections I and II come from: the copy the intake froze,
                  or today's record when there is none. */}
              {sheet.frozen && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Lock className="size-3.5 shrink-0" />
                    <span>
                      Sections I and II are as recorded at the intake
                      {frozenAt ? ` (${frozenAt})` : ""}
                      {assessment?.uisSnapshotBy
                        ? `, last refreshed by ${assessment.uisSnapshotBy}`
                        : ""}
                      . Later edits to the patient do not change this sheet.
                    </span>
                  </span>
                  {canUpdate && uis.assessmentId && !uis.hasSocialCase && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 shrink-0 gap-1.5 text-xs font-semibold"
                      onClick={() => {
                        setRefreshError(null)
                        setIsRefreshDialogOpen(true)
                      }}
                    >
                      <RefreshCw className="size-3.5" />
                      Refresh from patient record
                    </Button>
                  )}
                </div>
              )}

              {/* Section I: Identifying Information */}
              <Card className="border shadow-2xs">
                <CardHeader className="border-b bg-muted/30 p-3.5">
                  <CardTitle className="flex items-center gap-2 text-xs font-bold sm:text-sm">
                    <FileCheck2 className="size-4 text-primary" />
                    Section I: Identifying Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-3 md:grid-cols-4">
                    <div>
                      <span className="block font-medium text-muted-foreground">
                        Patient Full Name
                      </span>
                      <span className="font-bold text-foreground">
                        {sheet.fullName || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="block font-medium text-muted-foreground">
                        Hospital No.
                      </span>
                      <span className="font-mono font-bold text-foreground">
                        {sheet.hospitalNo || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="block font-medium text-muted-foreground">
                        MSWD No.
                      </span>
                      <span className="font-mono font-bold text-foreground">
                        {sheet.mswdNo || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="block font-medium text-muted-foreground">
                        Age / Sex
                      </span>
                      <span className="font-semibold text-foreground">
                        {sheet.age !== null ? `${sheet.age} yrs` : "—"}
                        {sheet.sex ? ` · ${sheet.sex}` : ""}
                      </span>
                    </div>
                    <div>
                      <span className="block font-medium text-muted-foreground">
                        Civil Status
                      </span>
                      <span className="font-semibold text-foreground">
                        {sheet.civilStatus || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="block font-medium text-muted-foreground">
                        Date of Birth
                      </span>
                      <span className="font-mono text-foreground">
                        {sheet.birthDate || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="block font-medium text-muted-foreground">
                        Place of Birth
                      </span>
                      <span className="text-foreground">
                        {sheet.placeOfBirth || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="block font-medium text-muted-foreground">
                        PhilHealth No.
                      </span>
                      <span className="font-mono text-foreground">
                        {sheet.philHealthNo || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="block font-medium text-muted-foreground">
                        Educational Attainment
                      </span>
                      <span className="text-foreground">
                        {sheet.educationalAttainment || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="block font-medium text-muted-foreground">
                        Occupation
                      </span>
                      <span className="text-foreground">
                        {sheet.occupation || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="block font-medium text-muted-foreground">
                        Contact Number
                      </span>
                      <span className="font-mono text-foreground">
                        {sheet.contactNo || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="block font-medium text-muted-foreground">
                        Permanent Address
                      </span>
                      <span className="text-foreground">
                        {sheet.permanentAddress || "—"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Section II: Family Composition & Household Income */}
              <Card className="border shadow-2xs">
                <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 p-3.5">
                  <CardTitle className="flex items-center gap-2 text-xs font-bold sm:text-sm">
                    <Users className="size-4 text-primary" />
                    Section II: Family Composition &amp; Income
                  </CardTitle>
                  <div className="text-xs text-muted-foreground">
                    Household Size:{" "}
                    <span className="font-mono font-bold text-foreground">
                      {sheet.householdSize}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/20 text-xs hover:bg-transparent">
                          <TableHead className="font-bold">Full Name</TableHead>
                          <TableHead className="font-bold">
                            Relationship
                          </TableHead>
                          <TableHead className="font-bold">Age / Sex</TableHead>
                          <TableHead className="font-bold">
                            Civil Status
                          </TableHead>
                          <TableHead className="font-bold">
                            Educ. Attainment
                          </TableHead>
                          <TableHead className="font-bold">
                            Occupation
                          </TableHead>
                          <TableHead className="text-right font-bold">
                            Monthly Income
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sheet.familyMembers.length > 0 ? (
                          sheet.familyMembers.map((member) => (
                            <TableRow
                              key={member.key}
                              className="text-xs hover:bg-muted/30"
                            >
                              <TableCell className="font-semibold text-foreground">
                                {member.name}
                              </TableCell>
                              <TableCell>
                                {member.relationship || "—"}
                              </TableCell>
                              <TableCell>
                                {member.age !== null ? `${member.age} yrs` : "—"}
                                {member.sex ? ` · ${member.sex}` : ""}
                              </TableCell>
                              <TableCell>{member.civilStatus || "—"}</TableCell>
                              <TableCell>
                                {member.educationalAttainment || "—"}
                              </TableCell>
                              <TableCell>{member.occupation || "—"}</TableCell>
                              <TableCell className="text-right font-mono font-medium">
                                {formatCurrency(member.monthlyIncome || 0)}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="py-4 text-center text-xs text-muted-foreground"
                            >
                              {sheet.frozen
                                ? "No family members were on file at the intake."
                                : "No family members listed on file."}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="grid grid-cols-1 gap-4 border-t bg-muted/10 p-4 text-xs md:grid-cols-2">
                    <div>
                      <span className="mb-1 block font-bold text-foreground">
                        Other Sources of Income
                      </span>
                      {assessment?.otherIncomeSources &&
                      assessment.otherIncomeSources.length > 0 ? (
                        <ul className="space-y-1">
                          {assessment.otherIncomeSources.map((s, idx) => (
                            <li
                              key={idx}
                              className="flex justify-between text-muted-foreground"
                            >
                              <span>• {s.source}</span>
                              <span className="font-mono font-medium text-foreground">
                                {formatCurrency(Number(s.amount || 0))}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-muted-foreground italic">
                          None recorded
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col items-start justify-center md:items-end">
                      <div className="space-y-1 text-right">
                        <span className="block text-xs text-muted-foreground">
                          Total Family Income
                        </span>
                        <span className="font-mono text-lg font-bold text-primary">
                          {formatCurrency(assessment?.totalFamilyIncome ?? 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Sub-Tab 2: Socio-Economic & Expenses */}
            <TabsContent value="socio-economic" className="mt-0 space-y-4">
              <Card className="border shadow-2xs">
                <CardHeader className="border-b bg-muted/30 p-3.5">
                  <CardTitle className="flex items-center gap-2 text-xs font-bold sm:text-sm">
                    <Home className="size-4 text-primary" />
                    Section III: Socio-Economic Data &amp; Monthly Expenses
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-4">
                  {/* Living Conditions */}
                  <div className="grid grid-cols-1 gap-4 border-b pb-3 text-xs sm:grid-cols-3">
                    <div>
                      <span className="block font-medium text-muted-foreground">
                        House Tenure
                      </span>
                      <span className="font-bold text-foreground">
                        {labelFor(
                          HOUSE_TENURE_OPTIONS,
                          assessment?.houseTenure
                        ) || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="block font-medium text-muted-foreground">
                        Light / Power Source
                      </span>
                      <span className="font-bold text-foreground">
                        {Array.isArray(assessment?.lightSource)
                          ? assessment.lightSource
                              .map(
                                (l) => labelFor(LIGHT_SOURCE_OPTIONS, l) || l
                              )
                              .join(", ")
                          : "—"}
                      </span>
                    </div>
                    <div>
                      <span className="block font-medium text-muted-foreground">
                        Water Source
                      </span>
                      <span className="font-bold text-foreground">
                        {Array.isArray(assessment?.waterSource)
                          ? assessment.waterSource
                              .map(
                                (w) => labelFor(WATER_SOURCE_OPTIONS, w) || w
                              )
                              .join(", ")
                          : "—"}
                      </span>
                    </div>
                  </div>

                  {/* Monthly Expenses Table */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold tracking-wider text-foreground uppercase">
                        Monthly Expense Breakdown (ANNEX B Slots)
                      </span>
                      {totalMonthlyExpenses !== null && (
                        <span className="text-xs text-muted-foreground">
                          Itemised Total:{" "}
                          <strong className="font-mono font-bold text-primary">
                            {formatCurrency(totalMonthlyExpenses)}
                          </strong>
                        </span>
                      )}
                    </div>

                    <div className="overflow-hidden rounded-lg border">
                      <Table className="text-xs">
                        <TableHeader>
                          <TableRow className="bg-muted/40 hover:bg-muted/40">
                            <TableHead className="font-bold text-foreground">
                              Expense Category
                            </TableHead>
                            <TableHead className="w-44 text-right font-bold text-foreground">
                              Monthly Amount
                            </TableHead>
                            <TableHead className="w-28 text-right font-bold text-foreground">
                              Share
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {expenseRows.map((item) => {
                            const percent =
                              totalMonthlyExpenses &&
                              totalMonthlyExpenses > 0 &&
                              item.value !== null &&
                              item.value !== undefined
                                ? (
                                    (item.value / totalMonthlyExpenses) *
                                    100
                                  ).toFixed(1)
                                : null

                            return (
                              <TableRow
                                key={item.key}
                                className="hover:bg-muted/30"
                              >
                                <TableCell className="py-2.5 font-medium text-foreground">
                                  {item.label}
                                </TableCell>
                                <TableCell className="py-2.5 text-right font-mono font-semibold">
                                  {slotText(item.value)}
                                </TableCell>
                                <TableCell className="py-2.5 text-right font-mono text-muted-foreground">
                                  {percent !== null ? (
                                    <div className="flex items-center justify-end gap-2">
                                      <div className="hidden h-1.5 w-12 overflow-hidden rounded-full bg-muted sm:block">
                                        <div
                                          className="h-full rounded-full bg-primary/70"
                                          style={{ width: `${percent}%` }}
                                        />
                                      </div>
                                      <span>{percent}%</span>
                                    </div>
                                  ) : (
                                    "—"
                                  )}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                        <TableFooter className="border-t-2 border-border/80 bg-muted/60 font-bold">
                          <TableRow className="hover:bg-transparent">
                            <TableCell className="py-3 font-bold text-foreground">
                              Itemised Total Monthly Expenses
                            </TableCell>
                            <TableCell className="py-3 text-right font-mono text-sm font-black text-primary">
                              {slotText(totalMonthlyExpenses)}
                            </TableCell>
                            <TableCell className="py-3 text-right font-mono font-bold text-primary">
                              {totalMonthlyExpenses ? "100.0%" : "—"}
                            </TableCell>
                          </TableRow>
                        </TableFooter>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Sub-Tab 3: Assessment & Classification */}
            <TabsContent
              value="assessment-classification"
              className="mt-0 space-y-4"
            >
              {!hasAssessment ? (
                <Card className="space-y-3 border border-dashed p-8 text-center">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                    <HeartHandshake className="size-6 opacity-60" />
                  </div>
                  <div className="mx-auto max-w-sm space-y-1">
                    <h4 className="text-sm font-bold text-foreground">
                      No Assessment Recorded
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      An intake assessment has not yet been conducted for this
                      encounter episode. Record the clinical problems,
                      recommendations, and MSWD classification to complete ANNEX
                      B.
                    </p>
                  </div>
                  {canCreate && (
                    <Button
                      size="sm"
                      onClick={() => setIsIntakeDialogOpen(true)}
                      className="cursor-pointer gap-1.5 text-xs font-semibold"
                    >
                      <Plus className="size-3.5" />
                      Conduct Assessment
                    </Button>
                  )}
                </Card>
              ) : (
                <>
                  {/* Section IV: Final Diagnosis & Medical Needs */}
                  <Card className="border shadow-2xs">
                    <CardHeader className="border-b bg-muted/30 p-3.5">
                      <CardTitle className="flex items-center gap-2 text-xs font-bold sm:text-sm">
                        <Layers className="size-4 text-primary" />
                        Section IV: Final Diagnosis &amp; Medical Needs
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 p-4 text-xs">
                      <div>
                        <span className="block font-medium text-muted-foreground">
                          Final Diagnosis
                        </span>
                        <p className="mt-0.5 leading-relaxed font-medium whitespace-pre-wrap text-foreground">
                          {assessment?.presentingProblem || "—"}
                        </p>
                      </div>

                      {assessment?.problemCategories &&
                        assessment.problemCategories.length > 0 && (
                          <div>
                            <span className="mb-1.5 block font-medium text-muted-foreground">
                              Problem Categories
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {assessment.problemCategories.map((cat) => (
                                <Badge
                                  key={cat}
                                  variant="secondary"
                                  className="text-[11px]"
                                >
                                  {cat}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                      {assessment?.problemSpecify && (
                        <div>
                          <span className="block font-medium text-muted-foreground">
                            Type of Assistance
                          </span>
                          <p className="font-semibold text-foreground">
                            {assessment.problemSpecify}
                          </p>
                        </div>
                      )}

                      {assessment?.medicalHistory && (
                        <div className="border-t pt-2">
                          <span className="block font-medium text-muted-foreground">
                            Medical History
                          </span>
                          <p className="mt-0.5 leading-relaxed whitespace-pre-wrap text-foreground">
                            {assessment.medicalHistory}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Section V: Findings, Recommendation & Fund Source */}
                  <Card className="border shadow-2xs">
                    <CardHeader className="border-b bg-muted/30 p-3.5">
                      <CardTitle className="flex items-center gap-2 text-xs font-bold sm:text-sm">
                        <HeartHandshake className="size-4 text-primary" />
                        Section V: Findings, Recommendation &amp; Assistance
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 p-4 text-xs">
                      <div className="grid grid-cols-1 gap-4 border-b pb-3 sm:grid-cols-2">
                        <div>
                          <span className="block font-medium text-muted-foreground">
                            Mode of Assistance
                          </span>
                          <span className="font-bold text-foreground">
                            {labelFor(
                              modeOptions,
                              assessment?.recommendationMode
                            ) || "—"}
                          </span>
                        </div>
                        <div>
                          <span className="block font-medium text-muted-foreground">
                            Fund Source
                          </span>
                          <span className="font-bold text-foreground">
                            {labelFor(
                              fundSourceOptions,
                              assessment?.fundSource
                            ) || "—"}
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="block font-medium text-muted-foreground">
                          Social Worker Assessment &amp; Recommendation
                        </span>
                        <p className="mt-1 leading-relaxed whitespace-pre-wrap text-foreground">
                          {assessment?.recommendation || "—"}
                        </p>
                      </div>

                      {assessment?.interventionPlan && (
                        <div className="border-t pt-2">
                          <span className="block font-medium text-muted-foreground">
                            Intervention Plan
                          </span>
                          <p className="mt-0.5 leading-relaxed whitespace-pre-wrap text-foreground">
                            {assessment.interventionPlan}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* MSWD Classification Matrix Card */}
                  {assessment && (
                    <MswdClassificationCard assessment={assessment} />
                  )}
                </>
              )}
            </TabsContent>

            {/* Sub-Tab 4: Guarantors on the encounter, shared with its case */}
            <TabsContent value="guarantors" className="mt-0 space-y-4">
              {encounter.transactionId ? (
                <CaseGuarantorsTab
                  patientId={patient.id}
                  transactionId={encounter.transactionId}
                  caseCode={caseData?.caseCode}
                />
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                  This case has no hospital encounter, so it has no guarantors.
                </div>
              )}
            </TabsContent>

            {/* Sub-Tab 5: Print History */}
            <TabsContent value="print-history" className="mt-0 space-y-4">
              <Card className="border shadow-2xs">
                <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 p-3.5">
                  <CardTitle className="flex items-center gap-2 text-xs font-bold sm:text-sm">
                    <Printer className="size-4 text-primary" />
                    Print History for {uisLabel}
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isPrintingDirect}
                    onClick={handleDirectPrint}
                    className="h-7 cursor-pointer gap-1.5 text-xs font-semibold"
                  >
                    {isPrintingDirect ? (
                      <Loader2 className="size-3 animate-spin text-primary" />
                    ) : (
                      <Printer className="size-3" />
                    )}
                    {isPrintingDirect ? "Printing…" : "Print Again"}
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <UisPrintHistoryTable
                    assessmentId={uis.assessmentId}
                    caseId={caseData?.id}
                    emptyAction={
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isPrintingDirect}
                        onClick={handleDirectPrint}
                        className="cursor-pointer gap-1.5 text-xs font-semibold"
                      >
                        {isPrintingDirect ? (
                          <Loader2 className="size-3.5 animate-spin text-primary" />
                        ) : (
                          <Printer className="size-3.5" />
                        )}
                        {hasAssessment
                          ? "Print UIS Now"
                          : "Print Blank Form Now"}
                      </Button>
                    }
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </div>

          {/* Modal Sticky Footer */}
          <div className="flex shrink-0 flex-col items-center justify-between gap-3 border-t border-border/60 bg-muted/25 p-3.5 px-5 sm:flex-row">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1 font-mono">
                <Printer className="size-3 text-muted-foreground" />
                {uis.printCount} {uis.printCount === 1 ? "print" : "prints"}
              </span>
              <span>·</span>
              {uis.ready ? (
                <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-3.5" /> Ready to print
                </span>
              ) : hasAssessment ? (
                <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="size-3.5" /> Missing required
                  sections
                </span>
              ) : (
                <span className="flex items-center gap-1 font-medium text-muted-foreground">
                  <Info className="size-3.5" /> No assessment conducted
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {hasAssessment ? (
                <>
                  {canUpdate && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsIntakeDialogOpen(true)}
                      className="h-8 cursor-pointer gap-1.5 text-xs font-semibold"
                    >
                      <FileEdit className="size-3.5 text-primary" />
                      Assess / Re-Assess
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPreviewDialogOpen(true)}
                    className="h-8 cursor-pointer gap-1.5 text-xs font-semibold"
                  >
                    <Eye className="size-3.5 text-primary" />
                    Preview PDF
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    disabled={isPrintingDirect}
                    onClick={handleDirectPrint}
                    className="h-8 cursor-pointer gap-1.5 text-xs font-semibold shadow-2xs"
                  >
                    {isPrintingDirect ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Printer className="size-3.5" />
                    )}
                    {isPrintingDirect ? "Preparing Print…" : "Print UIS"}
                  </Button>
                </>
              ) : (
                <>
                  {canCreate && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setIsIntakeDialogOpen(true)}
                      className="h-8 cursor-pointer gap-1.5 text-xs font-semibold shadow-2xs"
                    >
                      <Plus className="size-3.5" />
                      Conduct Assessment
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPreviewDialogOpen(true)}
                    className="h-8 cursor-pointer gap-1.5 text-xs font-semibold"
                  >
                    <Eye className="size-3.5 text-primary" />
                    Preview Blank Form
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isPrintingDirect}
                    onClick={handleDirectPrint}
                    className="h-8 cursor-pointer gap-1.5 text-xs font-semibold"
                  >
                    {isPrintingDirect ? (
                      <Loader2 className="size-3.5 animate-spin text-primary" />
                    ) : (
                      <Printer className="size-3.5" />
                    )}
                    {isPrintingDirect ? "Preparing Print…" : "Print Blank Form"}
                  </Button>
                </>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8 cursor-pointer text-xs font-medium"
              >
                Close
              </Button>
            </div>
          </div>
        </Tabs>

        {/* Dialogs */}
        <IntakeAssessmentDialog
          open={isIntakeDialogOpen}
          onOpenChange={setIsIntakeDialogOpen}
          caseId={caseData?.id}
          patientId={patient.id}
          caseCode={caseData?.caseCode}
          patientName={patient.fullName}
          patientFirstName={patient.firstName}
          patientMiddleName={patient.middleName}
          patientLastName={patient.lastName}
          patientAddress={patient.address}
          patientContact={patient.contactNo}
          patientMonthlyIncome={patient.monthlyIncome}
          existingAssessment={assessment}
          transactionId={encounter.transactionId ?? caseData?.transactionId}
          onSuccess={() => {
            setIsIntakeDialogOpen(false)
            queryClient.invalidateQueries({ queryKey: patientUisKeys.all })
            queryClient.invalidateQueries({ queryKey: uisPrintKeys.all })
          }}
        />

        <PrintUisDialog
          open={isPrintDialogOpen}
          onOpenChange={setIsPrintDialogOpen}
          assessmentId={uis.assessmentId}
          caseId={caseData?.id}
          caseCode={caseData?.caseCode}
          patientName={patient.fullName}
          onAssessNeeded={() => {
            setIsPrintDialogOpen(false)
            setIsIntakeDialogOpen(true)
          }}
        />

        <UisPdfPreviewDialog
          open={isPreviewDialogOpen}
          onOpenChange={setIsPreviewDialogOpen}
          assessmentId={uis.assessmentId}
          caseId={caseData?.id}
          caseCode={caseData?.caseCode}
          patientName={patient.fullName}
          hasAssessment={hasAssessment}
          onAssessNeeded={() => {
            setIsPreviewDialogOpen(false)
            setIsIntakeDialogOpen(true)
          }}
        />

        {/* Refresh the frozen §I/§II copy from the patient record */}
        <AlertDialog
          open={isRefreshDialogOpen}
          onOpenChange={setIsRefreshDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <RefreshCw className="size-5 text-primary" />
                Refresh from the patient record?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>
                  Sections I and II of <strong>{uisLabel}</strong> will be
                  replaced with the patient&apos;s identity and family
                  composition as they stand now, and the MSWD classification
                  will be re-derived against the new household size.
                </p>
                <p>
                  Do this when the patient&apos;s details were still being
                  completed after the intake. If the sheet has already been
                  issued, refreshing it means a reprint will no longer match the
                  copy handed over.
                </p>
                {refreshError && (
                  <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
                    {refreshError}
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={refreshSnapshotMutation.isPending}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault()
                  handleRefreshSnapshot()
                }}
                disabled={refreshSnapshotMutation.isPending}
              >
                {refreshSnapshotMutation.isPending ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="size-3.5 animate-spin" />
                    Refreshing…
                  </span>
                ) : (
                  "Refresh sheet"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Confirmation Alert Dialog */}
        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <ShieldAlert className="size-5" />
                Delete Intake Assessment?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>
                  Are you sure you want to delete the intake assessment for{" "}
                  <strong>{uisLabel}</strong>? This action will permanently
                  remove all assessed economic data, problem details, and MSWD
                  classification for this encounter.
                </p>
                {deleteError && (
                  <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
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
                className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
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
      </DialogContent>
    </Dialog>
  )
}
