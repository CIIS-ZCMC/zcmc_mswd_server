import React, { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "@/lib/inertia-router-hooks"
import { usePatientUis } from "@/features/cases/hooks/use-uis-prints"
import { usePermission } from "@/features/auth/hooks/use-permission"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { UisSheet } from "../uis-sheet"
import { NewIntakeAssessmentDialog } from "@/features/cases/components/dialogs/new-intake-assessment-dialog"
import { formatCurrency } from "@/lib/format-currency"
import { formatTransactionType } from "@/features/hospital/lib/transaction-type"
import {
  getBracketColor,
  getClassificationBadgeText,
} from "@/features/cases/lib/classification"
import type { PatientRecord } from "../../types/patient.types"
import type { PatientUisRow } from "@/features/cases/types/uis.types"
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ClipboardPlus,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileCheck2,
  FileEdit,
  FileText,
  FolderPlus,
  Lock,
  MoreHorizontal,
  Plus,
  Printer,
  Search,
  X,
} from "lucide-react"

interface UisTabProps {
  patient: PatientRecord
  /** Open a case, optionally on the given HIS encounter. */
  onOpenCaseNeeded?: (transactionId?: number | null) => void
}

/** How a row is named: its case, else its encounter. */
const rowLabel = (row: PatientUisRow) =>
  row.case?.caseCode ??
  (row.encounter.transactionId
    ? `Encounter #${row.encounter.transactionId}`
    : "Intake")

type StatusFilter = "all" | "ready" | "missing" | "unassessed"

export const UisTab: React.FC<UisTabProps> = ({
  patient,
  onOpenCaseNeeded,
}) => {
  const canView = usePermission("intake.view")
  const canCreateCase = usePermission("cases.create")
  const canCreateAssessment = usePermission("cases.create")
  const canUpdateAssessment = usePermission("cases.update")
  const [searchParams, setSearchParams] = useSearchParams()

  const { data: rows = [], isLoading, error } = usePatientUis(patient.id)

  // ?uis=<row key> opens a sheet; the older ?case=<id> links still work.
  const caseParam = searchParams.get("case")
  const uisParam =
    searchParams.get("uis") ?? (caseParam ? `case-${caseParam}` : null)
  const [selectedKey, setSelectedKey] = useState<string | null>(uisParam)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(Boolean(uisParam))
  const [isNewIntakeOpen, setIsNewIntakeOpen] = useState(false)
  const [initialAssessOpen, setInitialAssessOpen] = useState<boolean>(false)
  const [initialPrintOpen, setInitialPrintOpen] = useState<boolean>(false)

  // Search, Filter & Pagination state
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Keep modal open/close synchronized if searchParams change externally
  useEffect(() => {
    if (uisParam) {
      setSelectedKey(uisParam)
      setIsModalOpen(true)
    }
  }, [uisParam])

  // Reset pagination when search or status filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, pageSize])

  // Quick stats summary
  const stats = useMemo(() => {
    const totalEpisodes = rows.length
    const readyToPrint = rows.filter((r) => r.uis.ready).length
    const incomplete = rows.filter(
      (r) => !r.uis.ready && r.uis.hasAssessment
    ).length
    const unassessed = rows.filter((r) => !r.uis.hasAssessment).length
    const totalPrints = rows.reduce(
      (sum, r) => sum + (r.uis.printCount || 0),
      0
    )
    return { totalEpisodes, readyToPrint, incomplete, unassessed, totalPrints }
  }, [rows])

  // Selected row for sheet view modal
  const selectedRow = useMemo<PatientUisRow | null>(() => {
    if (!rows || rows.length === 0 || !selectedKey) return null
    return (
      rows.find(
        (r) =>
          r.key === selectedKey ||
          (r.case !== null && `case-${r.case.id}` === selectedKey)
      ) || null
    )
  }, [rows, selectedKey])

  // One intake per encounter: these cannot take a new one.
  const assessedTransactionIds = useMemo(
    () =>
      rows
        .filter((r) => r.uis.hasAssessment && r.encounter.transactionId)
        .map((r) => r.encounter.transactionId as number),
    [rows]
  )

  // Filtered rows for table view
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      // 1. Search filter (case code, transaction type, classification)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim()
        const codeMatch = rowLabel(row).toLowerCase().includes(query)
        const typeMatch = formatTransactionType(row.encounter.transactionType)
          .toLowerCase()
          .includes(query)
        const classMatch = (
          row.uis.classification?.classification ||
          row.uis.classification?.calculatedClassification ||
          row.uis.assessment?.classification ||
          ""
        )
          .toLowerCase()
          .includes(query)

        if (!codeMatch && !typeMatch && !classMatch) return false
      }

      // 2. Status filter
      if (statusFilter === "ready") {
        if (!row.uis.ready) return false
      } else if (statusFilter === "missing") {
        if (row.uis.ready || !row.uis.hasAssessment) return false
      } else if (statusFilter === "unassessed") {
        if (row.uis.hasAssessment) return false
      }

      return true
    })
  }, [rows, searchTerm, statusFilter])

  // Paginated rows
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, currentPage, pageSize])

  const handleOpenSheetModal = (
    row: PatientUisRow,
    assessOpen = false,
    printOpen = false
  ) => {
    setSelectedKey(row.key)
    setInitialAssessOpen(assessOpen)
    setInitialPrintOpen(printOpen)
    setIsModalOpen(true)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete("case")
        next.set("uis", row.key)
        return next
      },
      { replace: true }
    )
  }

  const handleCloseModal = (open: boolean) => {
    setIsModalOpen(open)
    if (!open) {
      setInitialAssessOpen(false)
      setInitialPrintOpen(false)
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete("case")
          next.delete("uis")
          return next
        },
        { replace: true }
      )
    }
  }

  if (!canView) {
    return (
      <Card className="border shadow-none">
        <CardContent className="space-y-2 p-8 text-center">
          <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Lock className="size-5" />
          </div>
          <div className="text-sm font-semibold text-foreground">
            Access Restricted
          </div>
          <p className="mx-auto max-w-sm text-xs text-muted-foreground">
            You do not have permission to view Unified Intake Sheets (ANNEX B).
            Please contact an administrator if you need access.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <Skeleton className="h-10 w-64 rounded-lg" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className="border">
        <AlertCircle className="size-4" />
        <AlertTitle>Failed to load Unified Intake Sheets</AlertTitle>
        <AlertDescription className="text-xs">
          {error instanceof Error
            ? error.message
            : "An unexpected network error occurred."}
        </AlertDescription>
      </Alert>
    )
  }

  const newIntakeDialog = (
    <NewIntakeAssessmentDialog
      open={isNewIntakeOpen}
      onOpenChange={setIsNewIntakeOpen}
      patient={patient}
      assessedTransactionIds={assessedTransactionIds}
    />
  )

  if (rows.length === 0) {
    return (
      <Card className="space-y-4 border border-dashed border-border/80 p-8 text-center shadow-none sm:p-12">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <ClipboardPlus className="size-7 opacity-70" />
        </div>
        <div className="mx-auto max-w-md space-y-1.5">
          <h3 className="text-base font-bold text-foreground sm:text-lg">
            No Intake Assessments Yet
          </h3>
          <p className="text-xs text-muted-foreground sm:text-sm">
            A Unified Intake Sheet (ANNEX B) is the intake assessment of one
            hospital encounter. Take one for this patient&apos;s encounter; no
            case is needed.
          </p>
        </div>
        {canCreateAssessment && (
          <div className="pt-2">
            <Button
              onClick={() => setIsNewIntakeOpen(true)}
              className="cursor-pointer gap-2 text-xs font-semibold"
            >
              <ClipboardPlus className="size-4" />
              New Intake Assessment
            </Button>
          </div>
        )}
        {newIntakeDialog}
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Metric KPI Summary Cards with Quick Filter functionality */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Total Episodes */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setStatusFilter("all")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              setStatusFilter("all")
            }
          }}
          className={`cursor-pointer rounded-xl border p-3.5 transition-all duration-150 ${
            statusFilter === "all"
              ? "border-primary/60 bg-card shadow-xs ring-1 ring-primary/30"
              : "border-border/80 bg-card/70 hover:border-border hover:bg-card"
          }`}
        >
          <div className="mb-1 flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold tracking-wider uppercase">
              All Intakes
            </span>
            <FileText className="size-4 text-primary" />
          </div>
          <div className="font-mono text-xl font-bold text-foreground">
            {stats.totalEpisodes}
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            {stats.totalEpisodes === 1
              ? "Hospital encounter"
              : "Hospital encounters"}
          </div>
        </div>

        {/* Ready to Print */}
        <div
          role="button"
          tabIndex={0}
          onClick={() =>
            setStatusFilter(statusFilter === "ready" ? "all" : "ready")
          }
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              setStatusFilter(statusFilter === "ready" ? "all" : "ready")
            }
          }}
          className={`cursor-pointer rounded-xl border p-3.5 transition-all duration-150 ${
            statusFilter === "ready"
              ? "border-emerald-500/60 bg-emerald-500/10 shadow-xs ring-1 ring-emerald-500/30"
              : "border-border/80 bg-card/70 hover:border-border hover:bg-card"
          }`}
        >
          <div className="mb-1 flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold tracking-wider text-emerald-600 uppercase dark:text-emerald-400">
              Ready to Print
            </span>
            <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="font-mono text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats.readyToPrint}
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            ANNEX B complete
          </div>
        </div>

        {/* Incomplete / Missing Info */}
        <div
          role="button"
          tabIndex={0}
          onClick={() =>
            setStatusFilter(statusFilter === "missing" ? "all" : "missing")
          }
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              setStatusFilter(statusFilter === "missing" ? "all" : "missing")
            }
          }}
          className={`cursor-pointer rounded-xl border p-3.5 transition-all duration-150 ${
            statusFilter === "missing"
              ? "border-amber-500/60 bg-amber-500/10 shadow-xs ring-1 ring-amber-500/30"
              : "border-border/80 bg-card/70 hover:border-border hover:bg-card"
          }`}
        >
          <div className="mb-1 flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold tracking-wider text-amber-600 uppercase dark:text-amber-400">
              Needs Attention
            </span>
            <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="font-mono text-xl font-bold text-amber-600 dark:text-amber-400">
            {stats.incomplete + stats.unassessed}
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            {stats.incomplete} missing · {stats.unassessed} unassessed
          </div>
        </div>

        {/* Total Printed */}
        <div className="rounded-xl border border-border/80 bg-card/70 p-3.5">
          <div className="mb-1 flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold tracking-wider uppercase">
              Total Prints
            </span>
            <Printer className="size-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="font-mono text-xl font-bold text-foreground">
            {stats.totalPrints}
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            ANNEX B copies printed
          </div>
        </div>
      </div>

      {/* Table Card View */}
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="flex flex-col justify-between gap-4 border-b border-border/50 p-4 sm:p-5 md:flex-row md:items-center">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-bold sm:text-lg">
              <FileCheck2 className="size-5 text-primary" />
              Unified Intake Sheets (ANNEX B)
              <Badge
                variant="secondary"
                className="ml-1 px-2 py-0.5 font-mono text-xs font-bold"
              >
                {rows.length} {rows.length === 1 ? "encounter" : "encounters"}
              </Badge>
            </CardTitle>
            <CardDescription className="mt-1 text-xs text-muted-foreground">
              Intake assessments of each hospital encounter, with or without a
              case: MSWD classification, guarantors and printable ANNEX B forms.
            </CardDescription>
          </div>

          {/* Search, Filter and Actions Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative w-full sm:w-60">
              <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search case, encounter, type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 w-full pl-8 text-xs"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
                  title="Clear search"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>

            <div className="w-36">
              <Select
                value={statusFilter}
                onValueChange={(val) => setStatusFilter(val as StatusFilter)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    All Status ({rows.length})
                  </SelectItem>
                  <SelectItem value="ready" className="text-xs">
                    Ready to Print ({stats.readyToPrint})
                  </SelectItem>
                  <SelectItem value="missing" className="text-xs">
                    Missing Info ({stats.incomplete})
                  </SelectItem>
                  <SelectItem value="unassessed" className="text-xs">
                    Unassessed ({stats.unassessed})
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {canCreateAssessment && (
              <Button
                size="sm"
                onClick={() => setIsNewIntakeOpen(true)}
                className="h-9 cursor-pointer gap-1.5 text-xs font-semibold"
              >
                <ClipboardPlus className="size-3.5" />
                New Intake Assessment
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="text-xs">
              <TableHeader>
                <TableRow className="border-b border-border/60 bg-muted/40 hover:bg-muted/40">
                  <TableHead className="py-3.5 pl-4 font-bold text-foreground">
                    Encounter
                  </TableHead>
                  <TableHead className="py-3.5 font-bold text-foreground">
                    Case
                  </TableHead>
                  <TableHead className="py-3.5 font-bold text-foreground">
                    MSWD Classification
                  </TableHead>
                  <TableHead className="py-3.5 font-bold text-foreground">
                    Assessment &amp; Status
                  </TableHead>
                  <TableHead className="py-3.5 text-right font-bold text-foreground">
                    Guarantors
                  </TableHead>
                  <TableHead className="py-3.5 text-center font-bold text-foreground">
                    Prints
                  </TableHead>
                  <TableHead className="py-3.5 pr-4 text-right font-bold text-foreground">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="space-y-2 py-12 text-center text-muted-foreground"
                    >
                      <p className="text-sm font-medium">
                        No intake sheets match your criteria.
                      </p>
                      {searchTerm || statusFilter !== "all" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearchTerm("")
                            setStatusFilter("all")
                          }}
                          className="h-8 cursor-pointer text-xs"
                        >
                          Clear filters
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRows.map((row) => {
                    const encounterDate =
                      row.encounter.date ?? row.case?.dateOpened ?? null
                    const dateStr = encounterDate
                      ? new Date(encounterDate).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "—"
                    const typeStr = formatTransactionType(
                      row.encounter.transactionType ?? row.case?.transactionType
                    )
                    const classCode =
                      row.uis.classification?.classification ||
                      row.uis.classification?.calculatedClassification ||
                      row.uis.assessment?.classification ||
                      null

                    return (
                      <TableRow
                        key={row.key}
                        className="group cursor-pointer transition-colors hover:bg-muted/40"
                        onClick={() => handleOpenSheetModal(row)}
                      >
                        {/* Encounter: type and date */}
                        <TableCell className="py-3.5 pl-4">
                          <div className="font-medium text-foreground group-hover:underline">
                            {typeStr}
                          </div>
                          <div className="font-mono text-[11px] text-muted-foreground">
                            {dateStr}
                            {row.encounter.transactionId
                              ? ` · #${row.encounter.transactionId}`
                              : ""}
                          </div>
                        </TableCell>

                        {/* Case, if one was opened on the encounter */}
                        <TableCell className="py-3.5 font-mono text-xs font-bold">
                          {row.case ? (
                            <div className="flex items-center gap-2">
                              <span className="text-primary">
                                {row.case.caseCode}
                              </span>
                              {row.uis.hasSocialCase && (
                                <Badge
                                  variant="outline"
                                  className="gap-0.5 bg-muted px-1 py-0 text-[10px] text-muted-foreground"
                                >
                                  <Lock className="size-2.5" /> SCSR
                                </Badge>
                              )}
                            </div>
                          ) : onOpenCaseNeeded && canCreateCase ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                onOpenCaseNeeded(row.encounter.transactionId)
                              }}
                              className="h-7 cursor-pointer gap-1 px-2 font-sans text-xs font-medium text-muted-foreground hover:text-foreground"
                            >
                              <FolderPlus className="size-3.5 text-primary" />
                              Open Case
                            </Button>
                          ) : (
                            <span className="font-sans font-normal text-muted-foreground">
                              No case
                            </span>
                          )}
                        </TableCell>

                        {/* MSWD Classification */}
                        <TableCell className="py-3.5">
                          {row.uis.hasAssessment ? (
                            <Badge
                              className={`px-2 py-0.5 text-[11px] font-bold uppercase ${getBracketColor(
                                classCode
                              )}`}
                            >
                              {getClassificationBadgeText(classCode)}
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="px-2 py-0.5 text-[11px] text-muted-foreground"
                            >
                              Unassessed
                            </Badge>
                          )}
                        </TableCell>

                        {/* Assessment & Readiness Status */}
                        <TableCell className="py-3.5">
                          {row.uis.ready ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="size-3.5 shrink-0" />
                              Ready to print (ANNEX B complete)
                            </span>
                          ) : row.uis.hasAssessment ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                              <AlertTriangle className="size-3.5 shrink-0" />
                              {row.uis.missing.length} missing section(s)
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              No assessment conducted
                            </span>
                          )}
                        </TableCell>

                        {/* Guarantors on the encounter */}
                        <TableCell className="py-3.5 text-right font-mono">
                          {row.guarantees.count > 0 ? (
                            <span className="font-semibold text-foreground">
                              {formatCurrency(row.guarantees.total)}
                              <span className="ml-1 font-sans text-[11px] font-normal text-muted-foreground">
                                ({row.guarantees.count})
                              </span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground/60">—</span>
                          )}
                        </TableCell>

                        {/* Print Count */}
                        <TableCell className="py-3.5 text-center font-mono">
                          {row.uis.printCount > 0 ? (
                            <Badge
                              variant="secondary"
                              className="gap-1 font-mono text-xs font-bold"
                            >
                              <Printer className="size-3" />
                              {row.uis.printCount}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground/60">—</span>
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell
                          className="py-3.5 pr-4 text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Primary View Sheet Button (Opens Sub-Tabs Modal) */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenSheetModal(row)}
                              className="h-8 cursor-pointer gap-1.5 px-2.5 text-xs font-semibold"
                            >
                              <Eye className="size-3.5 text-primary" />
                              View Details
                            </Button>

                            {/* Quick Action Button */}
                            {row.uis.hasAssessment ? (
                              <>
                                {canUpdateAssessment && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleOpenSheetModal(row, true, false)
                                    }
                                    className="hidden h-8 cursor-pointer gap-1 px-2 text-xs font-medium text-muted-foreground hover:text-foreground sm:inline-flex"
                                    title="Assess / Re-Assess"
                                  >
                                    <FileEdit className="size-3.5 text-primary" />
                                    <span className="hidden md:inline">
                                      Assess / Re-Assess
                                    </span>
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleOpenSheetModal(row, false, true)
                                  }
                                  className="hidden h-8 cursor-pointer gap-1 px-2 text-xs font-medium text-muted-foreground hover:text-foreground sm:inline-flex"
                                  title="Print UIS"
                                >
                                  <Printer className="size-3.5" />
                                  <span className="hidden md:inline">
                                    Print
                                  </span>
                                </Button>
                              </>
                            ) : (
                              canCreateAssessment && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleOpenSheetModal(row, true, false)
                                  }
                                  className="hidden h-8 cursor-pointer gap-1 px-2 text-xs font-medium text-muted-foreground hover:text-foreground sm:inline-flex"
                                  title="Conduct Assessment"
                                >
                                  <Plus className="size-3.5 text-primary" />
                                  <span className="hidden md:inline">
                                    Assess
                                  </span>
                                </Button>
                              )
                            )}

                            {/* Overflow Menu */}
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md p-0 text-muted-foreground hover:bg-muted hover:text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                                aria-label={`Actions for ${rowLabel(row)}`}
                              >
                                <MoreHorizontal className="size-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-52 text-xs"
                              >
                                <DropdownMenuLabel className="text-[11px] font-bold text-muted-foreground">
                                  Actions for {rowLabel(row)}
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />

                                <DropdownMenuItem
                                  onClick={() => handleOpenSheetModal(row)}
                                  className="cursor-pointer gap-2 font-medium"
                                >
                                  <Eye className="size-3.5 text-primary" />
                                  View Details (Modal)
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() =>
                                    handleOpenSheetModal(row, true, false)
                                  }
                                  className="cursor-pointer gap-2"
                                >
                                  {row.uis.hasAssessment ? (
                                    <>
                                      <FileEdit className="size-3.5 text-primary" />
                                      Assess / Re-Assess
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="size-3.5 text-primary" />
                                      Conduct Assessment
                                    </>
                                  )}
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() =>
                                    handleOpenSheetModal(row, false, true)
                                  }
                                  className="cursor-pointer gap-2"
                                >
                                  <Printer className="size-3.5" />
                                  {row.uis.hasAssessment
                                    ? "Print UIS Form"
                                    : "Print Blank Form"}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {filteredRows.length > 0 && (
            <div className="flex flex-col items-center justify-between gap-3 border-t border-border/60 bg-muted/15 p-3.5 text-xs text-muted-foreground sm:flex-row sm:px-5">
              <div>
                Showing{" "}
                <strong className="text-foreground">
                  {(currentPage - 1) * pageSize + 1}
                </strong>{" "}
                to{" "}
                <strong className="text-foreground">
                  {Math.min(currentPage * pageSize, filteredRows.length)}
                </strong>{" "}
                of{" "}
                <strong className="text-foreground">
                  {filteredRows.length}
                </strong>{" "}
                encounters
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px]">Rows per page:</span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(val) => {
                      setPageSize(Number(val))
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className="h-7 w-16 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5" className="text-xs">
                        5
                      </SelectItem>
                      <SelectItem value="10" className="text-xs">
                        10
                      </SelectItem>
                      <SelectItem value="20" className="text-xs">
                        20
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="size-7 cursor-pointer p-0 disabled:cursor-not-allowed"
                    title="Previous page"
                  >
                    <ChevronLeft className="size-3.5" />
                  </Button>
                  <span className="px-1 font-mono text-xs">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage >= totalPages}
                    className="size-7 cursor-pointer p-0 disabled:cursor-not-allowed"
                    title="Next page"
                  >
                    <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {newIntakeDialog}

      {/* Unified Intake Sheet Modal with 5 Sub-Tabs */}
      {selectedRow && (
        <UisSheet
          open={isModalOpen}
          onOpenChange={handleCloseModal}
          row={selectedRow}
          patient={patient}
          initialAssessOpen={initialAssessOpen}
          initialPrintOpen={initialPrintOpen}
        />
      )}
    </div>
  )
}
