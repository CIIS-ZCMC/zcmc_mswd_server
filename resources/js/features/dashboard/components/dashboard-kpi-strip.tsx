import React from "react"
import { cn } from "@/lib/utils"

interface KpiPill {
  label: string
  tone: "teal" | "blue" | "amber" | "rose"
}

interface KpiColumn {
  title: string
  value: string
  valueTone?: "navy" | "red"
  note: string
  noteTone: "green" | "muted" | "amber" | "red"
  pills: KpiPill[]
}

const DEFAULT_KPI_COLUMNS: KpiColumn[] = [
  {
    title: "Total Cases handled",
    value: "6",
    valueTone: "navy",
    note: "+2 from yesterday",
    noteTone: "green",
    pills: [
      { label: "Active: 3", tone: "teal" },
      { label: "Completed: 2", tone: "blue" },
    ],
  },
  {
    title: "In progress",
    value: "14",
    valueTone: "navy",
    note: "open cases",
    noteTone: "muted",
    pills: [
      { label: "Assessment: 8", tone: "amber" },
      { label: "Transactions: 6", tone: "blue" },
    ],
  },
  {
    title: "Patients Served",
    value: "3",
    valueTone: "navy",
    note: "oldest 2 hours",
    noteTone: "amber",
    pills: [
      { label: "MAIFIP: 2", tone: "amber" },
      { label: "PCSO: 1", tone: "amber" },
    ],
  },
  {
    title: "Average TAT",
    value: "2",
    valueTone: "red",
    note: "need revision",
    noteTone: "red",
    pills: [
      { label: "Mayor's Office: 1", tone: "rose" },
      { label: "CAF: 1", tone: "rose" },
    ],
  },
]

const PILL_TONE_CLASSES: Record<KpiPill["tone"], string> = {
  teal: "bg-[#e0f5f8] text-[#0a6b78]",
  blue: "bg-[#edf3fe] text-[#1f5fd6]",
  amber: "bg-[#fff5e0] text-[#8a5300]",
  rose: "bg-[#fdedef] text-[#a51d30]",
}

const NOTE_TONE_CLASSES: Record<KpiColumn["noteTone"], string> = {
  green: "font-semibold text-[#1c8a57]",
  muted: "font-medium text-[#5b6678]",
  amber: "font-semibold text-[#e09100]",
  red: "font-semibold text-[#d7263d]",
}

interface DashboardKpiStripProps {
  columns?: KpiColumn[]
}

export const DashboardKpiStrip: React.FC<DashboardKpiStripProps> = ({
  columns = DEFAULT_KPI_COLUMNS,
}) => {
  return (
    <section
      data-node-id="144:1486"
      className="grid w-full grid-cols-1 overflow-hidden rounded-[16px] border border-[#e4e9f2] bg-white sm:grid-cols-2 xl:grid-cols-4"
    >
      {columns.map((col, index) => (
        <div
          key={col.title}
          className={cn(
            "flex flex-col gap-[8px] p-[20px]",
            index > 0 && "border-t border-[#e4e9f2] sm:border-t-0",
            index % 2 === 1 && "sm:border-l sm:border-[#e4e9f2]",
            index > 0 && "xl:border-l xl:border-[#e4e9f2]"
          )}
        >
          <p className="text-[12.5px] leading-normal font-semibold text-[#5b6678]">
            {col.title}
          </p>

          <div className="flex items-baseline gap-[10px]">
            <span
              className={cn(
                "text-[30px] leading-[33px] font-bold tracking-[-0.75px]",
                col.valueTone === "red" ? "text-[#d7263d]" : "text-[#0c2a5b]"
              )}
            >
              {col.value}
            </span>
            <span className={cn("text-[12px]", NOTE_TONE_CLASSES[col.noteTone])}>
              {col.note}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-[6px] pt-[2px]">
            {col.pills.map((pill) => (
              <span
                key={pill.label}
                className={cn(
                  "rounded-full px-[9px] py-[2px] text-[11.5px] leading-tight font-semibold",
                  PILL_TONE_CLASSES[pill.tone]
                )}
              >
                {pill.label}
              </span>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}

