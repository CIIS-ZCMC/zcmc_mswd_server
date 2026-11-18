import React, { useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import type { PatientRecord } from "@/features/patients/types"
import { prefetchPatientDetail } from "@/features/patients/hooks/use-patient-detail"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { usePermission } from "@/features/auth/hooks/use-permission"
import { PatientQueueDialog } from "@/features/patients/components/dialogs/patient-queue-dialog"
import { FilterX, User } from "lucide-react"
import { cn } from "@/lib/utils"

function formatWaitingBadge(arrivedAt?: string | null): string {
  if (!arrivedAt) return "Waiting"
  const diffMs = Date.now() - new Date(arrivedAt).getTime()
  if (Number.isNaN(diffMs) || diffMs < 0) return "Waiting  1m"
  const mins = Math.max(1, Math.floor(diffMs / 60000))
  return `Waiting  ${mins}m`
}

function formatProcessingBadge(arrivedAt?: string | null): string {
  if (!arrivedAt) return "Processing"
  const diffMs = Date.now() - new Date(arrivedAt).getTime()
  if (Number.isNaN(diffMs) || diffMs < 0) return "Processing  1m"
  const totalMins = Math.floor(diffMs / 60000)
  const days = Math.floor(totalMins / 1440)
  const mins = totalMins % 1440
  if (days > 0) {
    return `Processing  ${days}d ${mins}m`
  }
  return `Processing  ${Math.max(1, mins)}m`
}

function formatIntakeDateTime(value: string | null | undefined): string {
  if (!value) return "—"
  const isBareDate = /^\d{4}-\d{2}-\d{2}$/.test(value)
  const date = isBareDate ? new Date(`${value}T10:50:00`) : new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const datePart = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
  const timePart = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })
  return `${datePart} · ${timePart}`
}

function getPatientInitials(fullName: string): string {
  const cleaned = fullName.replace(/,/g, " ").trim()
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "PT"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

type ClassificationFilter =
  | "all"
  | "indigent"
  | "low-income"
  | "self-sufficient"
  | "others"
  | "unclassified"

const CLASSIFICATION_PILLS: { id: ClassificationFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "indigent", label: "Indigent" },
  { id: "low-income", label: "Low income" },
  { id: "self-sufficient", label: "Self-sufficient" },
  { id: "others", label: "Others" },
  { id: "unclassified", label: "Unclassified" },
]

function matchesClassificationFilter(
  patient: PatientRecord,
  filter: ClassificationFilter
): boolean {
  if (filter === "all") return true
  const cat = (patient.category || "").toLowerCase()
  if (filter === "indigent") {
    return cat.includes("indigent") || cat.includes("c3") || cat.includes("d")
  }
  if (filter === "low-income") {
    return cat.includes("low") || cat.includes("c1") || cat.includes("c2")
  }
  if (filter === "self-sufficient") {
    return cat.includes("self") || cat.includes("a") || cat.includes("b")
  }
  if (filter === "unclassified") {
    return !cat || cat === "unclassified" || cat === "n/a" || cat === "none"
  }
  if (filter === "others") {
    return (
      Boolean(cat) &&
      !cat.includes("indigent") &&
      !cat.includes("low") &&
      !cat.includes("self") &&
      cat !== "unclassified"
    )
  }
  return true
}

interface SidebarProps {
  patients: PatientRecord[]
  selectedPatientId: string
  onSelectPatient: (patientId: string) => void
  currentView?: "patients" | "audit-log"
  onViewChange?: (view: "patients" | "audit-log") => void
  page: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
  searchQuery: string
  onSearchChange: (search: string) => void
  filterDate?: Date
  onDateChange: (date?: Date) => void
  onClearFilters: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({
  patients,
  selectedPatientId,
  onSelectPatient,
  page,
  totalPages,
  total,
  onPageChange,
  searchQuery,
  onSearchChange,
  filterDate,
  onDateChange,
  onClearFilters,
}) => {
  const queryClient = useQueryClient()
  const canViewCases = usePermission("cases.view")
  const canManageQueue = usePermission("queue.manage")
  const [queuePatient, setQueuePatient] = useState<PatientRecord | null>(null)
  const [classificationFilter, setClassificationFilter] =
    useState<ClassificationFilter>("all")

  const filteredPatients = useMemo(
    () =>
      patients.filter((p) =>
        matchesClassificationFilter(p, classificationFilter)
      ),
    [patients, classificationFilter]
  )

  const hasActiveFilters =
    searchQuery !== "" ||
    filterDate !== undefined ||
    classificationFilter !== "all"

  const handleResetAllFilters = () => {
    setClassificationFilter("all")
    onClearFilters()
  }

  return (
    <aside
      data-node-id="144:597"
      className="flex h-full w-[304px] shrink-0 flex-col border-r border-[#e4e9f2] bg-white text-[#0c2a5b] transition-colors duration-200 dark:border-border dark:bg-card dark:text-foreground"
    >
      {/* Sidebar Header & Filters */}
      <div
        data-node-id="144:598"
        className="flex shrink-0 flex-col gap-[12px] px-[18px] pt-[22px] pb-[12px]"
      >
        {/* Title Row */}
        <div className="flex w-full items-center gap-[8px]">
          <span className="flex size-[32px] shrink-0 items-center justify-center rounded-full bg-[#edf3fe]">
            <img
              alt=""
              className="block size-[19px] max-w-none"
              src="/images/patient-registry/registry-shield.svg"
            />
          </span>
          <h2 className="min-w-0 flex-1 truncate text-[17px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground">
            Patient Registry
          </h2>
          <span className="flex h-[24px] shrink-0 items-center rounded-full bg-[#edf3fe] px-[10px] text-[12px] leading-[24px] font-bold text-[#1f5fd6] whitespace-nowrap">
            {total} {total === 1 ? "patient" : "patients"}
          </span>
        </div>

        {/* Search Input */}
        <div className="relative w-full">
          <span className="pointer-events-none absolute top-[11px] left-[14px] flex size-[20px] items-center justify-center">
            <img
              alt=""
              className="block size-[20px] max-w-none"
              src="/images/patient-registry/search.svg"
            />
          </span>
          <input
            type="text"
            placeholder="Search patient or hospital no."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-[42px] w-full rounded-full border border-[#c6e8ee] bg-[#f1fafb] pr-[14px] pl-[42px] text-[13px] font-normal text-[#0c2a5b] placeholder:text-[#757575] focus:border-[#1f5fd6] focus:outline-none dark:border-border dark:bg-muted dark:text-foreground"
          />
        </div>

        {/* Intake Date Filter */}
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1 [&_button]:h-[42px] [&_button]:rounded-full [&_button]:border-[#c6e8ee] [&_button]:bg-[#f1fafb] [&_button]:pl-[42px] [&_button]:text-[13px] [&_button]:font-normal [&_button]:text-[#757575] [&_button_svg]:hidden">
            <span className="pointer-events-none absolute top-[11px] left-[14px] z-10 flex size-[20px] items-center justify-center">
              <img
                alt=""
                className="block size-[20px] max-w-none"
                src="/images/patient-registry/calendar.svg"
              />
            </span>
            <DatePicker
              date={filterDate}
              setDate={onDateChange}
              placeholder="Filter by intake date"
              className="h-[42px] w-full rounded-full border-[#c6e8ee] bg-[#f1fafb] text-[13px]"
            />
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetAllFilters}
              title="Clear filters"
              className="flex size-[38px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#e4e9f2] bg-white text-[#5b6678] hover:bg-[#f4f7fc]"
            >
              <FilterX className="size-4" />
            </button>
          )}
        </div>

        {/* Classification Filter Pills */}
        <div
          data-node-id="144:622"
          className="flex flex-wrap items-center gap-[6px]"
        >
          {CLASSIFICATION_PILLS.map((pill) => {
            const isActive = classificationFilter === pill.id
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setClassificationFilter(pill.id)}
                className={cn(
                  "flex h-[30px] cursor-pointer items-center justify-center rounded-full border px-[12px] text-[12px] leading-normal font-semibold transition-colors whitespace-nowrap",
                  isActive
                    ? "border-[#0c2a5b] bg-[#0c2a5b] text-white"
                    : "border-[#e4e9f2] bg-white text-[#0c2a5b] hover:bg-[#f4f7fc] dark:border-border dark:bg-card dark:text-foreground"
                )}
              >
                {pill.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Patient Cards List */}
      <div
        data-node-id="144:635"
        className="flex flex-1 flex-col gap-[10px] overflow-y-auto px-[14px] pt-[6px] pb-[12px]"
      >
        {filteredPatients.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-[#5b6678]">
            <User className="mb-2 size-10 stroke-1 opacity-50" />
            <p className="text-sm font-semibold text-[#0c2a5b] dark:text-foreground">
              No patients found
            </p>
            <p className="mt-1 text-xs">
              Try clearing your search, date, or classification filter.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 rounded-full"
              onClick={handleResetAllFilters}
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          filteredPatients.map((patient) => {
            const isSelected = String(patient.id) === String(selectedPatientId)
            const categoryText = patient.category || "Unclassified"
            const isUnclassified =
              !patient.category ||
              categoryText.toLowerCase() === "unclassified" ||
              categoryText.toLowerCase() === "n/a"
            const classPillLabel = isUnclassified
              ? "Unclassified"
              : categoryText === "Indigent"
                ? "Class C3"
                : categoryText
            const admissionLabel =
              patient.admissionStatus && patient.admissionStatus !== "N/A"
                ? patient.admissionStatus
                : "House / walk-in"
            const wardLabel =
              patient.ward &&
              patient.ward !== "N/A" &&
              patient.ward.trim() !== ""
                ? patient.ward
                : "Ward not recorded"
            const mswdClean = (patient.mswdNo || "").replace(/^MSWD-?/i, "")

            return (
              <div
                key={patient.id}
                onClick={() => onSelectPatient(patient.id)}
                onMouseEnter={() =>
                  prefetchPatientDetail(
                    queryClient,
                    Number(patient.id),
                    canViewCases
                  )
                }
                className={cn(
                  "flex w-full shrink-0 cursor-pointer flex-col gap-[10px] rounded-[16px] p-[14px] transition-all",
                  isSelected
                    ? "border-2 border-[#1f5fd6] bg-[#edf3fe] dark:bg-primary/15"
                    : "border border-[#e4e9f2] bg-white hover:border-[#cfd7e4] dark:border-border dark:bg-card"
                )}
              >
                {/* Top Row: Initials + Name & IDs */}
                <div className="flex w-full items-center gap-[10px]">
                  <span className="flex size-[38px] shrink-0 items-center justify-center rounded-[19px] bg-[#e0f5f8] text-[13px] font-bold text-[#0a6b78]">
                    {getPatientInitials(patient.fullName)}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                    <p className="truncate text-[14px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground">
                      {patient.fullName}
                    </p>
                    <p className="truncate font-mono text-[11px] leading-normal font-normal text-[#5b6678] dark:text-muted-foreground">
                      Hosp {patient.hospitalNo} · MSWD {mswdClean || "—"}
                    </p>
                  </div>
                </div>

                {/* Middle Badges */}
                <div className="flex flex-wrap items-center gap-[6px]">
                  <span
                    className={cn(
                      "flex h-[22px] items-center rounded-full px-[9px] text-[11px] leading-[22px] font-bold whitespace-nowrap",
                      isUnclassified
                        ? "bg-[#e4e9f2] text-[#4a5568]"
                        : "bg-[#e8f6ef] text-[#146b43]"
                    )}
                  >
                    {classPillLabel}
                  </span>

                  <span className="flex h-[22px] items-center rounded-full bg-[#edf3fe] px-[9px] text-[11px] leading-[22px] font-bold text-[#1f5fd6] whitespace-nowrap">
                    {admissionLabel}
                  </span>

                  <span className="flex h-[22px] items-center rounded-full bg-[#eef1f6] px-[9px] text-[11px] leading-[22px] font-semibold text-[#4a5568] whitespace-nowrap">
                    {wardLabel}
                  </span>
                </div>

                {/* Bottom Row: Intake Date + Queue Button */}
                <div className="flex w-full items-center justify-between gap-[10px]">
                  <div className="flex min-w-0 flex-1 items-center gap-[4px]">
                    <img
                      alt=""
                      className="block size-[14px] shrink-0 max-w-none"
                      src="/images/patient-registry/card-calendar.svg"
                    />
                    <span className="truncate text-[9px] leading-normal font-normal text-[#5b6678] dark:text-muted-foreground">
                      {formatIntakeDateTime(patient.intakeDate)}
                    </span>
                  </div>

                  {canManageQueue &&
                    (patient.activeVisit ? (
                      <span
                        data-node-id="I225:1278;199:1138"
                        className={cn(
                          "flex shrink-0 items-center justify-center rounded-[21px] px-[6px] py-[4px] text-[10px] leading-[15px] font-bold whitespace-pre",
                          patient.activeVisit.status === "in_progress"
                            ? "bg-[#d9e6fc] text-[#1f5fd6]"
                            : "bg-[#ffe5c9] text-[#8a5300]"
                        )}
                        title={`On the queue for encounter #${patient.activeVisit.hisTransactionId}`}
                      >
                        {patient.activeVisit.status === "in_progress"
                          ? formatProcessingBadge(patient.activeVisit.arrivedAt)
                          : formatWaitingBadge(patient.activeVisit.arrivedAt)}
                      </span>
                    ) : (
                      <button
                        type="button"
                        title="Place this patient on the MSWD queue"
                        onClick={(e) => {
                          e.stopPropagation()
                          setQueuePatient(patient)
                        }}
                        className="flex shrink-0 cursor-pointer items-center justify-center gap-[3px] rounded-[21px] bg-[#1f5fd6] px-[8px] py-[4px] text-[10px] leading-[15px] font-bold text-white transition-colors hover:bg-[#1950b8]"
                      >
                        <img
                          alt=""
                          className="block size-[14px] shrink-0 max-w-none"
                          src="/images/patient-registry/access-time.svg"
                        />
                        <span>Queue</span>
                      </button>
                    ))}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Pager Footer */}
      <div
        data-node-id="144:682"
        className="flex shrink-0 items-center justify-between border-t border-[#e4e9f2] px-[18px] pt-[13px] pb-[12px] text-[12px] text-[#5b6678] dark:border-border dark:text-muted-foreground"
      >
        <span>
          Page{" "}
          <strong className="font-bold text-[#0c2a5b] dark:text-foreground">
            {page}
          </strong>{" "}
          of {totalPages}
        </span>
        <div className="flex items-center gap-[6px]">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            title="Previous page"
            className="flex size-[32px] cursor-pointer items-center justify-center rounded-[16px] border border-[#e4e9f2] bg-white px-[6px] py-px transition-colors hover:bg-[#f4f7fc] disabled:cursor-not-allowed disabled:opacity-40 dark:border-border dark:bg-card"
          >
            <img
              alt="Previous"
              className="block size-[18px] max-w-none"
              src="/images/patient-registry/chevron-left.svg"
            />
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            title="Next page"
            className="flex size-[32px] cursor-pointer items-center justify-center rounded-[16px] border border-[#e4e9f2] bg-white px-[6px] py-px transition-colors hover:bg-[#f4f7fc] disabled:cursor-not-allowed disabled:opacity-40 dark:border-border dark:bg-card"
          >
            <img
              alt="Next"
              className="block size-[18px] max-w-none"
              src="/images/patient-registry/chevron-right.svg"
            />
          </button>
        </div>
      </div>

      {canManageQueue && queuePatient && (
        <PatientQueueDialog
          open
          onOpenChange={(open) => {
            if (!open) setQueuePatient(null)
          }}
          patient={queuePatient}
        />
      )}
    </aside>
  )
}
