import type {
  DisaggregationItem,
  MonthlyTrendItem,
  ReportKPIs,
  SocialCaseReportData,
} from "../types/report.types"

function normalizeDisaggregation(rawList: any[]): DisaggregationItem[] {
  if (!Array.isArray(rawList)) return []
  return rawList.map((item) => ({
    label: item.label ?? item.name ?? item.type ?? item.category ?? "Unspecified",
    count: Number(item.count ?? item.total ?? 0),
    percentage: item.percentage !== undefined ? Number(item.percentage) : undefined,
    amount: item.amount !== undefined ? Number(item.amount) : undefined,
  }))
}

function normalizeTrends(rawList: any[]): MonthlyTrendItem[] {
  if (!Array.isArray(rawList)) return []
  return rawList.map((item) => ({
    month: item.month ?? item.period ?? item.label ?? "",
    cases: Number(item.cases ?? item.count ?? item.total ?? 0),
    assistance: Number(item.assistance ?? item.amount ?? 0),
  }))
}

export function toSocialCaseReportData(raw: any): SocialCaseReportData {
  if (!raw) {
    return {
      kpis: {
        totalCases: 0,
        openedCases: 0,
        closedCases: 0,
        activeCases: 0,
        totalFinancialAssistance: 0,
        totalPatientsServed: 0,
      },
      byAdmissionType: [],
      byCaseType: [],
      byCategory: [],
      byWorker: [],
      byGender: [],
      monthlyTrend: [],
      protectiveCasesExcluded: true,
    }
  }

  const kpisRaw = raw.kpis ?? raw.summary ?? {}
  const kpis: ReportKPIs = {
    totalCases: Number(kpisRaw.total_cases ?? kpisRaw.totalCases ?? raw.total_cases ?? 0),
    openedCases: Number(kpisRaw.opened_cases ?? kpisRaw.openedCases ?? raw.opened_cases ?? 0),
    closedCases: Number(kpisRaw.closed_cases ?? kpisRaw.closedCases ?? raw.closed_cases ?? 0),
    activeCases: Number(kpisRaw.active_cases ?? kpisRaw.activeCases ?? raw.active_cases ?? 0),
    totalFinancialAssistance: Number(
      kpisRaw.total_financial_assistance ??
        kpisRaw.totalFinancialAssistance ??
        raw.total_assistance ??
        0
    ),
    totalPatientsServed: Number(
      kpisRaw.total_patients_served ?? kpisRaw.totalPatientsServed ?? raw.patients_served ?? 0
    ),
  }

  return {
    kpis,
    byAdmissionType: normalizeDisaggregation(raw.by_admission_type ?? raw.byAdmissionType),
    byCaseType: normalizeDisaggregation(raw.by_case_type ?? raw.byCaseType),
    byCategory: normalizeDisaggregation(raw.by_category ?? raw.byCategory ?? raw.by_classification),
    byWorker: normalizeDisaggregation(raw.by_worker ?? raw.byWorker ?? raw.by_social_worker),
    byGender: normalizeDisaggregation(raw.by_gender ?? raw.byGender),
    monthlyTrend: normalizeTrends(raw.monthly_trend ?? raw.monthlyTrend ?? raw.trends),
    protectiveCasesExcluded: Boolean(
      raw.protective_cases_excluded ?? raw.protectiveCasesExcluded ?? true
    ),
  }
}
