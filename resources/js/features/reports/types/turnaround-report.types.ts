export interface TurnaroundStageStats {
  count: number
  avg: number | null
  median: number | null
  p90: number | null
  max: number | null
  within_target_pct: number | null
}

export interface TurnaroundEmployeeRow extends TurnaroundStageStats {
  user_id: number
  name: string
}

export interface TurnaroundDayRow extends TurnaroundStageStats {
  date: string
}

export interface TurnaroundReportSummary {
  from: string
  to: string
  protective_excluded: boolean
  targets: {
    waiting: number | null
    processing: number | null
    total: number | null
  }
  completed: number
  cancelled: number
  stages: {
    waiting: TurnaroundStageStats
    processing: TurnaroundStageStats
    total: TurnaroundStageStats
  }
  by_employee: TurnaroundEmployeeRow[]
  by_day: TurnaroundDayRow[]
}
