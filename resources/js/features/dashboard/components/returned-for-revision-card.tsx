import React from "react"
import { MessageSquareWarning } from "lucide-react"
import { cn } from "@/lib/utils"

export interface RevisionItem {
  id: string
  patientName: string
  amount: string
  guarantorAndService: string
  comment: string
  reviewer: string
}

const DEFAULT_REVISION_ITEMS: RevisionItem[] = [
  {
    id: "1",
    patientName: "gloria Dizon",
    amount: "₱15,000.00",
    guarantorAndService: "City Mayor's Office · Laboratory",
    comment:
      "“Monthly income on intake doesn't match the attached barangay certificate.”",
    reviewer: "Dr. Hernandez",
  },
  {
    id: "2",
    patientName: "Ramoncito Aquino",
    amount: "₱22,000.00",
    guarantorAndService: "CAF · Medicines",
    comment:
      "“Please attach the updated prescription from the attending physician.”",
    reviewer: "Dr. Hernandez",
  },
]

interface ReturnedForRevisionCardProps {
  items?: RevisionItem[]
  onItemClick?: (item: RevisionItem) => void
}

export const ReturnedForRevisionCard: React.FC<
  ReturnedForRevisionCardProps
> = ({ items = DEFAULT_REVISION_ITEMS, onItemClick }) => {
  return (
    <div
      data-node-id="144:1699"
      className="flex w-full flex-col gap-[12px] rounded-[16px] border border-[#e4e9f2] bg-white p-[21px]"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-[10px]">
          <div className="flex size-[32px] shrink-0 items-center justify-center rounded-[9px] bg-[#fdedef] text-[#a51d30]">
            <MessageSquareWarning className="size-[17px]" />
          </div>
          <h3 className="text-[15px] leading-tight font-bold text-[#0c2a5b]">
            Returned for revision
          </h3>
        </div>

        <span className="rounded-full bg-[#fdedef] px-[9px] py-[2px] text-[12px] leading-tight font-bold text-[#a51d30]">
          {items.length}
        </span>
      </div>

      {/* Items */}
      <div className="flex flex-col divide-y divide-[#eef1f6]">
        {items.map((item, idx) => (
          <div
            key={item.id}
            onClick={() => onItemClick?.(item)}
            className={cn(
              "flex flex-col gap-[8px] py-[12px] first:pt-[10px] last:pb-0 transition-colors",
              idx > 0 && "pt-[13px]",
              onItemClick && "cursor-pointer hover:opacity-95"
            )}
          >
            {/* Top Row: Name + Amount */}
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[13.5px] leading-tight font-bold text-[#0c2a5b]">
                {item.patientName}
              </span>
              <span className="text-[13px] leading-tight font-bold text-[#0c2a5b]">
                {item.amount}
              </span>
            </div>

            {/* Guarantor · Service */}
            <p className="text-[12px] leading-normal font-normal text-[#5b6678]">
              {item.guarantorAndService}
            </p>

            {/* Pink Reviewer Callout */}
            <div className="rounded-[12px] bg-[#fdedef] px-[14px] py-[10px] text-[12.5px] leading-[18.75px] font-normal text-[#a51d30]">
              <span>{item.comment} </span>
              <span className="font-semibold text-[#5b6678]">
                — {item.reviewer}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

