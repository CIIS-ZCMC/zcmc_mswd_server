import React, { useState, useMemo } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { usePermission } from "@/features/auth/hooks/use-permission"
import { useHospitalEncounters } from "@/features/hospital/hooks/use-hospital-encounters"
import { RegistryStatusBadge } from "@/features/hospital/components/registry-status-badge"
import { HospitalEncounterDetailDialog } from "@/features/hospital/components/dialogs/hospital-encounter-detail-dialog"
import { AssessEncounterDialog } from "@/features/hospital/components/dialogs/assess-encounter-dialog"
import { OpenCaseDialog } from "@/features/cases/components/dialogs/open-case-dialog"
import { formatTransactionType } from "@/features/hospital/lib/transaction-type"
import type { HospitalEncounter } from "@/features/hospital/types"
import {
  AlertCircle,
  Building2,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  FolderPlus,
  MoreHorizontal,
  Printer,
  Search,
  Stethoscope,
  X,
} from "lucide-react"
import {
  EncounterPrintableDialog,
  type PrintableType,
} from "@/features/hospital/components/dialogs/encounter-printable-dialog"
import type { PatientRecord } from "../../types"

interface HospitalEncountersTabProps {
  patient: PatientRecord
}

type StatusFilter = "all" | "active" | "discharged"

export const HospitalEncountersTab: React.FC<HospitalEncountersTabProps> = ({ patient }) => {
  const hospitalNumber = patient.hospitalId
  const canAssess = usePermission("cases.update")
  const canCreateCase = usePermission("cases.create")

  // Data fetching
  const { data: encounters = [], isLoading, error } = useHospitalEncounters(hospitalNumber)

  // Search, Filter & Pagination states
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Dialog states
  const [selectedEncounter, setSelectedEncounter] = useState<HospitalEncounter | null>(null)
  const [initialModalTab, setInitialModalTab] = useState<string>("overview")
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  const [directAssessEncounterId, setDirectAssessEncounterId] = useState<number | null>(null)
  const [directOpenCaseEncounter, setDirectOpenCaseEncounter] = useState<HospitalEncounter | null>(null)

  const [printableEncounter, setPrintableEncounter] = useState<HospitalEncounter | null>(null)
  const [printableType, setPrintableType] = useState<PrintableType>("uis")
  const [isPrintableOpen, setIsPrintableOpen] = useState(false)

  const handleOpenPrint = (enc: HospitalEncounter, type: PrintableType) => {
    setPrintableEncounter(enc)
    setPrintableType(type)
    setIsPrintableOpen(true)
  }

  // Counts for metric summary
  const activeCount = useMemo(
    () => encounters.filter((e) => e.registrationStatus?.code === "A").length,
    [encounters]
  )
  const dischargedCount = useMemo(
    () => encounters.filter((e) => e.registrationStatus?.code === "D" || e.registrationStatus?.code === "M").length,
    [encounters]
  )

  // Filtered & Searched encounters
  const filteredEncounters = useMemo(() => {
    return encounters.filter((enc) => {
      // Status filter
      if (statusFilter === "active" && enc.registrationStatus?.code !== "A") {
        return false
      }
      if (
        statusFilter === "discharged" &&
        enc.registrationStatus?.code !== "D" &&
        enc.registrationStatus?.code !== "M"
      ) {
        return false
      }

      // Search term filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim()
        const idMatch = String(enc.id).toLowerCase().includes(query)
        const typeMatch = (enc.patientTransactionType ?? "").toLowerCase().includes(query)
        const statusMatch = (enc.registrationStatus?.label ?? "").toLowerCase().includes(query)
        const diagMatch = (enc.finalDiagnosis ?? "").toLowerCase().includes(query)
        const diagCodeMatch = (enc.finalDiagnosisCode ?? "").toLowerCase().includes(query)
        const impressionMatch = (enc.impression ?? "").toLowerCase().includes(query)
        const dateMatch = (enc.registrationDate ?? "").toLowerCase().includes(query)

        return idMatch || typeMatch || statusMatch || diagMatch || diagCodeMatch || impressionMatch || dateMatch
      }

      return true
    })
  }, [encounters, statusFilter, searchTerm])

  // Pagination calculation
  const totalPages = Math.ceil(filteredEncounters.length / pageSize) || 1
  const paginatedEncounters = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredEncounters.slice(start, start + pageSize)
  }, [filteredEncounters, currentPage, pageSize])

  // Reset to page 1 on filter or search change
  const handleSearchChange = (val: string) => {
    setSearchTerm(val)
    setCurrentPage(1)
  }

  const handleFilterChange = (filter: StatusFilter) => {
    setStatusFilter(filter)
    setCurrentPage(1)
  }

  const openEncounterDetail = (encounter: HospitalEncounter, tab = "overview") => {
    setSelectedEncounter(encounter)
    setInitialModalTab(tab)
    setIsDetailModalOpen(true)
  }

  if (!hospitalNumber) {
    return (
      <Alert className="border p-4">
        <Building2 className="w-5 h-5 text-primary shrink-0" />
        <AlertTitle className="text-base font-bold">Not linked to a hospital record</AlertTitle>
        <AlertDescription className="text-xs sm:text-sm font-medium leading-relaxed mt-1">
          This patient has no hospital number on file, so no HIS encounters can be shown. Link the patient to a hospital record to view their hospital history here.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      {/* Main Table Card */}
      <Card className="border shadow-2xs">
        <CardHeader className="p-5 pb-4 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-lg sm:text-xl font-extrabold text-foreground flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary shrink-0" />
                Hospital Encounters (HIS)
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm font-medium">
                Hospital transactions and admissions for Hospital No.{" "}
                <span className="font-bold text-foreground">{String(hospitalNumber)}</span>
              </CardDescription>
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-lg border shrink-0">
              <Button
                variant={statusFilter === "all" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleFilterChange("all")}
                className="h-8 px-3 text-xs font-bold"
              >
                All ({encounters.length})
              </Button>
              <Button
                variant={statusFilter === "active" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleFilterChange("active")}
                className="h-8 px-3 text-xs font-bold"
              >
                Active ({activeCount})
              </Button>
              <Button
                variant={statusFilter === "discharged" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleFilterChange("discharged")}
                className="h-8 px-3 text-xs font-bold"
              >
                Discharged ({dischargedCount})
              </Button>
            </div>
          </div>

          {/* Search Bar & Page Size */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by encounter #, type, diagnosis..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 pr-9 h-9 text-xs sm:text-sm"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => handleSearchChange("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-muted-foreground">
              <span>Show</span>
              <select
                aria-label="Encounters per page"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span>per page</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          ) : error ? (
            <div className="p-6">
              <Alert variant="destructive" className="border">
                <AlertCircle className="w-5 h-5" />
                <AlertTitle className="text-base font-bold">Hospital System Unavailable</AlertTitle>
                <AlertDescription className="text-xs sm:text-sm font-medium mt-1">
                  The hospital encounters could not be loaded at this time. Please try again later.
                </AlertDescription>
              </Alert>
            </div>
          ) : filteredEncounters.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-2">
              <Filter className="size-8 text-muted-foreground/40 mx-auto" />
              <h4 className="text-sm font-bold text-foreground">No Hospital Encounters Found</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {searchTerm || statusFilter !== "all"
                  ? "No encounters matched your search query or filter criteria. Try clearing filters."
                  : "No hospital transactions or admission records on file for this patient."}
              </p>
              {(searchTerm || statusFilter !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("")
                    setStatusFilter("all")
                  }}
                  className="mt-2 text-xs font-bold"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-[180px] text-xs font-bold text-foreground">Date & Encounter</TableHead>
                    <TableHead className="w-[150px] text-xs font-bold text-foreground">Transaction Type</TableHead>
                    <TableHead className="w-[140px] text-xs font-bold text-foreground">Registry Status</TableHead>
                    <TableHead className="min-w-[200px] text-xs font-bold text-foreground">Diagnosis / Impression</TableHead>
                    <TableHead className="w-[160px] text-xs font-bold text-foreground text-right pr-5">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEncounters.map((enc) => {
                    const diagnosisText =
                      enc.finalDiagnosis || enc.impression || enc.dischargeDiagnosis || "No diagnosis logged in HIS"

                    return (
                      <TableRow
                        key={enc.id}
                        className="hover:bg-muted/30 transition-colors group cursor-pointer"
                        onClick={() => openEncounterDetail(enc)}
                      >
                        <TableCell className="py-3.5">
                          <div className="space-y-0.5">
                            <span className="font-extrabold text-sm text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                              <Calendar className="size-3.5 text-primary/80 shrink-0" />
                              {enc.registrationDate ?? "—"}
                            </span>
                            <span className="text-xs text-muted-foreground font-medium">
                              #{enc.id}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="py-3.5">
                          <span className="bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full text-xs font-semibold inline-block">
                            {formatTransactionType(enc.patientTransactionType)}
                          </span>
                        </TableCell>

                        <TableCell className="py-3.5">
                          <RegistryStatusBadge status={enc.registrationStatus} />
                        </TableCell>

                        <TableCell className="py-3.5">
                          <p
                            className="text-xs sm:text-sm font-medium text-muted-foreground line-clamp-2 leading-relaxed"
                            title={diagnosisText}
                          >
                            {diagnosisText}
                          </p>
                        </TableCell>

                        <TableCell
                          className="py-3.5 text-right pr-5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => openEncounterDetail(enc)}
                              className="h-8 px-3 text-xs font-bold gap-1.5 shadow-2xs border hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
                            >
                              <Eye className="size-3.5" />
                              View
                            </Button>

                            {/* Print Dropdown Action Button */}
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                className="inline-flex items-center justify-center h-8 px-2.5 rounded-md border border-input bg-background shadow-2xs hover:bg-muted text-xs font-bold gap-1.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                                aria-label={`Print documents for encounter #${enc.id}`}
                              >
                                <Printer className="size-3.5 text-primary" />
                                <span>Print</span>
                                <ChevronDown className="size-3 text-muted-foreground" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-60 p-1.5">
                                <DropdownMenuGroup>
                                  <DropdownMenuLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                    Encounter #{enc.id} Printables
                                  </DropdownMenuLabel>
                                </DropdownMenuGroup>
                                <DropdownMenuItem
                                  onClick={() => handleOpenPrint(enc, "uis")}
                                  className="cursor-pointer gap-2 py-1.5 text-xs font-semibold"
                                >
                                  <FileText className="size-3.5 text-primary" />
                                  Unified Intake Sheet (UIS)
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleOpenPrint(enc, "maifip")}
                                  className="cursor-pointer gap-2 py-1.5 text-xs font-semibold"
                                >
                                  <FileCheck2 className="size-3.5 text-primary" />
                                  Acknowledgement Slip (MAIFIP)
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleOpenPrint(enc, "cga")}
                                  className="cursor-pointer gap-2 py-1.5 text-xs font-semibold"
                                >
                                  <Building2 className="size-3.5 text-primary" />
                                  City Mayor Assistance (CGA)
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>

                            <DropdownMenu>
                              <DropdownMenuTrigger
                                className="inline-flex items-center justify-center size-8 p-0 rounded-md border border-input bg-background shadow-2xs hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                                aria-label={`Actions for encounter #${enc.id}`}
                              >
                                <MoreHorizontal className="size-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56 p-1.5">
                                <DropdownMenuGroup>
                                  <DropdownMenuLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                    Encounter #{enc.id}
                                  </DropdownMenuLabel>
                                </DropdownMenuGroup>
                                <DropdownMenuItem
                                  onClick={() => openEncounterDetail(enc, "overview")}
                                  className="cursor-pointer gap-2 py-1.5 text-xs font-semibold"
                                >
                                  <Stethoscope className="size-3.5 text-primary" />
                                  Clinical Overview
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => openEncounterDetail(enc, "clinical")}
                                  className="cursor-pointer gap-2 py-1.5 text-xs font-semibold"
                                >
                                  <FileText className="size-3.5 text-primary" />
                                  Diagnosis & Discharge
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => openEncounterDetail(enc, "financial")}
                                  className="cursor-pointer gap-2 py-1.5 text-xs font-semibold"
                                >
                                  <CreditCard className="size-3.5 text-primary" />
                                  Guarantors & Billing
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => openEncounterDetail(enc, "mswd")}
                                  className="cursor-pointer gap-2 py-1.5 text-xs font-semibold"
                                >
                                  <FileCheck2 className="size-3.5 text-primary" />
                                  MSWD & UIS Intake
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />

                                <DropdownMenuItem
                                  onClick={() => handleOpenPrint(enc, "uis")}
                                  className="cursor-pointer gap-2 py-1.5 text-xs font-semibold"
                                >
                                  <Printer className="size-3.5 text-primary" />
                                  Print Documents…
                                </DropdownMenuItem>

                                {(canAssess || canCreateCase) && <DropdownMenuSeparator />}

                                {canAssess && (
                                  <DropdownMenuItem
                                    onClick={() => setDirectAssessEncounterId(enc.id)}
                                    className="cursor-pointer gap-2 py-1.5 text-xs font-bold text-primary focus:text-primary"
                                  >
                                    <ClipboardCheck className="size-3.5" />
                                    Assess Encounter
                                  </DropdownMenuItem>
                                )}

                                {canCreateCase && (
                                  <DropdownMenuItem
                                    onClick={() => setDirectOpenCaseEncounter(enc)}
                                    className="cursor-pointer gap-2 py-1.5 text-xs font-bold"
                                  >
                                    <FolderPlus className="size-3.5 text-primary" />
                                    Open Case for Encounter
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>

        {/* Pagination Footer */}
        {!isLoading && !error && filteredEncounters.length > 0 && (
          <div className="p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/20">
            <div className="text-xs text-muted-foreground font-medium">
              Showing <strong className="text-foreground">{(currentPage - 1) * pageSize + 1}</strong> to{" "}
              <strong className="text-foreground">
                {Math.min(currentPage * pageSize, filteredEncounters.length)}
              </strong>{" "}
              of <strong className="text-foreground">{filteredEncounters.length}</strong> encounters
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="h-8 px-2.5 text-xs font-bold gap-1"
              >
                <ChevronLeft className="size-3.5" />
                Previous
              </Button>

              <span className="text-xs font-semibold px-2 text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="h-8 px-2.5 text-xs font-bold gap-1"
              >
                Next
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Encounter Detail Modal */}
      <HospitalEncounterDetailDialog
        encounter={selectedEncounter}
        patient={patient}
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
        canAssess={canAssess}
        canCreateCase={canCreateCase}
        initialTab={initialModalTab}
      />

      {/* Direct Assess Dialog from row action */}
      {directAssessEncounterId && (
        <AssessEncounterDialog
          encounterId={directAssessEncounterId}
          hospitalNumber={patient.hospitalId}
          open={Boolean(directAssessEncounterId)}
          onOpenChange={(open) => !open && setDirectAssessEncounterId(null)}
        />
      )}

      {/* Direct Open Case Dialog from row action */}
      {directOpenCaseEncounter && (
        <OpenCaseDialog
          open={Boolean(directOpenCaseEncounter)}
          onOpenChange={(open) => !open && setDirectOpenCaseEncounter(null)}
          patientId={patient.id}
          patientName={patient.fullName}
          hospitalNumber={patient.hospitalNo}
          transactionId={directOpenCaseEncounter.id}
          transactionType={directOpenCaseEncounter.patientTransactionType ?? undefined}
          onCaseOpened={() => setDirectOpenCaseEncounter(null)}
        />
      )}

      {/* Printable Dialog (UIS, MAIFIP, CGA) */}
      <EncounterPrintableDialog
        open={isPrintableOpen}
        onOpenChange={setIsPrintableOpen}
        type={printableType}
        encounter={printableEncounter}
        patient={patient}
        caseId={patient.latestCaseId}
        onOpenCaseNeeded={() => {
          if (printableEncounter) {
            setDirectOpenCaseEncounter(printableEncounter)
          }
        }}
      />
    </div>
  )
}
