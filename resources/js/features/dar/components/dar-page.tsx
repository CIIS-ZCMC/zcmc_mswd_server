import React, { useMemo, useState } from "react"
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Edit2,
  FileSpreadsheet,
  FileText,
  Loader2,
  Plus,
  Printer,
  Search,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { exportDarCsv, exportDarPdf } from "../api/dar-api"
import { useDarEntries, useDeleteDarEntry } from "../hooks/use-dar"
import { DarEntryDialog } from "./dar-entry-dialog"
import type { DarEntry } from "../types/dar.types"

interface DarPageProps {
  initialDate?: string
}

function formatDisplayTime(time: string | null): string {
  if (!time) return "—"
  const parts = time.split(":")
  if (parts.length < 2) return time
  const hours = parseInt(parts[0], 10)
  const minutes = parts[1]
  const ampm = hours >= 12 ? "PM" : "AM"
  const formattedHours = hours % 12 || 12
  return `${formattedHours}:${minutes} ${ampm}`
}

/**
 * A YYYY-MM-DD date moved by whole days. Done in UTC on both ends so the
 * viewer's timezone can never turn one day into two or zero.
 */
function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().substring(0, 10)
}

export const DarPage: React.FC<DarPageProps> = ({ initialDate }) => {
  // Server-prop today fallback (SSR safe)
  const today = useMemo(() => {
    return initialDate || new Date().toISOString().substring(0, 10)
  }, [initialDate])

  const [currentDate, setCurrentDate] = useState<string>(today)
  const [filterSearch, setFilterSearch] = useState("")
  const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<DarEntry | null>(null)
  const [deletingEntry, setDeletingEntry] = useState<DarEntry | null>(null)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [isExportingCsv, setIsExportingCsv] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  // Query DAR entries for the selected date
  const { data: darData, isLoading, isFetching } = useDarEntries(currentDate)
  const deleteMutation = useDeleteDarEntry()

  const summary = darData?.summary
  const activitiesMap = darData?.activities

  // Filter entries in memory by patient name, ID, or activity
  const filteredEntries = useMemo(() => {
    const list = darData?.data ?? []
    const q = filterSearch.trim().toLowerCase()
    if (!q) return list

    return list.filter((item) => {
      const p = item.patient
      const matchName = p?.name?.toLowerCase().includes(q)
      const matchHosp = String(p?.hospital_id ?? "")
        .toLowerCase()
        .includes(q)
      const matchMswd = String(p?.mswd_id ?? "")
        .toLowerCase()
        .includes(q)
      const matchActivity =
        item.activity_label?.toLowerCase().includes(q) ||
        item.activity.toLowerCase().includes(q)
      const matchRemarks = item.remarks?.toLowerCase().includes(q)
      return (
        matchName || matchHosp || matchMswd || matchActivity || matchRemarks
      )
    })
  }, [darData?.data, filterSearch])

  // Date navigation handlers
  const handlePrevDay = () => {
    setCurrentDate(shiftDate(currentDate, -1))
  }

  const handleNextDay = () => {
    const nextDate = shiftDate(currentDate, 1)
    if (nextDate <= today) {
      setCurrentDate(nextDate)
    }
  }

  const isToday = currentDate === today
  const isFuture = currentDate > today

  // Export handlers
  const handlePrintPdf = async () => {
    setIsExportingPdf(true)
    setExportError(null)
    try {
      await exportDarPdf(currentDate)
    } catch (err: unknown) {
      setExportError(
        err instanceof Error ? err.message : "Failed to open PDF report."
      )
    } finally {
      setIsExportingPdf(false)
    }
  }

  const handleExportCsv = async () => {
    setIsExportingCsv(true)
    setExportError(null)
    try {
      await exportDarCsv(currentDate)
    } catch (err: unknown) {
      setExportError(
        err instanceof Error ? err.message : "Failed to export CSV."
      )
    } finally {
      setIsExportingCsv(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingEntry) return
    try {
      await deleteMutation.mutateAsync(deletingEntry.id)
      setDeletingEntry(null)
    } catch (err: unknown) {
      setExportError(
        err instanceof Error ? err.message : "Failed to delete entry."
      )
    }
  }

  return (
    <div className="flex-1 space-y-6 overflow-y-auto bg-background p-4 sm:p-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 border-b pb-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <ClipboardList className="size-6 shrink-0 text-primary" />
            <h1 className="font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Daily Accomplishment Report (DAR)
            </h1>
          </div>
          <p className="text-xs font-medium text-muted-foreground sm:text-sm">
            Personal daily log of patients served and medical social services
            rendered.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrintPdf}
            disabled={isExportingPdf || isLoading}
            className="h-9 cursor-pointer gap-2 px-3.5 text-xs font-bold shadow-2xs sm:text-sm"
          >
            {isExportingPdf ? (
              <Loader2 className="size-4 animate-spin text-primary" />
            ) : (
              <Printer className="size-4 text-primary" />
            )}
            <span>Print PDF</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={isExportingCsv || isLoading}
            className="h-9 cursor-pointer gap-2 px-3.5 text-xs font-bold shadow-2xs sm:text-sm"
          >
            {isExportingCsv ? (
              <Loader2 className="size-4 animate-spin text-primary" />
            ) : (
              <FileSpreadsheet className="size-4 text-emerald-600 dark:text-emerald-400" />
            )}
            <span>Export CSV</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => {
              setEditingEntry(null)
              setIsEntryDialogOpen(true)
            }}
            className="h-9 cursor-pointer gap-2 px-4 text-xs font-bold shadow-2xs sm:text-sm"
          >
            <Plus className="size-4" />
            <span>Add Entry</span>
          </Button>
        </div>
      </div>

      {exportError && (
        <Alert variant="destructive">
          <AlertTitle className="text-xs font-bold">Action Failed</AlertTitle>
          <AlertDescription className="mt-0.5 text-xs">
            {exportError}
          </AlertDescription>
        </Alert>
      )}

      {/* Date Control Toolbar */}
      <div className="flex flex-col items-stretch justify-between gap-3 rounded-xl border bg-muted/40 p-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handlePrevDay}
            className="size-9 shrink-0 cursor-pointer"
            title="Previous Day"
          >
            <ChevronLeft className="size-4" />
          </Button>

          <div className="relative flex items-center">
            <CalendarIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              value={currentDate}
              max={today}
              onChange={(e) => {
                if (e.target.value && e.target.value <= today) {
                  setCurrentDate(e.target.value)
                }
              }}
              className="h-9 w-44 pr-3 pl-9 text-xs font-bold sm:text-sm"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleNextDay}
            disabled={isToday || isFuture}
            className="size-9 shrink-0 cursor-pointer disabled:opacity-40"
            title="Next Day"
          >
            <ChevronRight className="size-4" />
          </Button>

          {!isToday && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCurrentDate(today)}
              className="h-9 cursor-pointer px-2.5 text-xs font-bold text-primary hover:text-primary"
            >
              Today
            </Button>
          )}

          {isFetching && !isLoading && (
            <Loader2 className="ml-1 size-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* In-memory quick filter search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder={
              isToday ? "Filter today's entries…" : "Filter this day's entries…"
            }
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            className="h-9 pr-8 pl-9 text-xs font-medium sm:text-sm"
          />
          {filterSearch && (
            <button
              type="button"
              onClick={() => setFilterSearch("")}
              className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards & Activity Chips */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border shadow-2xs">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="shrink-0 rounded-xl bg-primary/10 p-2.5 text-primary">
              <Users className="size-5" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <div className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Patients Served
              </div>
              <div className="text-2xl font-extrabold text-foreground">
                {isLoading ? (
                  <Skeleton className="h-7 w-12" />
                ) : (
                  (summary?.patients_served ?? 0)
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-2xs">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="shrink-0 rounded-xl bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400">
              <UserCheck className="size-5" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <div className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Total DAR Entries
              </div>
              <div className="text-2xl font-extrabold text-foreground">
                {isLoading ? (
                  <Skeleton className="h-7 w-12" />
                ) : (
                  (summary?.entries ?? 0)
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-2xs sm:col-span-2">
          <CardContent className="space-y-2 p-4">
            <div className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-muted-foreground uppercase">
              <FileText className="size-3.5 text-primary" /> Activity Breakdown
            </div>
            {isLoading ? (
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20 rounded-md" />
                <Skeleton className="h-6 w-24 rounded-md" />
                <Skeleton className="h-6 w-16 rounded-md" />
              </div>
            ) : summary?.by_activity &&
              Object.keys(summary.by_activity).length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(summary.by_activity).map(
                  ([actLabel, count]) => (
                    <Badge
                      key={actLabel}
                      variant="secondary"
                      className="gap-1.5 border bg-muted/80 px-2 py-0.5 text-xs font-semibold"
                    >
                      <span>{actLabel}</span>
                      <span className="rounded-full bg-primary/15 px-1.5 py-px text-[10px] font-bold text-primary">
                        {count}
                      </span>
                    </Badge>
                  )
                )}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground italic">
                No activity logged yet for this date.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Entries Table */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-2xs">
        <div className="flex items-center justify-between border-b bg-muted/20 p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <ClipboardList className="size-4 text-primary" />
            <span>DAR Entries for {currentDate}</span>
            <Badge variant="outline" className="font-mono text-xs">
              {filteredEntries.length}{" "}
              {filteredEntries.length === 1 ? "entry" : "entries"}
            </Badge>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table className="text-sm">
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-12 text-center text-xs font-bold text-foreground">
                  #
                </TableHead>
                <TableHead className="w-28 text-xs font-bold text-foreground">
                  Time Served
                </TableHead>
                <TableHead className="min-w-48 text-xs font-bold text-foreground">
                  Patient Name
                </TableHead>
                <TableHead className="w-40 text-xs font-bold text-foreground">
                  Hospital / MSWD ID
                </TableHead>
                <TableHead className="w-28 text-xs font-bold text-foreground">
                  Age / Sex
                </TableHead>
                <TableHead className="w-44 text-xs font-bold text-foreground">
                  Activity / Service
                </TableHead>
                <TableHead className="min-w-56 text-xs font-bold text-foreground">
                  Remarks
                </TableHead>
                <TableHead className="w-24 pr-4 text-right text-xs font-bold text-foreground">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Skeleton className="mx-auto h-4 w-6" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-36" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-44" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="ml-auto h-4 w-14" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredEntries.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-12 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <ClipboardList className="size-8 text-muted-foreground/60" />
                      <p className="text-sm font-semibold text-foreground">
                        {filterSearch
                          ? "No matching DAR entries found."
                          : "No DAR entries recorded for this date."}
                      </p>
                      <p className="max-w-sm text-xs">
                        {filterSearch
                          ? "Try adjusting your search filter."
                          : "Click 'Add Entry' above to log a patient served and activity rendered."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredEntries.map((item, index) => {
                  const p = item.patient
                  return (
                    <TableRow
                      key={item.id}
                      className="transition-colors hover:bg-muted/30"
                    >
                      <TableCell className="text-center font-mono text-xs font-bold text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-1.5">
                          <Clock className="size-3.5 shrink-0 text-muted-foreground" />
                          <span>{formatDisplayTime(item.served_time)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="text-sm font-bold text-foreground">
                            {p?.name ?? "Unknown Patient"}
                          </div>
                          {p?.address && (
                            <div
                              className="max-w-xs truncate text-xs text-muted-foreground"
                              title={p.address}
                            >
                              {p.address}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5 font-mono text-xs">
                          {p?.hospital_id && (
                            <div className="text-foreground">
                              Hosp #{p.hospital_id}
                            </div>
                          )}
                          {p?.mswd_id && (
                            <div className="text-muted-foreground">
                              MSWD #{p.mswd_id}
                            </div>
                          )}
                          {!p?.hospital_id && !p?.mswd_id && <span>—</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {p?.age !== null && p?.age !== undefined
                          ? `${p.age} y/o`
                          : "—"}
                        {p?.sex ? ` · ${p.sex}` : ""}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="border border-primary/20 bg-primary/10 text-xs font-bold text-primary"
                        >
                          {item.activity_label || item.activity}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-md text-xs font-medium text-muted-foreground">
                        {item.remarks ? (
                          <span className="line-clamp-2" title={item.remarks}>
                            {item.remarks}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60 italic">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingEntry(item)
                              setIsEntryDialogOpen(true)
                            }}
                            className="size-8 cursor-pointer text-muted-foreground hover:text-foreground"
                            title="Edit entry"
                          >
                            <Edit2 className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingEntry(item)}
                            className="size-8 cursor-pointer text-muted-foreground hover:text-destructive"
                            title="Delete entry"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add / Edit Entry Dialog */}
      <DarEntryDialog
        open={isEntryDialogOpen}
        onOpenChange={setIsEntryDialogOpen}
        currentDate={currentDate}
        entry={editingEntry}
        activitiesMap={activitiesMap}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(deletingEntry)}
        onOpenChange={(open) => !open && setDeletingEntry(null)}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-destructive">
              <Trash2 className="size-5 shrink-0" />
              Delete DAR Entry
            </DialogTitle>
            <DialogDescription className="text-xs font-medium sm:text-sm">
              Are you sure you want to remove this DAR line for{" "}
              <strong className="text-foreground">
                {deletingEntry?.patient?.name}
              </strong>{" "}
              ({deletingEntry?.activity_label})?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingEntry(null)}
              disabled={deleteMutation.isPending}
              className="h-9 px-4 text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="h-9 gap-1.5 px-4 text-xs font-bold"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
              Delete Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
