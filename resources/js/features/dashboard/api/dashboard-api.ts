import { apiClient } from "@/lib/api-client"

export interface GuaranteeTotalsDay {
  /** `YYYY-MM-DD` */
  date: string
  total: number
  /** Guarantor name to the amount it guaranteed that day. */
  byGuarantor: Record<string, number>
}

export interface GuaranteeTotals {
  from: string
  to: string
  protectiveExcluded: boolean
  total: number
  days: GuaranteeTotalsDay[]
}

interface ApiGuaranteeTotals {
  data: {
    from: string
    to: string
    protective_excluded: boolean
    total: number | string
    days: Array<{
      date: string
      total: number | string
      by_guarantor: Record<string, number | string>
    }>
  }
}

/** GET /dashboard/guarantee-totals (guarantee.view): amounts per day and guarantor. */
export async function getGuaranteeTotals(
  from: string,
  to: string
): Promise<GuaranteeTotals> {
  const res = await apiClient.get<ApiGuaranteeTotals>(
    "/dashboard/guarantee-totals",
    { params: { from, to } }
  )

  return {
    from: res.data.from,
    to: res.data.to,
    protectiveExcluded: res.data.protective_excluded,
    total: Number(res.data.total) || 0,
    days: res.data.days.map((day) => ({
      date: day.date,
      total: Number(day.total) || 0,
      byGuarantor: Object.fromEntries(
        Object.entries(day.by_guarantor ?? {}).map(([name, amount]) => [
          name,
          Number(amount) || 0,
        ])
      ),
    })),
  }
}
