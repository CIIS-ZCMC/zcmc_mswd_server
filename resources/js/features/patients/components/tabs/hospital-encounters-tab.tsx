import React, { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { usePermission } from "@/features/auth/hooks/use-permission"
import { useHospitalEncounters } from "@/features/hospital/hooks/use-hospital-encounters"
import { RegistryStatusBadge } from "@/features/hospital/components/registry-status-badge"
import { HospitalEncounterDetailDialog } from "@/features/hospital/components/dialogs/hospital-encounter-detail-dialog"
import { AssessEncounterDialog } from "@/features/hospital/components/dialogs/assess-encounter-dialog"
import { OpenCaseDialog } from "@/features/cases/components/dialogs/open-case-dialog"
import {
  EncounterPrintableDialog,
  type PrintableType,
} from "@/features/hospital/components/dialogs/encounter-printable-dialog"
import type { HospitalEncounter } from "@/features/hospital/types"
import type { PatientRecord } from "../../types"
import {
  AlertCircle,
  BadgeCheck,
  Building2,
  ChevronDown,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  Printer,
  Search,
  X,
} from "lucide-react"

interface HospitalEncountersTabProps {
  patient: PatientRecord
}

type StatusFilter = "all" | "active" | "discharged"

function formatEncounterDateTime(dateStr?: string | null): string {
  if (!dateStr) return "—"
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ]
    const month = monthNames[d.getMonth()]
    const day = d.getDate()
    const year = d.getFullYear()
    let hours = d.getHours()
    const minutes = d.getMinutes().toString().padStart(2, "0")
    const ampm = hours >= 12 ? "PM" : "AM"
    hours = hours % 12 || 12
    return `${month} ${day}, ${year} · ${hours}:${minutes} ${ampm}`
  } catch {
    return dateStr
  }
}

function formatShortTransactionType(type?: string | null): string {
  if (!type || type.trim() === "") return "Outpatient"
  const upper = type.trim().toUpperCase()
  if (upper.includes("IN") || upper.includes("ADM") || upper === "I" || upper === "IPD") return "Inpatient"
  if (upper.includes("ER") || upper.includes("EMERG") || upper === "E") return "Emergency"
  if (upper.includes("OUT") || upper === "O" || upper === "OPD") return "Outpatient"
  if (upper.includes("DIAL") || upper === "HD") return "Hemodialysis"
  return type
}

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
    () =>
      encounters.filter(
        (e) => e.registrationStatus?.code === "D" || e.registrationStatus?.code === "M"
      ).length,
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

        return (
          idMatch ||
          typeMatch ||
          statusMatch ||
          diagMatch ||
          diagCodeMatch ||
          impressionMatch ||
          dateMatch
        )
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
      <div className="rounded-[16px] border border-[#e4e9f2] bg-white p-6 shadow-xs dark:border-border dark:bg-card">
        <div className="flex items-start gap-4">
          <div className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-[#edf3fe] dark:bg-muted">
            <Building2 className="size-[20px] text-[#1f5fd6]" />
          </div>
          <div>
            <h3 className="text-[16px] font-bold text-[#0c2a5b] dark:text-foreground">
              Not linked to a hospital record
            </h3>
            <p className="mt-1 text-[13px] font-medium leading-relaxed text-[#5b6678] dark:text-muted-foreground">
              This patient has no hospital number on file, so no HIS encounters can be shown. Link the patient to a hospital record to view their hospital history here.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 font-[Plus_Jakarta_Sans,sans-serif]">
      {/* Main Section Card */}
      <div className="relative flex w-full flex-col items-center overflow-hidden rounded-[16px] border border-[#e4e9f2] bg-white shadow-[0px_1px_2px_0px_rgba(12,42,91,0.04),0px_2px_6px_0px_rgba(12,42,91,0.05)] dark:border-border dark:bg-card">
        {/* Top Header Row */}
        <div className="flex w-full items-center justify-between gap-[12px] px-[24px] pt-[18px] pb-[14px]">
          <div className="flex items-center gap-[12px]">
            <div className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-[#edf3fe] dark:bg-muted">
              <img
                src="/images/patient-registry/tab-encounters.svg"
                alt=""
                className="size-[20px]"
              />
            </div>
            <div className="flex flex-col items-start min-w-0">
              <h2 className="text-[16px] font-bold leading-tight text-[#0c2a5b] dark:text-foreground">
                Hospital encounters
              </h2>
              <div className="mt-0.5 flex items-center text-[13px] whitespace-nowrap">
                <span className="font-normal text-[#5b6678] dark:text-muted-foreground">
                  From HIS · Hospital No.&nbsp;
                </span>
                <span className="font-mono font-semibold text-[#1b2433] dark:text-foreground">
                  {String(hospitalNumber)}
                </span>
              </div>
            </div>
          </div>

          {/* Encounter filter tabs */}
          <div className="flex shrink-0 items-center gap-[4px] rounded-full border border-[#e4e9f2] bg-[#f4f7fc] p-[4px] dark:border-border dark:bg-muted/60">
            <button
              type="button"
              onClick={() => handleFilterChange("all")}
              className={cn(
                "flex h-[30px] cursor-pointer items-center justify-center rounded-full px-[12px] text-[12px] font-semibold transition-all whitespace-nowrap",
                statusFilter === "all"
                  ? "bg-[#0c2a5b] text-white shadow-xs"
                  : "text-[#5b6678] hover:text-[#0c2a5b] dark:text-muted-foreground dark:hover:text-foreground"
              )}
            >
              All · {encounters.length}
            </button>
            <button
              type="button"
              onClick={() => handleFilterChange("active")}
              className={cn(
                "flex h-[30px] cursor-pointer items-center justify-center rounded-full px-[12px] text-[12px] font-semibold transition-all whitespace-nowrap",
                statusFilter === "active"
                  ? "bg-[#0c2a5b] text-white shadow-xs"
                  : "text-[#5b6678] hover:text-[#0c2a5b] dark:text-muted-foreground dark:hover:text-foreground"
              )}
            >
              Active · {activeCount}
            </button>
            <button
              type="button"
              onClick={() => handleFilterChange("discharged")}
              className={cn(
                "flex h-[30px] cursor-pointer items-center justify-center rounded-full px-[12px] text-[12px] font-semibold transition-all whitespace-nowrap",
                statusFilter === "discharged"
                  ? "bg-[#0c2a5b] text-white shadow-xs"
                  : "text-[#5b6678] hover:text-[#0c2a5b] dark:text-muted-foreground dark:hover:text-foreground"
              )}
            >
              Discharged · {dischargedCount}
            </button>
          </div>
        </div>

        {/* Search bar & Show per page */}
        <div className="flex w-full items-center justify-between gap-[12px] px-[24px] pb-[14px]">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute top-1/2 left-[14px] size-[18px] -translate-y-1/2 text-[#5b6678] dark:text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by encounter no., type or diagnosis"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-[40px] w-full rounded-[12px] border border-[#c6e8ee] bg-[#f1fafb] pr-[36px] pl-[42px] text-[13px] text-[#1b2433] transition-all placeholder:text-[#757575] focus:border-[#1f5fd6] focus:outline-none dark:border-border dark:bg-muted/30 dark:text-foreground dark:placeholder:text-muted-foreground"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="absolute top-1/2 right-[12px] -translate-y-1/2 cursor-pointer text-[#5b6678] hover:text-[#1b2433] dark:text-muted-foreground dark:hover:text-foreground"
              >
                <X className="size-[16px]" />
              </button>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-[8px] text-[13px] text-[#5b6678] whitespace-nowrap dark:text-muted-foreground">
            <span>Show</span>
            <select
              aria-label="Encounters per page"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="h-[36px] cursor-pointer rounded-[10px] border border-[#c6e8ee] bg-[#f1fafb] px-[12px] text-[13px] font-medium text-[#1b2433] focus:border-[#1f5fd6] focus:outline-none dark:border-border dark:bg-muted/30 dark:text-foreground"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span>per page</span>
          </div>
        </div>

        {/* Table Header Row */}
        <div className="w-full px-[24px]">
          <div className="flex w-full items-center gap-[14px] rounded-[10px] bg-[#f4f7fc] px-[14px] py-[10px] text-[12px] font-semibold text-[#5b6678] dark:bg-muted/60 dark:text-muted-foreground">
            <div className="w-[150px] shrink-0">Date & encounter</div>
            <div className="w-[130px] shrink-0">Type</div>
            <div className="w-[128px] shrink-0">Status</div>
            <div className="min-w-0 flex-1">Diagnosis</div>
            <div className="w-[150px] shrink-0 text-right">Actions</div>
          </div>
        </div>

        {/* Table Content */}
        {isLoading ? (
          <div className="w-full space-y-3 p-6">
            <Skeleton className="h-[52px] w-full rounded-[10px]" />
            <Skeleton className="h-[52px] w-full rounded-[10px]" />
            <Skeleton className="h-[52px] w-full rounded-[10px]" />
          </div>
        ) : error ? (
          <div className="w-full p-6">
            <Alert variant="destructive" className="rounded-[12px] border">
              <AlertCircle className="size-5" />
              <AlertTitle className="text-[14px] font-bold">Hospital System Unavailable</AlertTitle>
              <AlertDescription className="mt-1 text-[12px] font-medium">
                The hospital encounters could not be loaded at this time. Please try again later.
              </AlertDescription>
            </Alert>
          </div>
        ) : filteredEncounters.length === 0 ? (
          <div className="w-full space-y-2 px-4 py-12 text-center">
            <Filter className="mx-auto size-8 text-muted-foreground/40" />
            <h4 className="text-[14px] font-bold text-foreground">No Hospital Encounters Found</h4>
            <p className="mx-auto max-w-sm text-[12px] text-muted-foreground">
              {searchTerm || statusFilter !== "all"
                ? "No encounters matched your search query or filter criteria. Try clearing filters."
                : "No hospital transactions or admission records on file for this patient."}
            </p>
            {(searchTerm || statusFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("")
                  setStatusFilter("all")
                }}
                className="mt-2 inline-flex h-[32px] cursor-pointer items-center justify-center rounded-full border border-[#cfd7e4] px-[14px] text-[12px] font-semibold text-[#0c2a5b] transition-colors hover:bg-[#f4f7fc] dark:border-border dark:text-foreground dark:hover:bg-muted"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="flex w-full flex-col px-[24px]">
            {paginatedEncounters.map((enc) => {
              const diagnosisText =
                enc.finalDiagnosis ||
                enc.impression ||
                enc.dischargeDiagnosis ||
                "No diagnosis logged in HIS"
              const displayDate = formatEncounterDateTime(enc.registrationDate)

              return (
                <div
                  key={enc.id}
                  onClick={() => openEncounterDetail(enc)}
                  className="group flex w-full cursor-pointer items-center gap-[14px] border-b border-[#e4e9f2] px-[14px] py-[14px] transition-colors hover:bg-[#f4f7fc]/50 dark:border-border dark:hover:bg-muted/40"
                >
                  {/* Date & encounter */}
                  <div className="flex w-[150px] shrink-0 flex-col gap-[2px]">
                    <p className="truncate text-[13px] font-semibold text-[#1b2433] transition-colors group-hover:text-[#1f5fd6] dark:text-foreground">
                      {displayDate}
                    </p>
                    <p className="truncate font-mono text-[12px] text-[#5b6678] dark:text-muted-foreground">
                      #{enc.id}
                    </p>
                  </div>

                  {/* Type */}
                  <div className="w-[130px] shrink-0">
                    <span className="inline-block rounded-full bg-[#edf3fe] px-[10px] py-[4.5px] text-[12px] font-semibold text-[#1f5fd6] whitespace-nowrap dark:bg-primary/15 dark:text-primary">
                      {formatShortTransactionType(enc.patientTransactionType)}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="w-[128px] shrink-0">
                    <RegistryStatusBadge status={enc.registrationStatus} />
                  </div>

                  {/* Diagnosis */}
                  <div className="min-w-0 flex-1">
                    <p
                      className="line-clamp-2 text-[13px] font-normal leading-[19.5px] text-[#1b2433] dark:text-foreground/90"
                      title={diagnosisText}
                    >
                      {diagnosisText}
                    </p>
                  </div>

                  {/* Actions */}
                  <div
                    className="flex w-[150px] shrink-0 items-center justify-end gap-[6px]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => openEncounterDetail(enc)}
                      className="inline-flex h-[34px] cursor-pointer items-center gap-[4px] rounded-full px-[12px] text-[13px] font-semibold text-[#1f5fd6] transition-colors hover:bg-[#edf3fe] active:scale-[0.98] dark:hover:bg-muted"
                    >
                      <Eye className="size-[16px] text-[#1f5fd6]" />
                      <span>View</span>
                    </button>

                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="inline-flex h-[34px] cursor-pointer items-center gap-[3px] rounded-full px-[12px] text-[13px] font-semibold text-[#1f5fd6] transition-colors hover:bg-[#edf3fe] focus:outline-none active:scale-[0.98] dark:hover:bg-muted"
                        aria-label={`Print documents for encounter #${enc.id}`}
                      >
                        <Printer className="size-[16px] text-[#1f5fd6]" />
                        <span>Print</span>
                        <ChevronDown className="size-[14px] text-[#1f5fd6]" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-72 space-y-1 rounded-[16px] border border-[#e4e9f2] bg-white p-2 shadow-xl dark:border-border dark:bg-card"
                      >
                        <DropdownMenuGroup>
                          <DropdownMenuLabel className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#5b6678] dark:text-muted-foreground">
                            Encounter #{enc.id} Printables
                          </DropdownMenuLabel>
                        </DropdownMenuGroup>
                        <DropdownMenuItem
                          onClick={() => handleOpenPrint(enc, "uis")}
                          className="cursor-pointer gap-2.5 rounded-[10px] px-3 py-2 text-[13px] font-medium text-[#1b2433] transition-colors hover:bg-[#edf3fe] hover:text-[#1f5fd6] dark:text-foreground dark:hover:bg-muted"
                        >
                          <FileText className="size-[16px] shrink-0 text-[#1f5fd6]" />
                          <span>Unified Intake Sheet (UIS)</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleOpenPrint(enc, "maifip")}
                          className="cursor-pointer gap-2.5 rounded-[10px] px-3 py-2 text-[13px] font-medium text-[#1b2433] transition-colors hover:bg-[#edf3fe] hover:text-[#1f5fd6] dark:text-foreground dark:hover:bg-muted"
                        >
                          <FileCheck2 className="size-[16px] shrink-0 text-[#1f5fd6]" />
                          <span>Acknowledgement Slip (MAIFIP)</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleOpenPrint(enc, "cga")}
                          className="cursor-pointer gap-2.5 rounded-[10px] px-3 py-2 text-[13px] font-medium text-[#1b2433] transition-colors hover:bg-[#edf3fe] hover:text-[#1f5fd6] dark:text-foreground dark:hover:bg-muted"
                        >
                          <Building2 className="size-[16px] shrink-0 text-[#1f5fd6]" />
                          <span>City Mayor Acknowledgement Slip</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleOpenPrint(enc, "indigency")}
                          className="cursor-pointer gap-2.5 rounded-[10px] px-3 py-2 text-[13px] font-medium text-[#1b2433] transition-colors hover:bg-[#edf3fe] hover:text-[#1f5fd6] dark:text-foreground dark:hover:bg-muted"
                        >
                          <BadgeCheck className="size-[16px] shrink-0 text-[#1f5fd6]" />
                          <span>Certificate of Eligibility (Indigency)</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination Footer */}
        {!isLoading && !error && filteredEncounters.length > 0 && (
          <div className="flex w-full items-center justify-between px-[24px] pt-[14px] pb-[18px] text-[13px] text-[#5b6678] dark:text-muted-foreground">
            <div>
              Showing{" "}
              <span className="font-bold text-[#1b2433] dark:text-foreground">
                {(currentPage - 1) * pageSize + 1}–
                {Math.min(currentPage * pageSize, filteredEncounters.length)}
              </span>{" "}
              of {filteredEncounters.length}{" "}
              {filteredEncounters.length === 1 ? "encounter" : "encounters"}
            </div>

            <div className="flex items-center gap-[8px]">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="h-[32px] cursor-pointer rounded-full border border-[#e4e9f2] bg-white px-[12px] text-[12px] font-semibold text-[#5b6678] transition-colors hover:bg-[#f4f7fc] disabled:cursor-not-allowed disabled:opacity-40 dark:border-border dark:bg-card dark:text-muted-foreground dark:hover:bg-muted"
              >
                Previous
              </button>

              <span className="px-1 text-[13px] text-[#5b6678] dark:text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="h-[32px] cursor-pointer rounded-full border border-[#e4e9f2] bg-white px-[12px] text-[12px] font-semibold text-[#5b6678] transition-colors hover:bg-[#f4f7fc] disabled:cursor-not-allowed disabled:opacity-40 dark:border-border dark:bg-card dark:text-muted-foreground dark:hover:bg-muted"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

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

      {/* Printable Dialog (UIS, MAIFIP, City Mayor, Indigency) */}
      <EncounterPrintableDialog
        open={isPrintableOpen}
        onOpenChange={setIsPrintableOpen}
        type={printableType}
        encounter={printableEncounter}
        patient={patient}
        caseId={patient.latestCaseId}
      />
    </div>
  )
}
