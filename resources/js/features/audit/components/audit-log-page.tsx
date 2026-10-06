import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  ShieldCheck,
  History,
  ChevronLeft,
  ChevronRight,
  User,
  Clock,
  PlusCircle,
  Edit3,
  Trash2,
  RotateCcw,
  ExternalLink,
} from "lucide-react"
import { useActivityLog } from "../hooks/use-activity-log"
import { AuditLogFiltersView } from "./audit-log-filters"
import type { ActivityLogFilters } from "../api/activity-log-api"

interface AuditLogPageProps {
  onSelectPatient?: (patientId: string) => void
}

function getEventBadge(event: string | null) {
  switch (event) {
    case "created":
      return (
        <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 font-bold">
          <PlusCircle className="size-3" /> Created
        </Badge>
      )
    case "updated":
      return (
        <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 gap-1 font-bold">
          <Edit3 className="size-3" /> Updated
        </Badge>
      )
    case "deleted":
      return (
        <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 gap-1 font-bold">
          <Trash2 className="size-3" /> Deleted
        </Badge>
      )
    case "restored":
      return (
        <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 gap-1 font-bold">
          <RotateCcw className="size-3" /> Restored
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="text-xs font-semibold">
          {event || "event"}
        </Badge>
      )
  }
}

export const AuditLogPage: React.FC<AuditLogPageProps> = ({ onSelectPatient }) => {
  // Synchronize state with URL Search Params
  const [filters, setFilters] = useState<ActivityLogFilters>(() => {
    const params = new URLSearchParams(window.location.search)
    return {
      page: params.get("page") ? Number(params.get("page")) : 1,
      perPage: 25,
      userId: params.get("user") ? Number(params.get("user")) : undefined,
      event: (params.get("event") as "created" | "updated" | "deleted") || undefined,
      subjectType: params.get("subject") || undefined,
      dateFrom: params.get("from") || undefined,
      dateTo: params.get("to") || undefined,
    }
  })

  // Sync back to URL
  useEffect(() => {
    const params = new URLSearchParams()
    if (filters.page && filters.page > 1) params.set("page", String(filters.page))
    if (filters.userId) params.set("user", String(filters.userId))
    if (filters.event) params.set("event", filters.event)
    if (filters.subjectType) params.set("subject", filters.subjectType)
    if (filters.dateFrom) params.set("from", filters.dateFrom)
    if (filters.dateTo) params.set("to", filters.dateTo)

    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname
    window.history.replaceState(null, "", newUrl)
  }, [filters])

  const { data, isLoading, isError } = useActivityLog(filters)

  const handleFilterChange = (updated: Partial<ActivityLogFilters>) => {
    setFilters((prev) => ({ ...prev, ...updated }))
  }

  const handleClearFilters = () => {
    setFilters({ page: 1, perPage: 25 })
  }

  const activities = data?.data ?? []
  const page = data?.meta?.current_page ?? filters.page ?? 1
  const totalPages = data?.meta?.last_page ?? 1
  const total = data?.meta?.total ?? 0

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-background text-foreground p-6 space-y-6">
      {/* Page Header */}
      <div className="border-b border-border bg-card p-6 rounded-xl shadow-2xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/15 p-3 text-primary">
              <History className="size-6" />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-extrabold tracking-tight">
                System Activity &amp; Audit Log
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Centralized cross-patient audit trail of all intake, assessment, and custody operations.
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="font-mono text-xs px-3 py-1">
            Total {total} Events Recorded
          </Badge>
        </div>
      </div>

      {/* Filters Bar */}
      <AuditLogFiltersView
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />

      {/* Main Audit Log Table Card */}
      <Card className="flex-1 flex flex-col justify-between">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center justify-between">
            <span>Audit Trail Entries</span>
            <span className="text-xs font-mono font-normal text-muted-foreground">
              Page {page} of {totalPages}
            </span>
          </CardTitle>
          <CardDescription className="text-xs">
            Chronological audit events with user provenance and record links.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
              <Spinner className="size-6 mb-2" />
              <p className="text-xs font-semibold">Loading activity logs...</p>
            </div>
          ) : isError ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center text-xs text-destructive font-semibold">
              Failed to load activity log. Please check your backend connection.
            </div>
          ) : activities.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground space-y-2">
              <ShieldCheck className="size-10 mx-auto stroke-1 opacity-50" />
              <p className="text-sm font-bold text-foreground">No activity log entries found</p>
              <p className="text-xs">No audit events match the selected filter criteria.</p>
              <Button variant="outline" size="sm" onClick={handleClearFilters} className="mt-2 text-xs">
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 font-mono text-muted-foreground border-b border-border uppercase">
                  <tr>
                    <th className="p-3.5 font-bold">Timestamp</th>
                    <th className="p-3.5 font-bold">User / Staff</th>
                    <th className="p-3.5 font-bold">Action Event</th>
                    <th className="p-3.5 font-bold">Subject / Record</th>
                    <th className="p-3.5 font-bold">Patient Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {activities.map((act) => (
                    <tr key={act.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3.5 font-mono text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="size-3 text-primary" />
                          <span>{act.created_at ? new Date(act.created_at).toLocaleString() : "—"}</span>
                        </div>
                      </td>

                      <td className="p-3.5 font-bold text-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <User className="size-3 text-muted-foreground" />
                          <span>{act.causer?.name || "System"}</span>
                        </div>
                      </td>

                      <td className="p-3.5 whitespace-nowrap">{getEventBadge(act.event)}</td>

                      <td className="p-3.5">
                        <div className="font-bold text-foreground">
                          {act.subject_label || act.description || act.event}
                        </div>
                        {act.subject_type && (
                          <div className="text-[11px] font-mono text-muted-foreground">
                            {act.subject_type} #{act.subject_id}
                          </div>
                        )}
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        {act.patient_id != null ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (act.patient_id != null) {
                                onSelectPatient?.(String(act.patient_id))
                              }
                            }}
                            className="h-7 text-xs font-semibold gap-1 text-primary hover:underline px-2"
                          >
                            Patient #{act.patient_id} <ExternalLink className="size-3" />
                          </Button>
                        ) : (
                          <span className="text-muted-foreground italic">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>

        {/* Pager Footer */}
        <div className="flex items-center justify-between border-t border-border p-4 text-xs text-muted-foreground">
          <span>
            Page <strong className="text-foreground">{page}</strong> of{" "}
            <strong className="text-foreground">{totalPages}</strong> ({total} entries total)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => handleFilterChange({ page: page - 1 })}
              className="gap-1 font-semibold text-xs h-8"
            >
              <ChevronLeft className="size-4" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => handleFilterChange({ page: page + 1 })}
              className="gap-1 font-semibold text-xs h-8"
            >
              Next <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
