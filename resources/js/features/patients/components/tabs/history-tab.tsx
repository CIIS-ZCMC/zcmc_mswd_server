import React, { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import {
  History,
  ChevronDown,
  ChevronRight,
  FilterX,
  Search,
  Calendar,
  User,
  PlusCircle,
  Edit3,
  Trash2,
  RotateCcw,
  Clock,
} from "lucide-react"
import type { PatientRecord } from "../../types"
import type { AuditFieldChange, AuditHistory, AuditEvent } from "../../types/audit.types"

interface HistoryTabProps {
  patient: PatientRecord
}

function formatDiffValue(field: string, val: unknown): string {
  if (val === null || val === undefined || val === "") return "(empty)"
  if (typeof val === "boolean") return val ? "Yes" : "No"

  const lowerField = field.toLowerCase()
  if (
    lowerField.includes("income") ||
    lowerField.includes("amount") ||
    lowerField.includes("subsidy") ||
    lowerField.includes("grant")
  ) {
    const num = Number(val)
    if (!isNaN(num)) {
      return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(num)
    }
  }

  if (typeof val === "object") return JSON.stringify(val)
  return String(val)
}

function getEventBadge(event: AuditEvent) {
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
          {event}
        </Badge>
      )
  }
}

function formatRelativeTime(timestampStr: string): string {
  try {
    const date = new Date(timestampStr)
    if (isNaN(date.getTime())) return timestampStr

    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffHours < 1) return "Just now"
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  } catch {
    return timestampStr
  }
}

function getDateHeader(timestampStr: string): string {
  try {
    const date = new Date(timestampStr)
    if (isNaN(date.getTime())) return "Timeline History"

    const now = new Date()
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()

    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear()

    if (isToday) return "Today"
    if (isYesterday) return "Yesterday"
    return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
  } catch {
    return "Timeline History"
  }
}

export const HistoryTab: React.FC<HistoryTabProps> = ({ patient }) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")
  const [userFilter, setUserFilter] = useState("ALL")
  const [eventFilter, setEventFilter] = useState<string>("ALL")
  const [subjectFilter, setSubjectFilter] = useState("ALL")

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Unique users & subject types for filter dropdowns
  const uniqueUsers = useMemo(() => {
    const set = new Set<string>()
    patient.history.forEach((h) => {
      if (h.performedBy) set.add(h.performedBy)
    })
    return Array.from(set)
  }, [patient.history])

  const uniqueSubjects = useMemo(() => {
    const set = new Set<string>()
    patient.history.forEach((h) => {
      if (h.subjectType) set.add(h.subjectType)
    })
    return Array.from(set)
  }, [patient.history])

  const filteredHistory = useMemo(() => {
    return patient.history.filter((item) => {
      if (userFilter !== "ALL" && item.performedBy !== userFilter) return false
      if (eventFilter !== "ALL" && item.event !== eventFilter) return false
      if (subjectFilter !== "ALL" && item.subjectType !== subjectFilter) return false

      if (search.trim()) {
        const q = search.toLowerCase()
        const matchAction = item.action.toLowerCase().includes(q)
        const matchDetails = item.details.toLowerCase().includes(q)
        const matchLabel = item.subjectLabel?.toLowerCase().includes(q) ?? false
        const matchUser = item.performedBy.toLowerCase().includes(q)
        if (!matchAction && !matchDetails && !matchLabel && !matchUser) return false
      }

      return true
    })
  }, [patient.history, userFilter, eventFilter, subjectFilter, search])

  // Group by Date Header
  const groupedHistory = useMemo(() => {
    const groups: Record<string, AuditHistory[]> = {}
    filteredHistory.forEach((item) => {
      const header = getDateHeader(item.timestamp)
      if (!groups[header]) groups[header] = []
      groups[header].push(item)
    })
    return groups
  }, [filteredHistory])

  const hasActiveFilters = search !== "" || userFilter !== "ALL" || eventFilter !== "ALL" || subjectFilter !== "ALL"

  const clearFilters = () => {
    setSearch("")
    setUserFilter("ALL")
    setEventFilter("ALL")
    setSubjectFilter("ALL")
  }

  return (
    <Card className="space-y-4">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <History className="size-5 text-primary" />
              Patient Audit Trail &amp; Accountability Log
            </CardTitle>
            <CardDescription className="text-xs">
              Field-level diffs, action provenance, and chronological history of all updates to this record.
            </CardDescription>
          </div>

          <div className="text-xs font-mono text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg border border-border">
            Showing <strong className="text-foreground font-bold">{filteredHistory.length}</strong> of{" "}
            {patient.history.length} entries
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search history..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <NativeSelect
            size="sm"
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="h-9 text-xs"
          >
            <option value="ALL">All Users / Staff</option>
            {uniqueUsers.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </NativeSelect>

          <NativeSelect
            size="sm"
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="h-9 text-xs"
          >
            <option value="ALL">All Event Types</option>
            <option value="created">Created</option>
            <option value="updated">Updated</option>
            <option value="deleted">Deleted</option>
          </NativeSelect>

          <div className="flex items-center gap-2">
            <NativeSelect
              size="sm"
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="h-9 text-xs flex-1"
            >
              <option value="ALL">All Record Types</option>
              {uniqueSubjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </NativeSelect>

            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="h-9 px-2.5 shrink-0"
                title="Clear Filters"
              >
                <FilterX className="size-4 text-muted-foreground" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {filteredHistory.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground space-y-2">
            <History className="size-10 mx-auto stroke-1 opacity-50" />
            <p className="text-sm font-bold text-foreground">No audit entries found</p>
            <p className="text-xs">
              {hasActiveFilters
                ? "No history matches your current filters. Try resetting the filters."
                : "No audit trail entries recorded for this patient yet."}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters} className="mt-2 text-xs">
                Reset Filters
              </Button>
            )}
          </div>
        ) : (
          Object.entries(groupedHistory).map(([dateGroup, items]) => (
            <div key={dateGroup} className="space-y-3">
              {/* Sticky Date Group Header */}
              <div className="sticky top-0 z-10 flex items-center gap-2 bg-muted/80 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-border/60 text-xs font-bold text-foreground font-mono">
                <Calendar className="size-3.5 text-primary" />
                <span>{dateGroup}</span>
              </div>

              {/* Timeline Items */}
              <div className="space-y-3 pl-2 sm:pl-4">
                {items.map((hist) => {
                  const isExpanded = expandedIds.has(hist.id)
                  const hasChanges = hist.changes && hist.changes.length > 0

                  return (
                    <div
                      key={hist.id}
                      className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs space-y-3 transition-all hover:border-border"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {getEventBadge(hist.event)}
                            <span className="font-extrabold text-base text-foreground">
                              {hist.subjectLabel || hist.action}
                            </span>
                            {hist.subjectType && (
                              <Badge variant="secondary" className="text-xs font-mono px-2 py-0.5">
                                {hist.subjectType}
                              </Badge>
                            )}
                          </div>

                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {hist.details}
                          </p>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                            <span className="flex items-center gap-1 font-semibold text-foreground">
                              <User className="size-3 text-primary" />
                              {hist.performedBy}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1 font-mono text-xs" title={hist.timestamp}>
                              <Clock className="size-3 text-muted-foreground" />
                              {formatRelativeTime(hist.timestamp)} ({hist.timestamp})
                            </span>
                          </div>
                        </div>

                        {hasChanges && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpand(hist.id)}
                            className="gap-1 text-xs font-bold shrink-0 h-8"
                          >
                            {isExpanded ? (
                              <>
                                Hide Diffs <ChevronDown className="size-3.5" />
                              </>
                            ) : (
                              <>
                                View Diff ({hist.changes.length}) <ChevronRight className="size-3.5" />
                              </>
                            )}
                          </Button>
                        )}
                      </div>

                      {/* Field-Level Diffs Table */}
                      {hasChanges && isExpanded && (
                        <div className="rounded-lg border border-border bg-muted/30 p-3 pt-2 text-xs space-y-2 mt-2">
                          <div className="font-bold text-xs text-foreground font-mono flex items-center justify-between border-b border-border/60 pb-1.5">
                            <span>Field Changes</span>
                            <span className="text-muted-foreground font-normal">Before → After</span>
                          </div>

                          <div className="divide-y divide-border/40">
                            {hist.changes.map((change: AuditFieldChange, idx: number) => (
                              <div
                                key={`${change.field}-${idx}`}
                                className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-2 items-start"
                              >
                                <span className="font-bold text-foreground font-mono">
                                  {change.label || change.field}
                                </span>
                                <div className="sm:col-span-2 grid grid-cols-2 gap-2 text-xs font-mono">
                                  <span className="rounded bg-destructive/10 text-destructive px-2 py-1 line-through break-all">
                                    {formatDiffValue(change.field, change.from)}
                                  </span>
                                  <span className="rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold px-2 py-1 break-all">
                                    {formatDiffValue(change.field, change.to)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
