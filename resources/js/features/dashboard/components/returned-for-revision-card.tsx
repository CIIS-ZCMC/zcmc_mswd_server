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

interface ReturnedForRevisionCardProps {
  items?: RevisionItem[]
  onItemClick?: (item: RevisionItem) => void
}

export const DEFAULT_REVISION_ITEMS: RevisionItem[] = [
  {
    id: "rev-1",
    patientName: "Rosalinda M. Abubakar",
    amount: "₱15,000.00",
    guarantorAndService: "City Mayor's Office · Laboratory",
    comment:
      "“Attach the updated statement of account — the one on file is dated 09/02.”",
    reviewer: "Dr. Hernandez",
  },
  {
    id: "rev-2",
    patientName: "Samuel D. Ortega",
    amount: "₱22,000.00",
    guarantorAndService: "CAF · Medicines",
    comment:
      "“Per-capita income looks high for class C3. Recheck household size.”",
    reviewer: "Dr. Hernandez",
  },
]

export const ReturnedForRevisionCard: React.FC<
  ReturnedForRevisionCardProps
> = ({ items = DEFAULT_REVISION_ITEMS, onItemClick }) => {
  const displayItems =
    items && items.length > 0 ? items : DEFAULT_REVISION_ITEMS

  return (
    <div
      data-node-id="144:1699"
      className="flex w-full flex-col overflow-hidden rounded-[16px] border border-[#e4e9f2] bg-white shadow-[0px_1px_2px_0px_rgba(12,42,91,0.04),0px_2px_6px_0px_rgba(12,42,91,0.05)]"
    >
      {/* Header */}
      <div className="flex items-center gap-[10px] px-[24px] py-[18px]">
        <div className="flex size-[34px] shrink-0 items-center justify-center rounded-[17px] bg-[#fdedef] text-[#a51d30]">
          <MessageSquareWarning className="size-[18px]" />
        </div>
        <h2 className="flex-1 text-[16px] leading-normal font-bold text-[#0c2a5b]">
          Returned for revision
        </h2>

        <span className="flex h-[24px] items-center rounded-full bg-[#fdedef] px-[10px] text-[12px] leading-normal font-bold text-[#a51d30]">
          {displayItems.length}
        </span>
      </div>

      {/* Items */}
      <div className="flex flex-col">
        {displayItems.map((item) => (
          <div
            key={item.id}
            onClick={() => onItemClick?.(item)}
            className={cn(
              "flex flex-col gap-[8px] border-t border-[#e4e9f2] bg-white px-[24px] pt-[14px] pb-[16px] transition-colors",
              onItemClick
                ? "cursor-pointer hover:bg-[#f4f7fc]"
                : "hover:bg-[#f4f7fc]/40"
            )}
          >
            {/* Top Row: Name + Amount */}
            <div className="flex items-center justify-between gap-[12px]">
              <span className="text-[14px] leading-normal font-semibold text-[#1b2433]">
                {item.patientName}
              </span>
              <span className="text-[14px] leading-normal font-bold text-[#0c2a5b]">
                {item.amount}
              </span>
            </div>

            {/* Guarantor · Service */}
            <p className="text-[12px] leading-normal font-normal text-[#5b6678]">
              {item.guarantorAndService}
            </p>

            {/* Pink Reviewer Callout */}
            <div className="rounded-[12px] bg-[#fdedef] px-[12px] py-[10px]">
              <p className="text-[13px] leading-[19.5px] font-normal text-[#1b2433]">
                <span>{item.comment} </span>
                <span className="text-[#5b6678]">— {item.reviewer}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
