import { apiClient, fetchBlob } from "@/lib/api-client"
import type { ApiEnvelope } from "@/features/patients/types/api.types"
import type {
  SocialCaseReportData,
  SocialCaseReportParams,
} from "../types/report.types"
import { toSocialCaseReportData } from "./reports-adapter"

/** GET /reports/social-cases — aggregated social case statistical metrics */
export async function getSocialCaseReports(
  params?: SocialCaseReportParams
): Promise<SocialCaseReportData> {
  const res = await apiClient.get<ApiEnvelope<any>>("/reports/social-cases", {
    params: params as any,
  })
  return toSocialCaseReportData(res.data ?? res)
}

/** GET /reports/social-cases/export — export reports as CSV, XLSX, or PDF */
export async function exportSocialCaseReports(
  params?: SocialCaseReportParams,
  format: "csv" | "xlsx" | "pdf" = "csv"
): Promise<Blob> {
  return fetchBlob("/reports/social-cases/export", {
    ...params,
    format,
  })
}
