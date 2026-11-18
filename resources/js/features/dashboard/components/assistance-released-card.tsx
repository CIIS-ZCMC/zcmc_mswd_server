import React, { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface StackedDayData {
  dayLabel: string
  isToday?: boolean
  amountLabel: string
  /** Heights in px from bottom to top: MAIFIP, PCSO, Mayor's Office, CAF */
  segments: {
    maifip: number
    pcso: number
    mayorsOffice: number
    caf: number
  }
}

const THIS_WEEK_DAYS: StackedDayData[] = [
  {
    dayLabel: "Thu 17",
    amountLabel: "₱82k",
    segments: { maifip: 38, pcso: 26, mayorsOffice: 18, caf: 10 },
  },
  {
    dayLabel: "Fri 18",
    amountLabel: "₱88k",
    segments: { maifip: 44, pcso: 22, mayorsOffice: 20, caf: 14 },
  },
  {
    dayLabel: "Mon 21",
    amountLabel: "₱93k",
    segments: { maifip: 52, pcso: 30, mayorsOffice: 14, caf: 10 },
  },
  {
    dayLabel: "Tue 22",
    amountLabel: "₱118k",
    segments: { maifip: 64, pcso: 34, mayorsOffice: 22, caf: 16 },
  },
  {
    dayLabel: "Today",
    isToday: true,
    amountLabel: "₱83.5k",
    segments: { maifip: 42, pcso: 24, mayorsOffice: 18, caf: 12 },
  },
]

const LAST_WEEK_DAYS: StackedDayData[] = [
  {
    dayLabel: "Mon 14",
    amountLabel: "₱74k",
    segments: { maifip: 34, pcso: 22, mayorsOffice: 16, caf: 8 },
  },
  {
    dayLabel: "Tue 15",
    amountLabel: "₱91k",
    segments: { maifip: 46, pcso: 24, mayorsOffice: 18, caf: 12 },
  },
  {
    dayLabel: "Wed 16",
    amountLabel: "₱86k",
    segments: { maifip: 42, pcso: 26, mayorsOffice: 14, caf: 10 },
  },
  {
    dayLabel: "Thu 17",
    amountLabel: "₱82k",
    segments: { maifip: 38, pcso: 26, mayorsOffice: 18, caf: 10 },
  },
  {
    dayLabel: "Fri 18",
    amountLabel: "₱88k",
    segments: { maifip: 44, pcso: 22, mayorsOffice: 20, caf: 14 },
  },
]

export const AssistanceReleasedCard: React.FC = () => {
  const [period, setPeriod] = useState<"this_week" | "last_week">("this_week")

  const days = period === "this_week" ? THIS_WEEK_DAYS : LAST_WEEK_DAYS
  const totalDisplay = period === "this_week" ? "₱464,500" : "₱421,000"

  return (
    <div
      data-node-id="144:1617"
      className="flex w-full flex-col gap-[16px] rounded-[16px] border border-[#e4e9f2] bg-white p-[24px]"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-[2px]">
          <h2 className="text-[17px] leading-tight font-bold tracking-[-0.17px] text-[#0c2a5b]">
            Assistance released
          </h2>
          <p className="text-[12.5px] leading-normal font-normal text-[#5b6678]">
            Last 5 working days · by guarantor
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setPeriod((prev) =>
              prev === "this_week" ? "last_week" : "this_week"
            )
          }
          className="flex shrink-0 cursor-pointer items-center gap-[4px] rounded-full border border-[#e4e9f2] bg-[#f4f7fc] px-[13px] py-[6px] text-[12px] leading-tight font-semibold text-[#0c2a5b] transition-colors hover:border-[#1f5fd6]/40"
        >
          <span>{period === "this_week" ? "This week" : "Last week"}</span>
          <ChevronDown className="size-[16px] text-[#0c2a5b]" />
        </button>
      </div>

      {/* Total & Legend */}
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <span className="text-[28px] leading-[28px] font-bold tracking-[-0.56px] text-[#0c2a5b]">
          {totalDisplay}
        </span>

        <div className="flex flex-wrap items-center gap-[12px]">
          <div className="flex items-center gap-[6px]">
            <span className="size-[8px] rounded-[2px] bg-[#1f5fd6]" />
            <span className="text-[11.5px] font-medium text-[#5b6678]">
              MAIFIP
            </span>
          </div>
          <div className="flex items-center gap-[6px]">
            <span className="size-[8px] rounded-[2px] bg-[#0c2a5b]" />
            <span className="text-[11.5px] font-medium text-[#5b6678]">
              PCSO
            </span>
          </div>
          <div className="flex items-center gap-[6px]">
            <span className="size-[8px] rounded-[2px] bg-[#5ec3cf]" />
            <span className="text-[11.5px] font-medium text-[#5b6678]">
              Mayor&apos;s Office
            </span>
          </div>
          <div className="flex items-center gap-[6px]">
            <span className="size-[8px] rounded-[2px] bg-[#f2a65a]" />
            <span className="text-[11.5px] font-medium text-[#5b6678]">
              CAF
            </span>
          </div>
        </div>
      </div>

      {/* Stacked Bar Chart */}
      <div className="grid h-[180px] grid-cols-5 items-end gap-[14px] pt-[8px] pb-[4px]">
        {days.map((day) => (
          <div
            key={day.dayLabel}
            className="flex h-full flex-col items-center justify-end gap-[6px]"
          >
            {/* Stacked Bar */}
            <div className="flex w-full flex-col-reverse gap-[2px] overflow-hidden rounded-t-[6px]">
              <div
                style={{ height: `${day.segments.maifip}px` }}
                className="w-full shrink-0 rounded-t-[3px] bg-[#1f5fd6] transition-all duration-300"
                title="MAIFIP"
              />
              <div
                style={{ height: `${day.segments.pcso}px` }}
                className="w-full shrink-0 rounded-t-[3px] bg-[#0c2a5b] transition-all duration-300"
                title="PCSO"
              />
              <div
                style={{ height: `${day.segments.mayorsOffice}px` }}
                className="w-full shrink-0 rounded-t-[3px] bg-[#5ec3cf] transition-all duration-300"
                title="Mayor's Office"
              />
              <div
                style={{ height: `${day.segments.caf}px` }}
                className="w-full shrink-0 rounded-t-[3px] bg-[#f2a65a] transition-all duration-300"
                title="CAF"
              />
            </div>

            {/* Day Label */}
            <span
              className={cn(
                "text-[11px] leading-tight whitespace-nowrap",
                day.isToday
                  ? "font-bold text-[#0c2a5b]"
                  : "font-semibold text-[#5b6678]"
              )}
            >
              {day.dayLabel}
            </span>

            {/* Amount Label */}
            <span className="text-[10.5px] leading-tight font-normal text-[#8a94a6] whitespace-nowrap">
              {day.amountLabel}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

