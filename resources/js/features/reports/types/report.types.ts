export interface SocialCaseReportParams {
  date_from?: string
  date_to?: string
  admission_type?: string
  case_type?: string
  department_id?: number
  social_worker_id?: number
  sub_classification_id?: number
}

export interface ReportKPIs {
  totalCases: number
  openedCases: number
  closedCases: number
  activeCases: number
  totalFinancialAssistance: number
  totalPatientsServed: number
}

export interface DisaggregationItem {
  label: string
  count: number
  percentage?: number
  amount?: number
}

export interface MonthlyTrendItem {
  month: string
  cases: number
  assistance: number
}

export interface SocialCaseReportData {
  kpis: ReportKPIs
  byAdmissionType: DisaggregationItem[]
  byCaseType: DisaggregationItem[]
  byCategory: DisaggregationItem[]
  byWorker: DisaggregationItem[]
  byGender: DisaggregationItem[]
  monthlyTrend: MonthlyTrendItem[]
  protectiveCasesExcluded: boolean
}
