import React from "react"
import { router, usePage } from "@inertiajs/react"
import { useQueryClient } from "@tanstack/react-query"
import type { PatientRecord } from "@/features/patients/types"
import { prefetchPatientDetail } from "@/features/patients/hooks/use-patient-detail"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { usePermission } from "@/features/auth/hooks/use-permission"
import { PatientQueueDialog } from "@/features/patients/components/dialogs/patient-queue-dialog"
import {
  Search,
  Calendar,
  User,
  Building2,
  FilterX,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  History,
  Users,
  Briefcase,
  BarChart3,
  ClipboardList,
  Timer,
  Clock,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"

/** "2026-10-19T07:31:26.000000Z" or "2026-10-19" → "Oct 19, 2026". */
function formatIntakeDate(value: string | null | undefined): string {
  if (!value) return "—"
  // A bare date is a calendar day; parse it as local so it can't shift a day.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
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
  currentView: _currentView = "patients",
  onViewChange,
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
  const pageObj = usePage()
  const pathname = pageObj.url.split("?")[0]
  const navigate = (url: string) => router.visit(url)
  const canViewAudit = usePermission("audit.view")
  const canViewPatients = usePermission("patients.view")
  const canViewCases = usePermission("cases.view")
  const canViewReports = usePermission("reports.view")
  const canManageDar = usePermission("dar.manage")
  const canManageQueue = usePermission("queue.manage")
  const [queuePatient, setQueuePatient] = React.useState<PatientRecord | null>(null)

  const isPatientsRoute = pathname === "/" || pathname.startsWith("/patients")
  const isCaseloadRoute = pathname.startsWith("/caseload") || pathname.startsWith("/cases")
  const isQueueRoute = pathname.startsWith("/queue")
  const isReportsRoute = pathname.startsWith("/reports")
  const isDarRoute = pathname.startsWith("/dar")
  const isAuditRoute = pathname.startsWith("/audit")

  const getCategoryBadgeVariant = (category: string) => {
    switch (category) {
      case "Indigent":
        return "destructive"
      case "Low Income":
        return "default"
      default:
        return "outline"
    }
  }

  const hasActiveFilters = searchQuery !== "" || filterDate !== undefined

  return (
    <aside className="flex h-full w-88 flex-col border-r border-border bg-card/60 text-foreground transition-colors duration-200">
      {/* View Selector Nav (Patients vs Caseload vs Reports vs DAR vs Global Audit Log) */}
      <div className="p-2.5 border-b border-border/80 bg-muted/30 flex items-center gap-1.5 flex-wrap">
        {canViewPatients && (
          <button
            onClick={() => {
              onViewChange?.("patients")
              if (selectedPatientId) {
                navigate(`/patients/${selectedPatientId}`)
              } else {
                navigate("/")
              }
            }}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer border min-w-20",
              isPatientsRoute
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-background text-muted-foreground border-border hover:bg-muted"
            )}
          >
            <Users className="size-3.5" /> Patients
          </button>
        )}

        {canViewCases && (
          <button
            onClick={() => {
              navigate("/caseload")
            }}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer border min-w-20",
              isCaseloadRoute
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-background text-muted-foreground border-border hover:bg-muted"
            )}
          >
            <Briefcase className="size-3.5" /> Caseload
          </button>
        )}

        {canManageQueue && (
          <button
            onClick={() => {
              navigate("/queue")
            }}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer border min-w-20",
              isQueueRoute
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-background text-muted-foreground border-border hover:bg-muted"
            )}
          >
            <Timer className="size-3.5" /> Queue
          </button>
        )}

        {canViewReports && (
          <button
            onClick={() => {
              navigate("/reports/social-cases")
            }}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer border min-w-20",
              isReportsRoute
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-background text-muted-foreground border-border hover:bg-muted"
            )}
          >
            <BarChart3 className="size-3.5" /> Reports
          </button>
        )}

        {canManageDar && (
          <button
            onClick={() => {
              navigate("/dar")
            }}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer border min-w-20",
              isDarRoute
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-background text-muted-foreground border-border hover:bg-muted"
            )}
          >
            <ClipboardList className="size-3.5" /> DAR
          </button>
        )}

        {canViewAudit && (
          <button
            onClick={() => {
              onViewChange?.("audit-log")
              navigate("/audit")
            }}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer border min-w-20",
              isAuditRoute
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-background text-muted-foreground border-border hover:bg-muted"
            )}
          >
            <History className="size-3.5" /> Audit
          </button>
        )}
      </div>


      {/* Sidebar Header */}
      <div className="flex flex-col gap-3.5 border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            <h2 className="font-heading text-base font-bold tracking-tight">
              Patient Registry
            </h2>
          </div>
          <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5">
            {total} {total === 1 ? "Patient" : "Patients"}
          </Badge>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
          <Input
            placeholder="Search patient, hospital #..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 text-sm h-10 border-border/80 focus-visible:ring-2"
          />
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2">
          <DatePicker
            date={filterDate}
            setDate={onDateChange}
            placeholder="Filter intake date"
            className="h-10 w-full text-xs"
          />
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearFilters}
              title="Clear filters"
              className="h-10 px-2.5 shrink-0"
            >
              <FilterX className="size-4 text-muted-foreground" />
            </Button>
          )}
        </div>
      </div>

      {/* Patient List Items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {patients.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <User className="size-10 mb-2 stroke-1 opacity-50" />
            <p className="text-sm font-semibold">No patients found</p>
            <p className="text-xs mt-1">Try clearing your search or date filter.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={onClearFilters}>
              Reset Filters
            </Button>
          </div>
        ) : (
          patients.map((patient) => {
            const isSelected = patient.id === selectedPatientId
            return (
              <div
                key={patient.id}
                onClick={() => onSelectPatient(patient.id)}
                onMouseEnter={() => prefetchPatientDetail(queryClient, Number(patient.id), canViewCases)}
                className={cn(
                  "group relative flex cursor-pointer flex-col gap-2 rounded-xl border p-3.5 text-sm transition-all hover:shadow-xs",
                  isSelected
                    ? "border-primary bg-primary/10 text-foreground ring-2 ring-primary/30"
                    : "border-border/80 bg-background text-muted-foreground hover:border-border hover:bg-muted/30"
                )}
              >
                <div className="flex items-start justify-between gap-1">
                  <span className="font-bold text-foreground group-hover:text-primary text-sm line-clamp-1">
                    {patient.fullName}
                  </span>
                  <ChevronRight
                    className={cn(
                      "size-4 shrink-0 transition-transform mt-0.5",
                      isSelected ? "text-primary translate-x-0.5" : "text-muted-foreground opacity-0 group-hover:opacity-100"
                    )}
                  />
                </div>

                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="font-semibold text-foreground">{patient.hospitalNo}</span>
                  <span>•</span>
                  <span>{patient.mswdNo}</span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <Badge variant={getCategoryBadgeVariant(patient.category)} className="text-xs px-2 py-0.5 font-semibold">
                      {patient.category}
                    </Badge>
                    <span
                      className={cn(
                        "truncate font-semibold text-xs",
                        patient.admissionStatus === "ER Emergency"
                          ? "text-destructive"
                          : "text-emerald-600 dark:text-emerald-400"
                      )}
                    >
                      {patient.admissionStatus}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground font-medium">
                    <Building2 className="size-3.5 text-primary" />
                    <span>{patient.ward}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground border-t border-border/50 pt-2 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3.5" />
                    {formatIntakeDate(patient.intakeDate)}
                  </span>
                  {canManageQueue &&
                    (patient.activeVisit ? (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                          patient.activeVisit.status === "in_progress"
                            ? "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400"
                            : "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        )}
                        title={`On the queue for encounter #${patient.activeVisit.hisTransactionId}`}
                      >
                        {patient.activeVisit.status === "in_progress" ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Clock className="size-3" />
                        )}
                        {patient.activeVisit.status === "in_progress" ? "In progress" : "Waiting"}
                      </span>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1 px-2 text-xs font-semibold hover:border-primary hover:text-primary"
                        title="Place this patient on the MSWD queue"
                        // The card itself opens the patient; keep this click to the button.
                        onClick={(e) => {
                          e.stopPropagation()
                          setQueuePatient(patient)
                        }}
                      >
                        <Clock className="size-3.5" />
                        Queue
                      </Button>
                    ))}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Pager Footer */}
      <div className="flex items-center justify-between border-t border-border p-3 text-xs text-muted-foreground bg-card/80">
        <span>
          Page <strong className="text-foreground">{page}</strong> of{" "}
          <strong className="text-foreground">{totalPages}</strong>
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-7"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            title="Previous Page"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-7"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            title="Next Page"
          >
            <ChevronRight className="size-4" />
          </Button>
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
