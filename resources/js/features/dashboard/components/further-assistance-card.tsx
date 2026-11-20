import React from "react"
import { RotateCcw, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export interface FurtherAssistanceItem {
  id: string
  patientId?: string
  patientName: string
  description: string
  dateLabel: string
}

interface FurtherAssistanceCardProps {
  items?: FurtherAssistanceItem[]
  onItemClick?: (item: FurtherAssistanceItem) => void
}

export const DEFAULT_FURTHER_ASSISTANCE: FurtherAssistanceItem[] = [
  {
    id: "fa-1",
    patientName: "Aida L. Manalo",
    description: "Second dialysis package",
    dateLabel: "Reopened today",
  },
  {
    id: "fa-2",
    patientName: "Hadji K. Tahir",
    description: "Transport to Davao referral",
    dateLabel: "Yesterday",
  },
  {
    id: "fa-3",
    patientName: "Corazon B. Enriquez",
    description: "Chemotherapy cycle 3",
    dateLabel: "09/21",
  },
]

export const FurtherAssistanceCard: React.FC<FurtherAssistanceCardProps> = ({
  items = DEFAULT_FURTHER_ASSISTANCE,
  onItemClick,
}) => {
  const displayItems = items

  return (
    <div
      data-node-id="144:1604"
      className="flex w-full flex-col overflow-hidden rounded-[16px] border border-[#e4e9f2] bg-white shadow-[0px_1px_2px_0px_rgba(12,42,91,0.04),0px_2px_6px_0px_rgba(12,42,91,0.05)]"
    >
      {/* Header */}
      <div className="flex items-center gap-[10px] px-[24px] py-[18px]">
        <div className="flex size-[34px] shrink-0 items-center justify-center rounded-[17px] bg-[#edf3fe] text-[#1f5fd6]">
          <RotateCcw className="size-[18px]" />
        </div>
        <h2 className="flex-1 text-[16px] leading-normal font-bold text-[#0c2a5b]">
          Further assistance
        </h2>

        <span className="flex h-[24px] items-center rounded-full bg-[#edf3fe] px-[10px] text-[12px] leading-normal font-bold text-[#1f5fd6]">
          {displayItems.length}
        </span>
      </div>

      {/* List */}
      <div className="flex flex-col">
        {displayItems.map((item) => (
          <div
            key={item.id}
            onClick={() => onItemClick?.(item)}
            className={cn(
              "flex items-center gap-[12px] border-t border-[#e4e9f2] bg-white px-[24px] py-[12px] transition-colors",
              onItemClick
                ? "cursor-pointer hover:bg-[#f4f7fc]"
                : "hover:bg-[#f4f7fc]/40"
            )}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
              <span className="truncate text-[14px] leading-normal font-semibold text-[#1b2433]">
                {item.patientName}
              </span>
              <span className="truncate text-[12px] leading-normal font-normal text-[#5b6678]">
                {item.description}
              </span>
            </div>

            <span className="shrink-0 text-[12px] font-normal whitespace-nowrap text-[#5b6678]">
              {item.dateLabel}
            </span>

            <ChevronRight className="size-[20px] shrink-0 text-[#5b6678]" />
          </div>
        ))}
        {displayItems.length === 0 && (
          <p className="border-t border-[#e4e9f2] px-[24px] py-[18px] text-center text-[13px] text-[#8a94a6]">
            No follow-ups due.
          </p>
        )}
      </div>
    </div>
  )
}
