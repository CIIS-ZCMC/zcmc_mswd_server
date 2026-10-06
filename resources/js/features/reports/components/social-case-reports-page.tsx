import React, { useState } from "react"
import {
  BarChart3,
  Calendar,
  Download,
  Filter,
  Layers,
  PieChart,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useReportExport, useSocialCaseReports } from "../hooks/use-social-case-reports"
import type { SocialCaseReportParams } from "../types/report.types"

function formatCurrency(val: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(val || 0)
}

export const SocialCaseReportsPage: React.FC = () => {
  const [datePreset, setDatePreset] = useState<string>("this_month")
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().substring(0, 10)
  })
  const [dateTo, setDateTo] = useState<string>(() => {
    return new Date().toISOString().substring(0, 10)
  })
  const [admissionType, setAdmissionType] = useState<string>("ALL")
  const [caseType, setCaseType] = useState<string>("ALL")

  const handlePresetChange = (preset: string) => {
    setDatePreset(preset)
    const now = new Date()
    if (preset === "this_month") {
      setDateFrom(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().substring(0, 10))
      setDateTo(now.toISOString().substring(0, 10))
    } else if (preset === "last_month") {
      setDateFrom(new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().substring(0, 10))
      setDateTo(new Date(now.getFullYear(), now.getMonth(), 0).toISOString().substring(0, 10))
    } else if (preset === "this_quarter") {
      const qMonth = Math.floor(now.getMonth() / 3) * 3
      setDateFrom(new Date(now.getFullYear(), qMonth, 1).toISOString().substring(0, 10))
      setDateTo(now.toISOString().substring(0, 10))
    } else if (preset === "year_to_date") {
      setDateFrom(new Date(now.getFullYear(), 0, 1).toISOString().substring(0, 10))
      setDateTo(now.toISOString().substring(0, 10))
    }
  }

  const queryParams: SocialCaseReportParams = {
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    admission_type: admissionType !== "ALL" ? admissionType : undefined,
    case_type: caseType !== "ALL" ? caseType : undefined,
  }

  const { data, isLoading, error, refetch, isFetching } = useSocialCaseReports(queryParams)
  const { downloadExport, isExporting, canGenerate } = useReportExport()

  const kpis = data?.kpis ?? {
    totalCases: 0,
    openedCases: 0,
    closedCases: 0,
    activeCases: 0,
    totalFinancialAssistance: 0,
    totalPatientsServed: 0,
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-background text-foreground transition-colors duration-200">
      {/* Header Banner */}
      <div className="border-b border-border bg-card p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-primary/10 text-primary rounded-xl border border-primary/20">
              <BarChart3 className="size-6" />
            </div>
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight">
                Social Case Reports
              </h1>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-0.5">
                Aggregate caseload statistics, MSWD classifications, and assistance disaggregation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-10 text-xs font-semibold gap-1.5"
            >
              <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>

            {canGenerate && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  disabled={isExporting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-xs sm:text-sm shadow-sm hover:opacity-90 cursor-pointer disabled:opacity-50"
                >
                  <Download className="size-4" />
                  {isExporting ? "Exporting..." : "Export Report"}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => downloadExport(queryParams, "csv")}
                    className="text-xs font-medium cursor-pointer"
                  >
                    Export as CSV (.csv)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => downloadExport(queryParams, "xlsx")}
                    className="text-xs font-medium cursor-pointer"
                  >
                    Export as Excel (.xlsx)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => downloadExport(queryParams, "pdf")}
                    className="text-xs font-medium cursor-pointer"
                  >
                    Export as PDF Document (.pdf)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-5 sm:p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Filters Card */}
        <Card className="border-border/80 bg-card/60">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5 w-full lg:w-auto flex-1">
                {/* Preset Selector */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-primary" /> Period Preset
                  </Label>
                  <Select value={datePreset} onValueChange={(val) => handlePresetChange(val || "this_month")}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Preset" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="this_month">This Month</SelectItem>
                      <SelectItem value="last_month">Last Month</SelectItem>
                      <SelectItem value="this_quarter">This Quarter</SelectItem>
                      <SelectItem value="year_to_date">Year to Date (YTD)</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date From */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">From Date</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value)
                      setDatePreset("custom")
                    }}
                    className="h-9 text-xs"
                  />
                </div>

                {/* Date To */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">To Date</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value)
                      setDatePreset("custom")
                    }}
                    className="h-9 text-xs"
                  />
                </div>

                {/* Admission Type Filter */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Filter className="size-3.5 text-primary" /> Admission Type
                  </Label>
                  <Select value={admissionType} onValueChange={(val) => setAdmissionType(val || "ALL")}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Admission Types</SelectItem>
                      <SelectItem value="Inpatient">Inpatient</SelectItem>
                      <SelectItem value="Outpatient">Outpatient</SelectItem>
                      <SelectItem value="Emergency">Emergency (ER)</SelectItem>
                      <SelectItem value="Walk-In">Walk-In / House</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Case Type Filter */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Filter className="size-3.5 text-primary" /> Case Type
                  </Label>
                  <Select value={caseType} onValueChange={(val) => setCaseType(val || "ALL")}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="All case types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Case Types</SelectItem>
                      <SelectItem value="General">General Medical</SelectItem>
                      <SelectItem value="Pediatric">Pediatric</SelectItem>
                      <SelectItem value="OB-GYN">OB-GYN</SelectItem>
                      <SelectItem value="Surgical">Surgical</SelectItem>
                      <SelectItem value="Psychiatric">Psychiatric</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Protective Exclusion Notice Banner */}
        <div className="flex items-center gap-3 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-900 dark:text-amber-200">
          <ShieldAlert className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            <strong>Confidentiality Notice:</strong> Protective case specifics (e.g. sensitive legal narratives and protective identity data) are automatically excluded from aggregate public reports for statutory compliance.
          </span>
        </div>

        {/* Error / Loading State */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
        ) : error ? (
          <Alert variant="destructive" className="border-2 p-5">
            <AlertTitle className="text-base font-bold">Failed to Load Reports</AlertTitle>
            <AlertDescription className="text-sm font-medium mt-1">
              Could not retrieve statistical data from the reporting service. Please check your network connection and permissions.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Top KPI Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-border/80 bg-card/80 shadow-xs">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardDescription className="text-xs font-bold uppercase tracking-wider">
                      Total Cases Handled
                    </CardDescription>
                    <Layers className="size-4 text-blue-500" />
                  </div>
                  <CardTitle className="text-2xl sm:text-3xl font-extrabold text-foreground">
                    {kpis.totalCases.toLocaleString()}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-[11px] text-muted-foreground flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    {kpis.activeCases} active
                  </Badge>
                  <span>• {kpis.closedCases} closed</span>
                </CardContent>
              </Card>

              <Card className="border-border/80 bg-card/80 shadow-xs">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardDescription className="text-xs font-bold uppercase tracking-wider">
                      Patients Served
                    </CardDescription>
                    <Users className="size-4 text-emerald-500" />
                  </div>
                  <CardTitle className="text-2xl sm:text-3xl font-extrabold text-foreground">
                    {kpis.totalPatientsServed.toLocaleString()}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-[11px] text-muted-foreground">
                  Unique patient profiles assessed
                </CardContent>
              </Card>

              <Card className="border-border/80 bg-card/80 shadow-xs">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardDescription className="text-xs font-bold uppercase tracking-wider">
                      New Cases Opened
                    </CardDescription>
                    <TrendingUp className="size-4 text-purple-500" />
                  </div>
                  <CardTitle className="text-2xl sm:text-3xl font-extrabold text-foreground">
                    {kpis.openedCases.toLocaleString()}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-[11px] text-muted-foreground">
                  Episodes initiated in selected window
                </CardContent>
              </Card>

              <Card className="border-border/80 bg-card/80 shadow-xs">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardDescription className="text-xs font-bold uppercase tracking-wider">
                      Total Assistance Disbursed
                    </CardDescription>
                    <Wallet className="size-4 text-amber-500" />
                  </div>
                  <CardTitle className="text-2xl sm:text-3xl font-extrabold text-foreground">
                    {formatCurrency(kpis.totalFinancialAssistance)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-[11px] text-muted-foreground">
                  MSWD financial & medical assistance
                </CardContent>
              </Card>
            </div>

            {/* Breakdown Visualizations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* MSWD Classification Disaggregation */}
              <Card className="border-border/80 bg-card/60">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <PieChart className="size-4 text-primary" />
                      Cases by MSWD Classification
                    </CardTitle>
                    <Badge variant="outline" className="text-[11px] font-mono">
                      Categories A - D
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Patient classification distribution according to DOH MSWD scoring.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-2">
                  {data?.byCategory.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      No classification data available for this range.
                    </div>
                  ) : (
                    data?.byCategory.map((cat, idx) => {
                      const total = kpis.totalCases || 1
                      const pct = cat.percentage ?? Math.round((cat.count / total) * 100)
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span>{cat.label}</span>
                            <span className="text-muted-foreground">
                              {cat.count.toLocaleString()} cases ({pct}%)
                            </span>
                          </div>
                          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </div>
                      )
                    })
                  )}
                </CardContent>
              </Card>

              {/* Admission Type Breakdown */}
              <Card className="border-border/80 bg-card/60">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Layers className="size-4 text-primary" />
                      Cases by Admission Encounter
                    </CardTitle>
                    <Badge variant="outline" className="text-[11px] font-mono">
                      HIS Types
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Encounter mode at time of MSWD intake assessment.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-2">
                  {data?.byAdmissionType.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      No encounter data available for this range.
                    </div>
                  ) : (
                    data?.byAdmissionType.map((item, idx) => {
                      const total = kpis.totalCases || 1
                      const pct = item.percentage ?? Math.round((item.count / total) * 100)
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span>{item.label}</span>
                            <span className="text-muted-foreground">
                              {item.count.toLocaleString()} cases ({pct}%)
                            </span>
                          </div>
                          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </div>
                      )
                    })
                  )}
                </CardContent>
              </Card>

              {/* Social Worker Caseload Distribution */}
              <Card className="border-border/80 bg-card/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <UserCheck className="size-4 text-primary" />
                    Caseload Distribution by Social Worker
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Active and assigned case volume per team member.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-2">
                  {data?.byWorker.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      No worker caseload distribution recorded.
                    </div>
                  ) : (
                    data?.byWorker.map((worker, idx) => {
                      const total = kpis.totalCases || 1
                      const pct = worker.percentage ?? Math.round((worker.count / total) * 100)
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span>{worker.label}</span>
                            <span className="text-muted-foreground">
                              {worker.count.toLocaleString()} cases ({pct}%)
                            </span>
                          </div>
                          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </div>
                      )
                    })
                  )}
                </CardContent>
              </Card>

              {/* Case / Transaction Type Breakdown */}
              <Card className="border-border/80 bg-card/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <TrendingUp className="size-4 text-primary" />
                    Cases by Transaction / Service Type
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Breakdown by clinical and social work service classification.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-2">
                  {data?.byCaseType.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      No case transaction types recorded.
                    </div>
                  ) : (
                    data?.byCaseType.map((item, idx) => {
                      const total = kpis.totalCases || 1
                      const pct = item.percentage ?? Math.round((item.count / total) * 100)
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span>{item.label}</span>
                            <span className="text-muted-foreground">
                              {item.count.toLocaleString()} cases ({pct}%)
                            </span>
                          </div>
                          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-600 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </div>
                      )
                    })
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
