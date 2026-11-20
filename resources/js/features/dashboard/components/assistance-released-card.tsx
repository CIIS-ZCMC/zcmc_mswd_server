import React, { useMemo, useState } from "react"
import { ChevronDown } from "lucide-react"
import type { GuaranteeTotals } from "../api/dashboard-api"
import { compactPeso, dayLabel, toDateKey, workingDays } from "../lib/week"

/** Colours for the guarantors the design names; others take the fallbacks. */
const KNOWN_COLORS: Record<string, string> = {
  MAIFIP: "#1f5fd6",
  PCSO: "#0c2a5b",
  "Mayor's Office": "#5ec3cf",
  CAF: "#f2a65a",
}

const FALLBACK_COLORS = ["#8b5cf6", "#16a34a", "#d7263d", "#a16207", "#64748b"]

/** Tallest bar, in pixels. */
const MAX_BAR_HEIGHT = 170

interface StackSegment {
  name: string
  color: string
  height: number
  amount: number
}

interface DayBar {
  key: string
  dayLabel: string
  amountLabel: string
  isToday: boolean
  segments: StackSegment[]
}

interface AssistanceReleasedCardProps {
  today?: Date
  thisWeek?: GuaranteeTotals
  lastWeek?: GuaranteeTotals
  isLoading?: boolean
}

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
})

export const AssistanceReleasedCard: React.FC<AssistanceReleasedCardProps> = ({
  today: todayProp,
  thisWeek,
  lastWeek,
  isLoading = false,
}) => {
  const [period, setPeriod] = useState<"this_week" | "last_week">("this_week")
  const [today] = useState(() => todayProp ?? new Date())

  const totals = period === "this_week" ? thisWeek : lastWeek

  const { bars, legend } = useMemo(() => {
    const days = workingDays(today, period === "this_week" ? 0 : 1)
    const byDate = new Map((totals?.days ?? []).map((d) => [d.date, d]))

    // Guarantors in order of the most money across the period.
    const sums = new Map<string, number>()
    for (const day of totals?.days ?? []) {
      for (const [name, amount] of Object.entries(day.byGuarantor)) {
        sums.set(name, (sums.get(name) ?? 0) + amount)
      }
    }
    const names = [...sums.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name)

    let fallback = 0
    const colors = new Map<string, string>()
    for (const name of names) {
      colors.set(
        name,
        KNOWN_COLORS[name] ??
          FALLBACK_COLORS[fallback++ % FALLBACK_COLORS.length]
      )
    }

    const maxTotal = Math.max(
      0,
      ...days.map((d) => byDate.get(toDateKey(d))?.total ?? 0)
    )

    const dayBars: DayBar[] = days.map((d) => {
      const key = toDateKey(d)
      const entry = byDate.get(key)
      const total = entry?.total ?? 0

      return {
        key,
        dayLabel: dayLabel(d, today),
        amountLabel: total > 0 ? compactPeso(total) : "",
        isToday: key === toDateKey(today),
        // Smallest guarantor on top, as in the design.
        segments: [...names]
          .reverse()
          .filter((name) => (entry?.byGuarantor[name] ?? 0) > 0)
          .map((name) => {
            const amount = entry?.byGuarantor[name] ?? 0
            return {
              name,
              color: colors.get(name) ?? FALLBACK_COLORS[0],
              amount,
              height: Math.max(
                3,
                Math.round((amount / maxTotal) * MAX_BAR_HEIGHT)
              ),
            }
          }),
      }
    })

    return {
      bars: dayBars,
      legend: names.map((name) => ({ name, color: colors.get(name)! })),
    }
  }, [today, period, totals])

  return (
    <div
      data-node-id="144:1617"
      className="flex w-full flex-col gap-[8px] rounded-[16px] border border-[#e4e9f2] bg-white p-[24px] shadow-[0px_1px_2px_0px_rgba(12,42,91,0.04),0px_2px_6px_0px_rgba(12,42,91,0.05)]"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-[12px]">
        <div className="flex flex-col gap-[2px]">
          <h2 className="text-[16px] leading-normal font-bold text-[#0c2a5b]">
            Assistance released
          </h2>
          <p className="text-[12px] leading-normal font-normal text-[#5b6678]">
            Working days · by guarantor
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setPeriod((prev) =>
              prev === "this_week" ? "last_week" : "this_week"
            )
          }
          className="flex h-[32px] shrink-0 cursor-pointer items-center gap-[4px] rounded-full border border-[#e4e9f2] bg-white px-[13px] text-[12px] leading-normal font-semibold text-[#0c2a5b] transition-colors hover:bg-[#f4f7fc]"
        >
          <span>{period === "this_week" ? "This week" : "Last week"}</span>
          <ChevronDown className="size-[16px] text-[#0c2a5b]" />
        </button>
      </div>

      {/* Total Amount */}
      <div className="pt-[4px]">
        <span className="text-[28px] leading-tight font-bold tracking-[-0.6px] text-[#0c2a5b]">
          {isLoading ? "…" : peso.format(totals?.total ?? 0)}
        </span>
      </div>

      {/* Legend */}
      <div className="flex min-h-[18px] flex-wrap items-center gap-[12px] pt-[2px]">
        {legend.map((item) => (
          <div key={item.name} className="flex items-center gap-[6px]">
            <span
              className="size-[10px] shrink-0 rounded-[3px]"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-[12px] leading-normal font-medium text-[#5b6678]">
              {item.name}
            </span>
          </div>
        ))}
        {!isLoading && legend.length === 0 && (
          <span className="text-[12px] text-[#8a94a6]">
            Nothing released in this period.
          </span>
        )}
      </div>

      {/* Bar Chart Area */}
      <div className="flex h-[223px] items-end gap-[16px] border-b border-[#e4e9f2] pt-[8px] pb-[5px]">
        {bars.map((bar) => (
          <div
            key={bar.key}
            className="flex h-full flex-1 flex-col items-center justify-end gap-[6px]"
          >
            {/* Amount label on top */}
            <span className="text-[11px] leading-normal font-semibold whitespace-nowrap text-[#5b6678]">
              {bar.amountLabel}
            </span>

            {/* Stacked Bars */}
            <div className="flex w-[44px] max-w-[44px] flex-col gap-[2px]">
              {bar.segments.map((seg) => (
                <div
                  key={seg.name}
                  style={{
                    height: `${seg.height}px`,
                    backgroundColor: seg.color,
                  }}
                  className="w-full shrink-0 rounded-[4px] transition-all"
                  title={`${seg.name}: ${peso.format(seg.amount)}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Day Labels */}
      <div className="flex items-start gap-[16px] pt-[4px]">
        {bars.map((bar) => (
          <div
            key={bar.key}
            className="flex flex-1 items-center justify-center text-center"
          >
            <span
              className={`text-[12px] leading-normal whitespace-nowrap ${
                bar.isToday
                  ? "font-bold text-[#1f5fd6]"
                  : "font-medium text-[#5b6678]"
              }`}
            >
              {bar.dayLabel}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
