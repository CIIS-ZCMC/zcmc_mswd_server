import React, { useState } from "react"
import { useNavigate, useSearchParams } from "@/lib/inertia-router-hooks"
import { useMyCaseload } from "../hooks/use-cases"
import { useMyFollowUps, useProgressNoteMutations } from "../hooks/use-progress-notes"
import { CaseCard } from "./case-card"
import { CaseTable } from "./case-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertCircle,
  Briefcase,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  FolderOpen,
  LayoutGrid,
  Plus,
  Search,
  Table as TableIcon,
} from "lucide-react"
import { OpenCaseDialog } from "./dialogs/open-case-dialog"
import type { CaseListItem } from "../types/case.types"
import { cn } from "@/lib/utils"
import { usePermission } from "@/features/auth/hooks/use-permission"

export const CaseloadPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const canCreate = usePermission("cases.create")

  const currentTab = searchParams.get("status") || "ALL"
  const searchQuery = searchParams.get("search") || ""
  const page = Number(searchParams.get("page") || 1)

  const [isOpenCaseModalOpen, setIsOpenCaseModalOpen] = useState(false)
  const [viewMode, setViewMode] = useState<"card" | "table">(() => {
    if (typeof window === "undefined") return "card"
    return (localStorage.getItem("caseload_view_mode") as "card" | "table") || "card"
  })

  const handleViewModeChange = (mode: "card" | "table") => {
    setViewMode(mode)
    localStorage.setItem("caseload_view_mode", mode)
  }

  const { data, isLoading, error } = useMyCaseload({
    social_case_status: currentTab === "ALL" || currentTab === "follow_ups" ? undefined : currentTab,
    search: searchQuery || undefined,
    page,
    per_page: 15,
  })

  const { data: followUps = [], isLoading: isLoadingFollowUps } = useMyFollowUps()
  const { completeFollowUp } = useProgressNoteMutations()

  const todayStr = new Date().toISOString().substring(0, 10)
  const pendingFollowUps = followUps.filter((f) => !f.followUpCompletedAt)
  const overdueCount = pendingFollowUps.filter(
    (f) => f.followUpOn && f.followUpOn.substring(0, 10) < todayStr
  ).length

  const cases = data?.data || []
  const meta = data?.meta
  const totalPages = meta?.last_page || 1
  const totalItems = meta?.total ?? cases.length

  const handleTabChange = (status: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (status === "ALL") {
          next.delete("status")
        } else {
          next.set("status", status)
        }
        next.set("page", "1")
        return next
      },
      { replace: true }
    )
  }

  const handleSearchChange = (val: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (!val) {
          next.delete("search")
        } else {
          next.set("search", val)
        }
        next.set("page", "1")
        return next
      },
      { replace: true }
    )
  }

  const handlePageChange = (newPage: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set("page", String(newPage))
      return next
    })
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-background text-foreground transition-colors duration-200">
      {/* Header Banner */}
      <div className="border-b border-border bg-card p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-primary/10 text-primary rounded-xl border border-primary/20">
              <Briefcase className="size-6" />
            </div>
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight">
                My Caseload
              </h1>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-0.5">
                Active social case episodes assigned to you.
              </p>
            </div>
          </div>

          {canCreate && (
            <Button
              size="default"
              onClick={() => setIsOpenCaseModalOpen(true)}
              className="gap-2 font-bold text-sm sm:text-base h-11 px-5 shadow-sm"
            >
              <Plus className="size-5" />
              Open New Case
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-5 sm:p-6 space-y-5 w-full">
        {/* Status Bucket Filters & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: "ALL", label: "All Cases" },
              { key: "draft", label: "Draft" },
              { key: "for_review", label: "For Review" },
              { key: "finalized", label: "Finalized" },
              {
                key: "follow_ups",
                label: `Follow-ups Due (${pendingFollowUps.length})`,
                badge: overdueCount > 0 ? `${overdueCount} overdue` : undefined,
              },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={cn(
                  "rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all border cursor-pointer flex items-center gap-1.5",
                  currentTab === tab.key
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                )}
              >
                <span>{tab.label}</span>
                {tab.badge && (
                  <Badge
                    variant="destructive"
                    className="text-[10px] px-1.5 py-0 h-4 uppercase font-extrabold"
                  >
                    {tab.badge}
                  </Badge>
                )}
              </button>
            ))}
          </div>

          {currentTab !== "follow_ups" && (
            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <div className="flex items-center rounded-xl border border-border bg-card p-1 shadow-2xs">
                <button
                  type="button"
                  title="Card View"
                  onClick={() => handleViewModeChange("card")}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    viewMode === "card"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <LayoutGrid className="size-3.5" />
                  <span className="hidden sm:inline">Cards</span>
                </button>
                <button
                  type="button"
                  title="Table View"
                  onClick={() => handleViewModeChange("table")}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    viewMode === "table"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <TableIcon className="size-3.5" />
                  <span className="hidden sm:inline">Table</span>
                </button>
              </div>

              <div className="relative flex-1 md:w-80">
                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search case code, patient..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-9 text-sm h-10 border-border/80"
                />
              </div>
            </div>
          )}
        </div>

        {/* Follow-ups View */}
        {currentTab === "follow_ups" ? (
          isLoadingFollowUps ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5">
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-28 w-full rounded-xl" />
            </div>
          ) : pendingFollowUps.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground border-2 border-dashed rounded-2xl bg-card/40">
              <CheckCircle2 className="size-12 mb-3 stroke-1 text-emerald-500" />
              <h3 className="text-base sm:text-lg font-bold text-foreground">
                All follow-ups are up to date!
              </h3>
              <p className="text-xs sm:text-sm mt-1 max-w-sm">
                You have no pending or overdue case follow-ups scheduled at this time.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5">
              {pendingFollowUps.map((item) => {
                const isOverdue =
                  item.followUpOn && item.followUpOn.substring(0, 10) < todayStr

                return (
                  <div
                    key={item.id}
                    className="rounded-xl border bg-card p-4 transition-all hover:shadow-xs flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {isOverdue ? (
                          <Badge variant="destructive" className="text-xs gap-1">
                            <AlertCircle className="size-3" />
                            Overdue: {item.followUpOn?.substring(0, 10)}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs gap-1 bg-amber-100 text-amber-800 border-amber-200">
                            <Clock className="size-3 text-amber-600" />
                            Due: {item.followUpOn?.substring(0, 10)}
                          </Badge>
                        )}

                        <span className="font-bold text-xs sm:text-sm text-foreground">
                          {item.caseCode || `Case #${item.caseId}`}
                        </span>

                        {item.patientName && (
                          <span className="text-xs text-muted-foreground">
                            • Patient: <strong className="text-foreground">{item.patientName}</strong>
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground line-clamp-2">
                        {item.narrative}
                      </div>

                      <div className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                        <Calendar className="size-3" />
                        Note date: {item.noteDate?.substring(0, 10) || "—"}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 justify-end border-t pt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/cases/${item.caseId}?tab=progress-notes`)}
                        className="text-xs font-semibold gap-1 h-9"
                      >
                        <ExternalLink className="size-3.5" /> View Case
                      </Button>

                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => completeFollowUp(item.id)}
                        className="text-xs font-semibold gap-1 h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <CheckCircle2 className="size-3.5" /> Mark Done
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        ) : (
          /* Regular Caseload List */
          isLoading ? (
            viewMode === "card" ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5">
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="h-28 w-full rounded-xl" />
              </div>
            ) : (
              <div className="space-y-2 rounded-xl border bg-card p-4">
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
            )
          ) : error ? (
            <Alert variant="destructive" className="border-2 p-5">
              <AlertCircle className="size-5" />
              <AlertTitle className="text-base font-bold">Error Loading Caseload</AlertTitle>
              <AlertDescription className="text-sm font-medium mt-1">
                Could not retrieve your caseload queue at this time. Please try again.
              </AlertDescription>
            </Alert>
          ) : cases.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground border-2 border-dashed rounded-2xl bg-card/40">
              <FolderOpen className="size-12 mb-3 stroke-1 opacity-50" />
              <h3 className="text-base sm:text-lg font-bold text-foreground">No cases in this queue</h3>
              <p className="text-xs sm:text-sm mt-1 max-w-sm">
                {searchQuery
                  ? `No caseload episodes match "${searchQuery}".`
                  : "You have no assigned cases matching the selected status filter."}
              </p>
            </div>
          ) : viewMode === "card" ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5">
              {cases.map((c: CaseListItem) => (
                <CaseCard key={c.id} item={c} onClick={() => navigate(`/cases/${c.id}`)} />
              ))}
            </div>
          ) : (
            <CaseTable items={cases} onRowClick={(id) => navigate(`/cases/${id}`)} />
          )
        )}

        {/* Pagination Bar */}
        {currentTab !== "follow_ups" && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border pt-4 text-xs sm:text-sm text-muted-foreground">
            <span>
              Showing <strong className="text-foreground">{cases.length}</strong> of{" "}
              <strong className="text-foreground">{totalItems}</strong> cases
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
                className="font-bold text-xs h-9 px-3 gap-1"
              >
                <ChevronLeft className="size-4" /> Previous
              </Button>
              <span className="font-semibold text-xs px-2">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => handlePageChange(page + 1)}
                className="font-bold text-xs h-9 px-3 gap-1"
              >
                Next <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <OpenCaseDialog
        open={isOpenCaseModalOpen}
        onOpenChange={setIsOpenCaseModalOpen}
        onCaseOpened={(newCase) => {
          setIsOpenCaseModalOpen(false)
          if (newCase?.id) {
            navigate(`/cases/${newCase.id}`)
          }
        }}
      />
    </div>
  )
}
