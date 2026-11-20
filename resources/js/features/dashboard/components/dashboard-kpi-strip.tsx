import React from "react"
import { UserPlus, Clock3, Hourglass, AlertCircle, Timer } from "lucide-react"
import { cn } from "@/lib/utils"

export interface KpiSubCard {
  label: string
  value: string | number
  tone: "teal" | "blue" | "amber" | "rose"
}

export interface KpiCardData {
  title: string
  value: string | number
  note: string
  iconType:
    "person_add" | "pending_actions" | "hourglass" | "revision" | "timer"
  subCards: KpiSubCard[]
}

const ICON_CONFIG = {
  person_add: {
    bg: "bg-[#e0f5f8] text-[#0a6b78]",
    Icon: UserPlus,
  },
  pending_actions: {
    bg: "bg-[#edf3fe] text-[#1f5fd6]",
    Icon: Clock3,
  },
  hourglass: {
    bg: "bg-[#fff5e0] text-[#8a5300]",
    Icon: Hourglass,
  },
  revision: {
    bg: "bg-[#fdedef] text-[#a51d30]",
    Icon: AlertCircle,
  },
  timer: {
    bg: "bg-[#edf3fe] text-[#1f5fd6]",
    Icon: Timer,
  },
}

/** Columns at the widest breakpoint, by how many cards there are. */
const XL_COLUMNS: Record<number, string> = {
  1: "xl:grid-cols-1",
  2: "xl:grid-cols-2",
  3: "xl:grid-cols-3",
}

const SUB_CARD_BG = {
  teal: "bg-[#e0f5f8] text-[#0a6b78]",
  blue: "bg-[#edf3fe] text-[#1f5fd6]",
  amber: "bg-[#fff5e0] text-[#8a5300]",
  rose: "bg-[#fdedef] text-[#a51d30]",
}

interface DashboardKpiStripProps {
  cards?: KpiCardData[]
}

export const DEFAULT_KPI_CARDS: KpiCardData[] = [
  {
    title: "Total Cases handled",
    value: "6",
    note: "+2 from yesterday",
    iconType: "person_add",
    subCards: [
      { label: "Active", value: "3", tone: "teal" },
      { label: "Completed", value: "2", tone: "blue" },
    ],
  },
  {
    title: "In progress",
    value: "14",
    note: "open cases",
    iconType: "pending_actions",
    subCards: [
      { label: "Assessment", value: "8", tone: "amber" },
      { label: "Transactions", value: "6", tone: "blue" },
    ],
  },
  {
    title: "Patients Served",
    value: "3",
    note: "oldest 2 hours",
    iconType: "hourglass",
    subCards: [
      { label: "MAIFIP", value: "2", tone: "amber" },
      { label: "PCSO", value: "1", tone: "amber" },
    ],
  },
  {
    title: "Average TAT",
    value: "2",
    note: "need revision",
    iconType: "revision",
    subCards: [
      { label: "Mayor's Office", value: "1", tone: "rose" },
      { label: "CAF", value: "1", tone: "rose" },
    ],
  },
]

export const DashboardKpiStrip: React.FC<DashboardKpiStripProps> = ({
  cards = DEFAULT_KPI_CARDS,
}) => {
  if (cards.length === 0) return null

  return (
    <section
      data-node-id="144:1486"
      className={cn(
        "grid w-full grid-cols-1 overflow-hidden rounded-[16px] border border-[#e4e9f2] bg-white font-[Plus_Jakarta_Sans,sans-serif] shadow-[0px_1px_1px_rgba(12,42,91,0.04),0px_2px_3px_rgba(12,42,91,0.05)]",
        cards.length > 1 && "sm:grid-cols-2",
        XL_COLUMNS[cards.length] ?? "xl:grid-cols-4"
      )}
    >
      {cards.map((col, index) => {
        const iconInfo = ICON_CONFIG[col.iconType] || ICON_CONFIG.person_add
        const IconComponent = iconInfo.Icon

        return (
          <div
            key={col.title}
            className={cn(
              "flex flex-col gap-[14px] px-[24px] py-[22px]",
              index > 0 && "border-t border-[#e4e9f2] sm:border-t-0",
              index % 2 === 1 && "sm:border-l sm:border-[#e4e9f2]",
              index > 0 && "xl:border-l xl:border-[#e4e9f2]"
            )}
          >
            {/* Header: Title + Icon */}
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-semibold text-[#5b6678]">
                {col.title}
              </span>
              <div
                className={cn(
                  "flex size-[38px] shrink-0 items-center justify-center rounded-full",
                  iconInfo.bg
                )}
              >
                <IconComponent className="size-[19px]" />
              </div>
            </div>

            {/* Value + Note */}
            <div className="flex items-baseline gap-[10px]">
              <span className="text-[36px] leading-[36px] font-bold tracking-[-1px] text-[#0c2a5b]">
                {col.value}
              </span>
              <span className="text-[13px] font-normal text-[#5b6678]">
                {col.note}
              </span>
            </div>

            {/* Bottom 2 Sub-Cards */}
            <div className="flex items-start gap-[8px]">
              {col.subCards.map((sub) => (
                <div
                  key={sub.label}
                  className={cn(
                    "flex flex-1 flex-col items-start rounded-[10px] px-[12px] py-[8px]",
                    SUB_CARD_BG[sub.tone]
                  )}
                >
                  <span className="w-full truncate text-[12px] leading-normal font-semibold">
                    {sub.label}
                  </span>
                  <span className="text-[18px] leading-normal font-bold text-[#0c2a5b]">
                    {sub.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </section>
  )
}
