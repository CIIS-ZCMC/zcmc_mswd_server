import React, { useState } from "react"
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  Hourglass,
  Loader2,
  Play,
  RefreshCw,
  ShieldAlert,
  Timer,
  UserCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ReportsSubnav } from "./reports-subnav"
import {
  useTurnaroundExport,
  useTurnaroundReport,
} from "../hooks/use-turnaround-reports"

function getFirstDayOfMonth(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1)
    .toISOString()
    .substring(0, 10)
}

function getToday(): string {
  return new Date().toISOString().substring(0, 10)
}

function formatMins(val: number | null | undefined): string {
  if (val === null || val === undefined) return "—"
  return `${Math.round(val)}m`
}

function formatDecimalMins(val: number | null | undefined): string {
  if (val === null || val === undefined) return "—"
  return `${Number(val).toFixed(1)}m`
}

function formatPct(val: number | null | undefined): string {
  if (val === null || val === undefined) return "—"
  return `${Number(val).toFixed(1)}%`
}

export const TurnaroundReportsPage: React.FC = () => {
  const [datePreset, setDatePreset] = useState<string>("this_month")
  const [dateFrom, setDateFrom] = useState<string>(getFirstDayOfMonth)
  const [dateTo, setDateTo] = useState<string>(getToday)

  const handlePresetChange = (preset: string) => {
    setDatePreset(preset)
    const now = new Date()
    if (preset === "today") {
      const today = now.toISOString().substring(0, 10)
      setDateFrom(today)
      setDateTo(today)
    } else if (preset === "this_week") {
      const first = now.getDate() - now.getDay()
      const firstDay = new Date(now.setDate(first))
        .toISOString()
        .substring(0, 10)
      setDateFrom(firstDay)
      setDateTo(new Date().toISOString().substring(0, 10))
    } else if (preset === "this_month") {
      setDateFrom(
        new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .substring(0, 10)
      )
      setDateTo(now.toISOString().substring(0, 10))
    } else if (preset === "last_month") {
      setDateFrom(
        new Date(now.getFullYear(), now.getMonth() - 1, 1)
          .toISOString()
          .substring(0, 10)
      )
      setDateTo(
        new Date(now.getFullYear(), now.getMonth(), 0)
          .toISOString()
          .substring(0, 10)
      )
    } else if (preset === "this_quarter") {
      const qMonth = Math.floor(now.getMonth() / 3) * 3
      setDateFrom(
        new Date(now.getFullYear(), qMonth, 1).toISOString().substring(0, 10)
      )
      setDateTo(now.toISOString().substring(0, 10))
    } else if (preset === "year_to_date") {
      setDateFrom(
        new Date(now.getFullYear(), 0, 1).toISOString().substring(0, 10)
      )
      setDateTo(now.toISOString().substring(0, 10))
    }
  }

  const { data, isLoading, isFetching, refetch, error } = useTurnaroundReport(
    dateFrom,
    dateTo
  )
  const { downloadExport, isExporting, canGenerate } = useTurnaroundExport()

  const stages = data?.stages
  const waitingStats = stages?.waiting
  const processingStats = stages?.processing
  const totalStats = stages?.total

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-background text-foreground transition-colors duration-200">
      {/* Sub Navigation */}
      <ReportsSubnav />

      {/* Header Banner */}
      <div className="border-b border-border bg-card p-6 shadow-2xs">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex size-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-xs">
              <Timer className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Turnaround Time (TAT) Analytics
              </h1>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Service delivery benchmarks, waiting and processing durations,
                and Citizen&apos;s Charter compliance.
              </p>
            </div>
          </div>

          {/* Export Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-9 gap-1.5 text-xs font-semibold"
            >
              <RefreshCw
                className={`size-3.5 ${isFetching ? "animate-spin text-primary" : ""}`}
              />
              Refresh
            </Button>

            {canGenerate && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3.5 text-xs font-bold text-primary shadow-xs hover:bg-primary/20"
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Download className="size-3.5" />
                  )}
                  Export Report
                  <ChevronDown className="size-3 opacity-70" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 p-1">
                  <DropdownMenuItem
                    onClick={() => downloadExport(dateFrom, dateTo, "csv")}
                    className="cursor-pointer gap-2 text-xs font-semibold"
                  >
                    <FileSpreadsheet className="size-4 text-emerald-600" />
                    <span>Download CSV</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => downloadExport(dateFrom, dateTo, "pdf")}
                    className="cursor-pointer gap-2 text-xs font-semibold"
                  >
                    <FileText className="size-4 text-red-600" />
                    <span>Download PDF</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Date Filter Bar */}
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border/60 pt-4">
          <div className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-background/60 p-1">
            {[
              { id: "today", label: "Today" },
              { id: "this_week", label: "This Week" },
              { id: "this_month", label: "This Month" },
              { id: "last_month", label: "Last Month" },
              { id: "this_quarter", label: "This Quarter" },
              { id: "year_to_date", label: "Year to Date" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => handlePresetChange(p.id)}
                className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                  datePreset === p.id
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-border/80 bg-background px-2.5 py-1 text-xs">
              <span className="font-medium text-muted-foreground">From:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value)
                  setDatePreset("custom")
                }}
                className="bg-transparent font-semibold text-foreground focus:outline-none"
              />
            </div>
            <span className="text-xs font-bold text-muted-foreground">→</span>
            <div className="flex items-center gap-1 rounded-lg border border-border/80 bg-background px-2.5 py-1 text-xs">
              <span className="font-medium text-muted-foreground">To:</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value)
                  setDatePreset("custom")
                }}
                className="bg-transparent font-semibold text-foreground focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-6 p-6">
        {/* Protective Exclusion Notice */}
        {data?.protective_excluded && (
          <Alert className="border-amber-500/30 bg-amber-500/5 text-foreground">
            <ShieldAlert className="size-4 text-amber-600 dark:text-amber-400" />
            <AlertTitle className="text-xs font-bold">
              Protective Cases Excluded
            </AlertTitle>
            <AlertDescription className="text-xs text-muted-foreground">
              Visits associated with protective cases are excluded from these
              totals. Users with the{" "}
              <code className="font-mono text-[11px] text-primary">
                audit.view_protective
              </code>{" "}
              permission can view unredacted metrics.
            </AlertDescription>
          </Alert>
        )}

        {/* Error Notice */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle className="text-xs font-bold">
              Failed to load turnaround statistics
            </AlertTitle>
            <AlertDescription className="text-xs">
              Please check your connection or contact an administrator.
            </AlertDescription>
          </Alert>
        )}

        {/* KPI Tiles Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* Card 1: Completed Visits */}
          <Card className="border border-border/80 bg-card shadow-2xs">
            <CardContent className="space-y-1 p-4">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-bold tracking-wider uppercase">
                  Completed Visits
                </span>
                <CheckCircle2 className="size-4 text-emerald-500" />
              </div>
              <div className="font-mono text-2xl font-black text-foreground">
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  (data?.completed ?? 0)
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Fully served patients in range
              </p>
            </CardContent>
          </Card>

          {/* Card 2: Cancelled Visits */}
          <Card className="border border-border/80 bg-card shadow-2xs">
            <CardContent className="space-y-1 p-4">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-bold tracking-wider uppercase">
                  Cancelled Visits
                </span>
                <Clock className="size-4 text-muted-foreground" />
              </div>
              <div className="font-mono text-2xl font-black text-foreground">
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  (data?.cancelled ?? 0)
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Excluded from turnaround figures
              </p>
            </CardContent>
          </Card>

          {/* Card 3: Waiting Compliance */}
          <Card className="border border-border/80 bg-card shadow-2xs">
            <CardContent className="space-y-1 p-4">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-bold tracking-wider uppercase">
                  Waiting Compliance
                </span>
                <Hourglass className="size-4 text-amber-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-2xl font-black text-foreground">
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    formatPct(waitingStats?.within_target_pct)
                  )}
                </span>
                {data?.targets?.waiting && (
                  <span className="font-mono text-xs text-muted-foreground">
                    (&le; {data.targets.waiting}m)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Avg: {formatDecimalMins(waitingStats?.avg)} · p90:{" "}
                {formatMins(waitingStats?.p90)}
              </p>
            </CardContent>
          </Card>

          {/* Card 4: Processing Compliance */}
          <Card className="border border-border/80 bg-card shadow-2xs">
            <CardContent className="space-y-1 p-4">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-bold tracking-wider uppercase">
                  Processing Compliance
                </span>
                <Play className="size-4 text-blue-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-2xl font-black text-foreground">
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    formatPct(processingStats?.within_target_pct)
                  )}
                </span>
                {data?.targets?.processing && (
                  <span className="font-mono text-xs text-muted-foreground">
                    (&le; {data.targets.processing}m)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Avg: {formatDecimalMins(processingStats?.avg)} · p90:{" "}
                {formatMins(processingStats?.p90)}
              </p>
            </CardContent>
          </Card>

          {/* Card 5: Total TAT Compliance */}
          <Card className="border border-border/80 bg-card shadow-2xs">
            <CardContent className="space-y-1 p-4">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-bold tracking-wider uppercase">
                  Overall TAT Compliance
                </span>
                <Timer className="size-4 text-primary" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-2xl font-black text-foreground">
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    formatPct(totalStats?.within_target_pct)
                  )}
                </span>
                {data?.targets?.total && (
                  <span className="font-mono text-xs text-muted-foreground">
                    (&le; {data.targets.total}m)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Avg: {formatDecimalMins(totalStats?.avg)} · Median:{" "}
                {formatMins(totalStats?.median)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Stage Performance Breakdown Table */}
        <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs">
          <div className="border-b border-border/80 bg-muted/40 px-5 py-3">
            <h3 className="text-sm font-bold text-foreground">
              Service Stage Benchmarks (Citizen&apos;s Charter)
            </h3>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="border-border/60">
                <TableHead className="text-xs">Stage</TableHead>
                <TableHead className="text-center text-xs">
                  Target Threshold
                </TableHead>
                <TableHead className="text-center text-xs">
                  Visits Count
                </TableHead>
                <TableHead className="text-center text-xs">Average</TableHead>
                <TableHead className="text-center text-xs">Median</TableHead>
                <TableHead className="text-center text-xs">
                  90th Percentile (p90)
                </TableHead>
                <TableHead className="text-center text-xs">Maximum</TableHead>
                <TableHead className="text-right text-xs">
                  Target Compliance
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                {
                  id: "waiting",
                  label: "Waiting Time",
                  target: data?.targets?.waiting,
                  stats: waitingStats,
                },
                {
                  id: "processing",
                  label: "Processing Time",
                  target: data?.targets?.processing,
                  stats: processingStats,
                },
                {
                  id: "total",
                  label: "Total Turnaround Time (TAT)",
                  target: data?.targets?.total,
                  stats: totalStats,
                },
              ].map((row) => (
                <TableRow
                  key={row.id}
                  className="text-xs font-medium hover:bg-muted/20"
                >
                  <TableCell className="font-bold text-foreground">
                    {row.label}
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    {row.target ? `${row.target} mins` : "Inactive"}
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    {isLoading ? (
                      <Skeleton className="mx-auto h-4 w-10" />
                    ) : (
                      (row.stats?.count ?? 0)
                    )}
                  </TableCell>
                  <TableCell className="text-center font-mono font-bold">
                    {isLoading ? (
                      <Skeleton className="mx-auto h-4 w-12" />
                    ) : (
                      formatDecimalMins(row.stats?.avg)
                    )}
                  </TableCell>
                  <TableCell className="text-center font-mono font-bold">
                    {isLoading ? (
                      <Skeleton className="mx-auto h-4 w-12" />
                    ) : (
                      formatMins(row.stats?.median)
                    )}
                  </TableCell>
                  <TableCell className="text-center font-mono font-bold">
                    {isLoading ? (
                      <Skeleton className="mx-auto h-4 w-12" />
                    ) : (
                      formatMins(row.stats?.p90)
                    )}
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    {isLoading ? (
                      <Skeleton className="mx-auto h-4 w-12" />
                    ) : (
                      formatMins(row.stats?.max)
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {isLoading ? (
                      <Skeleton className="ml-auto h-5 w-16" />
                    ) : row.stats?.within_target_pct !== null &&
                      row.stats?.within_target_pct !== undefined ? (
                      <Badge
                        className={`font-mono text-xs font-bold ${
                          row.stats.within_target_pct >= 90
                            ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            : row.stats.within_target_pct >= 75
                              ? "border-blue-500/30 bg-blue-500/15 text-blue-700 dark:text-blue-300"
                              : "border-destructive/30 bg-destructive/15 text-destructive"
                        }`}
                      >
                        {formatPct(row.stats.within_target_pct)}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Per-Employee Turnaround Table */}
        <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs">
          <div className="border-b border-border/80 bg-muted/40 px-5 py-3">
            <h3 className="text-sm font-bold text-foreground">
              Turnaround Time by Serving Employee (
              {data?.by_employee?.length ?? 0})
            </h3>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="border-border/60">
                <TableHead className="text-xs">Employee Name</TableHead>
                <TableHead className="text-center text-xs">
                  Visits Served
                </TableHead>
                <TableHead className="text-center text-xs">
                  Average Duration
                </TableHead>
                <TableHead className="text-center text-xs">Median</TableHead>
                <TableHead className="text-center text-xs">p90</TableHead>
                <TableHead className="text-center text-xs">Max</TableHead>
                <TableHead className="text-right text-xs">
                  Target Compliance
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-36" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="mx-auto h-4 w-12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="mx-auto h-4 w-14" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="mx-auto h-4 w-12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="mx-auto h-4 w-12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="mx-auto h-4 w-12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="ml-auto h-5 w-16" />
                    </TableCell>
                  </TableRow>
                ))
              ) : !data?.by_employee || data.by_employee.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-6 text-center text-xs text-muted-foreground"
                  >
                    No completed visits found for the selected date range.
                  </TableCell>
                </TableRow>
              ) : (
                data.by_employee.map((emp) => (
                  <TableRow
                    key={emp.user_id}
                    className="text-xs hover:bg-muted/20"
                  >
                    <TableCell className="flex items-center gap-2 font-semibold text-foreground">
                      <UserCheck className="size-3.5 shrink-0 text-primary" />
                      <span>{emp.name}</span>
                    </TableCell>
                    <TableCell className="text-center font-mono font-bold">
                      {emp.count}
                    </TableCell>
                    <TableCell className="text-center font-mono font-bold">
                      {formatDecimalMins(emp.avg)}
                    </TableCell>
                    <TableCell className="text-center font-mono font-bold">
                      {formatMins(emp.median)}
                    </TableCell>
                    <TableCell className="text-center font-mono">
                      {formatMins(emp.p90)}
                    </TableCell>
                    <TableCell className="text-center font-mono">
                      {formatMins(emp.max)}
                    </TableCell>
                    <TableCell className="text-right">
                      {emp.within_target_pct !== null ? (
                        <Badge
                          className={`font-mono text-xs font-bold ${
                            emp.within_target_pct >= 90
                              ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : emp.within_target_pct >= 75
                                ? "border-blue-500/30 bg-blue-500/15 text-blue-700 dark:text-blue-300"
                                : "border-destructive/30 bg-destructive/15 text-destructive"
                          }`}
                        >
                          {formatPct(emp.within_target_pct)}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Daily Trend Table */}
        <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs">
          <div className="border-b border-border/80 bg-muted/40 px-5 py-3">
            <h3 className="text-sm font-bold text-foreground">
              Daily Trend ({data?.by_day?.length ?? 0} active days)
            </h3>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="border-border/60">
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-center text-xs">
                  Visits Served
                </TableHead>
                <TableHead className="text-center text-xs">
                  Average TAT
                </TableHead>
                <TableHead className="text-center text-xs">Median</TableHead>
                <TableHead className="text-center text-xs">p90</TableHead>
                <TableHead className="text-center text-xs">Max</TableHead>
                <TableHead className="text-right text-xs">
                  Target Compliance
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="mx-auto h-4 w-12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="mx-auto h-4 w-14" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="mx-auto h-4 w-12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="mx-auto h-4 w-12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="mx-auto h-4 w-12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="ml-auto h-5 w-16" />
                    </TableCell>
                  </TableRow>
                ))
              ) : !data?.by_day || data.by_day.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-6 text-center text-xs text-muted-foreground"
                  >
                    No daily records in range.
                  </TableCell>
                </TableRow>
              ) : (
                data.by_day.map((d) => (
                  <TableRow key={d.date} className="text-xs hover:bg-muted/20">
                    <TableCell className="font-mono font-semibold text-foreground">
                      {d.date}
                    </TableCell>
                    <TableCell className="text-center font-mono font-bold">
                      {d.count}
                    </TableCell>
                    <TableCell className="text-center font-mono font-bold">
                      {formatDecimalMins(d.avg)}
                    </TableCell>
                    <TableCell className="text-center font-mono font-bold">
                      {formatMins(d.median)}
                    </TableCell>
                    <TableCell className="text-center font-mono">
                      {formatMins(d.p90)}
                    </TableCell>
                    <TableCell className="text-center font-mono">
                      {formatMins(d.max)}
                    </TableCell>
                    <TableCell className="text-right">
                      {d.within_target_pct !== null ? (
                        <Badge
                          className={`font-mono text-xs font-bold ${
                            d.within_target_pct >= 90
                              ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : d.within_target_pct >= 75
                                ? "border-blue-500/30 bg-blue-500/15 text-blue-700 dark:text-blue-300"
                                : "border-destructive/30 bg-destructive/15 text-destructive"
                          }`}
                        >
                          {formatPct(d.within_target_pct)}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
