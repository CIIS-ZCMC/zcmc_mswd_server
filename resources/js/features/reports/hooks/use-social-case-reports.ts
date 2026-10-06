import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { usePermission } from "@/features/auth/hooks/use-permission"
import { exportSocialCaseReports, getSocialCaseReports } from "../api/reports-api"
import type { SocialCaseReportParams } from "../types/report.types"

export const reportKeys = {
  all: ["reports"] as const,
  socialCases: (params?: SocialCaseReportParams) =>
    [...reportKeys.all, "social-cases", params ?? {}] as const,
}

export function useSocialCaseReports(params?: SocialCaseReportParams) {
  const canView = usePermission("reports.view")

  return useQuery({
    queryKey: reportKeys.socialCases(params),
    queryFn: async () => {
      return getSocialCaseReports(params)
    },
    enabled: canView,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  })
}

export function useReportExport() {
  const canGenerate = usePermission("reports.generate")
  const [isExporting, setIsExporting] = useState(false)

  const downloadExport = async (
    params?: SocialCaseReportParams,
    format: "csv" | "xlsx" | "pdf" = "csv"
  ) => {
    if (!canGenerate) {
      console.warn("You do not have permission to generate or export reports.")
      return
    }

    try {
      setIsExporting(true)
      const blob = await exportSocialCaseReports(params, format)
      const dateStr = new Date().toISOString().substring(0, 10)
      const filename = `social-case-report-${dateStr}.${format}`

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      console.error("Failed to export report", err)
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
