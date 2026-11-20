import React, { useState } from "react"
import { Search, Calendar, Bell } from "lucide-react"
import { cn } from "@/lib/utils"

interface DashboardHeaderProps {
  onOpenSearch: () => void
  dateLabel?: string
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  onOpenSearch,
  dateLabel = "Wed, Sep 23, 2026",
}) => {
  const [viewAs, setViewAs] = useState<"Processor" | "Head">("Processor")

  return (
    <header
      data-node-id="144:1459"
      className="flex h-[76px] w-full shrink-0 items-center justify-between border-b border-[#e4e9f2] bg-[#f4f7fc] px-[32px] font-[Plus_Jakarta_Sans,sans-serif]"
    >
      {/* Search Pill */}
      <div className="relative w-full max-w-[400px]">
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex h-[44px] w-full cursor-pointer items-center gap-[10px] rounded-full border border-[#e4e9f2] bg-white pr-[72px] pl-[46px] text-left transition-colors hover:border-[#1f5fd6]/40"
        >
          <span className="min-w-0 flex-1 truncate text-[14px] font-normal text-[#757575]">
            Search name, MSWD ID or PhilHealth no.
          </span>
        </button>
        <Search className="pointer-events-none absolute top-1/2 left-[16px] size-[20px] -translate-y-1/2 text-[#5b6678]" />
        <span className="pointer-events-none absolute top-1/2 right-[10px] -translate-y-1/2 rounded-[8px] border border-[#e4e9f2] bg-[#f4f7fc] px-[9px] py-px text-[11px] font-semibold text-[#5b6678]">
          Ctrl K
        </span>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-[12px]">
        {/* Date Pill */}
        <div className="hidden h-[46px] items-center gap-[8px] rounded-full border border-[#e4e9f2] bg-white px-[17px] text-[13px] font-semibold text-[#0c2a5b] sm:flex">
          <Calendar className="size-[18px] text-[#5b6678]" />
          <span className="whitespace-nowrap">{dateLabel}</span>
        </div>

        {/* Notification Bell */}
        <button
          type="button"
          className="relative flex size-[44px] cursor-pointer items-center justify-center rounded-full border border-[#e4e9f2] bg-white text-[#0c2a5b] transition-colors hover:bg-black/5"
          title="Notifications"
        >
          <Bell className="size-[20px]" />
          <span className="absolute top-[10px] right-[11px] size-[8px] rounded-full bg-[#d7263d] shadow-[0_0_0_2px_white]" />
        </button>

        {/* View as Segmented Control */}
        <div className="flex items-center gap-[4px] rounded-full border border-[#e4e9f2] bg-white p-[5px]">
          <button
            type="button"
            onClick={() => setViewAs("Processor")}
            className={cn(
              "h-[34px] cursor-pointer rounded-full px-[16px] text-[13px] font-semibold transition-colors",
              viewAs === "Processor"
                ? "bg-[#0c2a5b] text-white"
                : "text-[#5b6678] hover:text-[#0c2a5b]"
            )}
          >
            Processor
          </button>
          <button
            type="button"
            onClick={() => setViewAs("Head")}
            className={cn(
              "h-[34px] cursor-pointer rounded-full px-[16px] text-[13px] font-semibold transition-colors",
              viewAs === "Head"
                ? "bg-[#0c2a5b] text-white"
                : "text-[#5b6678] hover:text-[#0c2a5b]"
            )}
          >
            Head
          </button>
        </div>
      </div>
    </header>
  )
}
