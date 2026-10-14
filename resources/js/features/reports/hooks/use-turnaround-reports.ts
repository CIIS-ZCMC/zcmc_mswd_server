import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { usePermission } from "@/features/auth/hooks/use-permission"
import {
  exportTurnaroundReport,
  getTurnaroundReport,
} from "../api/turnaround-reports-api"

export const turnaroundReportKeys = {
  all: ["reports", "turnaround"] as const,
  summary: (from?: string, to?: string) =>
    [...turnaroundReportKeys.all, "summary", { from, to }] as const,
}

export function useTurnaroundReport(from?: string, to?: string) {
  const canView = usePermission("reports.view")

  return useQuery({
    queryKey: turnaroundReportKeys.summary(from, to),
    queryFn: () => getTurnaroundReport(from, to),
    enabled: canView,
    staleTime: 1000 * 60 * 3, // 3 minutes cache
  })
}

export function useTurnaroundExport() {
  const canGenerate = usePermission("reports.generate")
  const [isExporting, setIsExporting] = useState(false)

  const downloadExport = async (
    from?: string,
    to?: string,
    format: "csv" | "pdf" = "csv"
  ) => {
    if (!canGenerate) {
      console.warn("You do not have permission to generate or export reports.")
      return
    }

    try {
      setIsExporting(true)
      const blob = await exportTurnaroundReport(from, to, format)
      const filename = `turnaround-time-report-${from || "all"}-to-${to || "now"}.${format}`

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err: unknown) {
      console.error("Failed to export turnaround report", err)
    } finally {
      setIsExporting(false)
    }
  }

  return {
    downloadExport,
    isExporting,
    canGenerate,
  }
}
