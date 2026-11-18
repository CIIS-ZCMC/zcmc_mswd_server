import React from "react"
import { RotateCcw, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export interface FurtherAssistanceItem {
  id: string
  patientName: string
  description: string
  dateLabel: string
}

const DEFAULT_FURTHER_ASSISTANCE_ITEMS: FurtherAssistanceItem[] = [
  {
    id: "1",
    patientName: "Pedro Pascual",
    description: "Second dialysis package",
    dateLabel: "Reopened today",
  },
  {
    id: "2",
    patientName: "Marites Soriano",
    description: "Add laboratory guarantee letter",
    dateLabel: "Yesterday",
  },
  {
    id: "3",
    patientName: "Ernesto Ramos",
    description: "Follow-up chemotherapy cycle",
    dateLabel: "09/21",
  },
]

interface FurtherAssistanceCardProps {
  items?: FurtherAssistanceItem[]
  onItemClick?: (item: FurtherAssistanceItem) => void
}

export const FurtherAssistanceCard: React.FC<FurtherAssistanceCardProps> = ({
  items = DEFAULT_FURTHER_ASSISTANCE_ITEMS,
  onItemClick,
}) => {
  return (
    <div
      data-node-id="144:1604"
      className="flex w-full flex-col gap-[12px] rounded-[16px] border border-[#e4e9f2] bg-white p-[21px]"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-[10px]">
          <div className="flex size-[32px] shrink-0 items-center justify-center rounded-[9px] bg-[#edf3fe] text-[#1f5fd6]">
            <RotateCcw className="size-[17px]" />
          </div>
          <h3 className="text-[15px] leading-tight font-bold text-[#0c2a5b]">
            Further assistance
          </h3>
        </div>

        <span className="rounded-full bg-[#edf3fe] px-[9px] py-[2px] text-[12px] leading-tight font-bold text-[#1f5fd6]">
          {items.length}
        </span>
      </div>

      {/* List */}
      <div className="divide-y divide-[#eef1f6]">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => onItemClick?.(item)}
            className={cn(
              "flex items-center justify-between gap-[12px] py-[11px] first:pt-[10px] last:pb-0 transition-colors",
              onItemClick && "cursor-pointer hover:bg-[#f4f7fc]/50"
            )}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-[1px]">
              <span className="truncate text-[13.5px] leading-tight font-bold text-[#0c2a5b]">
                {item.patientName}
              </span>
              <span className="truncate text-[12px] leading-normal font-normal text-[#5b6678]">
                {item.description}
              </span>
            </div>

            <span className="shrink-0 text-[11.5px] font-medium text-[#8a94a6]">
              {item.dateLabel}
            </span>

            <ChevronRight className="size-[18px] shrink-0 text-[#8a94a6]" />
          </div>
        ))}
      </div>
    </div>
  )
}

