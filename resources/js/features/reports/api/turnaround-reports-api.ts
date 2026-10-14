import { apiClient, fetchBlob } from "@/lib/api-client"
import type { TurnaroundReportSummary } from "../types/turnaround-report.types"

/** GET /reports/turnaround — Turnaround time (TAT) summary statistics */
export async function getTurnaroundReport(
  from?: string,
  to?: string
): Promise<TurnaroundReportSummary> {
  // The endpoint answers `{ data: summary }`; apiClient does not unwrap it.
  const res = await apiClient.get<{ data: TurnaroundReportSummary }>(
    "/reports/turnaround",
    {
      params: {
        from: from || undefined,
        to: to || undefined,
      },
    }
  )
  return res.data
}

/** GET /reports/turnaround/export — Export TAT report as CSV or PDF */
export async function exportTurnaroundReport(
  from?: string,
  to?: string,
  format: "csv" | "pdf" = "csv"
): Promise<Blob> {
  return fetchBlob("/reports/turnaround/export", {
    from: from || undefined,
    to: to || undefined,
    format,
  })
}
