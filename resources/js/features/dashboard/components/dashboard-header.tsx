import React from "react"
import { Search, Calendar, Bell } from "lucide-react"
import { cn } from "@/lib/utils"

export type DashboardRoleView = "processor" | "head"

interface DashboardHeaderProps {
  onOpenSearch: () => void
  roleView: DashboardRoleView
  onRoleViewChange: (view: DashboardRoleView) => void
  dateLabel?: string
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  onOpenSearch,
  roleView,
  onRoleViewChange,
  dateLabel = "Wed, Sep 23, 2026",
}) => {
  return (
    <header
      data-node-id="144:1459"
      className="flex h-[76px] w-full shrink-0 items-center justify-between border-b border-[rgba(12,42,91,0.06)] bg-[#f4f7fc] px-[36px]"
    >
      {/* Search Pill */}
      <button
        type="button"
        onClick={onOpenSearch}
        className="flex h-[44px] w-full max-w-[400px] cursor-pointer items-center gap-[10px] rounded-full border border-[#e4e9f2] bg-white px-[17px] text-left transition-colors hover:border-[#1f5fd6]/40"
      >
        <Search className="size-[18px] shrink-0 text-[#5b6678]" />
        <span className="min-w-0 flex-1 truncate text-[13.5px] font-normal text-[#8a94a6]">
          Search name, MSWD ID or PhilHealth no.
        </span>
        <span className="shrink-0 rounded-[6px] border border-[#e4e9f2] bg-[#f4f7fc] px-[8px] py-[2px] text-[11px] leading-tight font-semibold text-[#5b6678]">
          Ctrl K
        </span>
      </button>

      {/* Right Actions */}
      <div className="flex items-center gap-[12px]">
        {/* Date Pill */}
        <div className="hidden h-[40px] items-center gap-[8px] rounded-full border border-[#e4e9f2] bg-white px-[15px] text-[13px] font-medium text-[#5b6678] sm:flex">
          <Calendar className="size-[16px] shrink-0 text-[#5b6678]" />
          <span className="whitespace-nowrap">{dateLabel}</span>
        </div>

        {/* Notification Button */}
        <button
          type="button"
          title="Notifications"
          className="relative flex size-[44px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#e4e9f2] bg-white text-[#0c2a5b] transition-colors hover:bg-white/80"
        >
          <Bell className="size-[20px]" />
          <span className="absolute top-[10px] right-[10px] size-[8px] rounded-full border-2 border-[#f4f7fc] bg-[#d7263d]" />
        </button>

        {/* View Switcher (Processor / Head) */}
        <div className="flex items-center gap-[4px] rounded-full border border-[#e4e9f2] bg-white p-[5px]">
          <button
            type="button"
            onClick={() => onRoleViewChange("processor")}
            className={cn(
              "cursor-pointer rounded-full px-[14px] py-[6px] text-[12px] leading-tight font-semibold transition-colors",
              roleView === "processor"
                ? "bg-[#0c2a5b] text-white"
                : "text-[#5b6678] hover:text-[#0c2a5b]"
            )}
          >
            Processor
          </button>
          <button
            type="button"
            onClick={() => onRoleViewChange("head")}
            className={cn(
              "cursor-pointer rounded-full px-[14px] py-[6px] text-[12px] leading-tight font-semibold transition-colors",
              roleView === "head"
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

