import React, { useMemo, useState } from "react"
import { cn } from "@/lib/utils"

export type IntakeQueueTab = "new" | "open" | "all"

export interface IntakeQueueRow {
  id: string
  patientId?: string
  initials: string
  name: string
  mswdId: string
  source: "Self-intake" | "Returning" | "Staff-added"
  status: "New" | "Transactions" | "Pending approval"
  category: "new" | "open"
  arrived: string
}

const DEFAULT_INTAKE_ROWS: IntakeQueueRow[] = [
  {
    id: "1",
    initials: "MS",
    name: "Maria Elena Santos",
    mswdId: "MSWD-2026-0142",
    source: "Self-intake",
    status: "New",
    category: "new",
    arrived: "9:12 AM",
  },
  {
    id: "2",
    initials: "RL",
    name: "Roberto Lim",
    mswdId: "MSWD-2026-0138",
    source: "Returning",
    status: "Transactions",
    category: "open",
    arrived: "8:40 AM",
  },
  {
    id: "3",
    initials: "AV",
    name: "Ana Mae Villanueva",
    mswdId: "MSWD-2026-0141",
    source: "Self-intake",
    status: "New",
    category: "new",
    arrived: "8:55 AM",
  },
  {
    id: "4",
    initials: "LB",
    name: "Lorna Bautista",
    mswdId: "MSWD-2026-0135",
    source: "Staff-added",
    status: "Pending approval",
    category: "open",
    arrived: "Yesterday",
  },
  {
    id: "5",
    initials: "JM",
    name: "Josefa Mendoza",
    mswdId: "MSWD-2026-0140",
    source: "Self-intake",
    status: "New",
    category: "new",
    arrived: "8:48 AM",
  },
]

interface IntakeQueueCardProps {
  rows?: IntakeQueueRow[]
  onRowClick?: (row: IntakeQueueRow) => void
}

export const IntakeQueueCard: React.FC<IntakeQueueCardProps> = ({
  rows = DEFAULT_INTAKE_ROWS,
  onRowClick,
}) => {
  const [activeTab, setActiveTab] = useState<IntakeQueueTab>("all")

  const newCount = useMemo(
    () => rows.filter((r) => r.category === "new").length,
    [rows]
  )
  const openCount = useMemo(
    () => rows.filter((r) => r.category === "open").length,
    [rows]
  )

  const filteredRows = useMemo(() => {
    if (activeTab === "all") return rows
    return rows.filter((r) => r.category === activeTab)
  }, [rows, activeTab])

  return (
    <div
      data-node-id="144:1573"
      className="flex w-full flex-col gap-[16px] rounded-[16px] border border-[#e4e9f2] bg-white p-[24px]"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-[2px]">
          <h2 className="text-[17px] leading-tight font-bold tracking-[-0.17px] text-[#0c2a5b]">
            Intake queue
          </h2>
          <p className="text-[12.5px] leading-normal font-normal text-[#5b6678]">
            From the watcher tablet and the front desk
          </p>
        </div>

        {/* Segmented Filter Tabs */}
        <div className="flex items-center gap-[2px] rounded-full bg-[#f4f7fc] p-[4px]">
          <button
            type="button"
            onClick={() => setActiveTab("new")}
            className={cn(
              "cursor-pointer rounded-full px-[12px] py-[5px] text-[12px] leading-tight font-semibold transition-colors",
              activeTab === "new"
                ? "bg-[#0c2a5b] text-white"
                : "text-[#5b6678] hover:text-[#0c2a5b]"
            )}
          >
            New · {newCount}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("open")}
            className={cn(
              "cursor-pointer rounded-full px-[12px] py-[5px] text-[12px] leading-tight font-semibold transition-colors",
              activeTab === "open"
                ? "bg-[#0c2a5b] text-white"
                : "text-[#5b6678] hover:text-[#0c2a5b]"
            )}
          >
            Open · {openCount}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={cn(
              "cursor-pointer rounded-full px-[12px] py-[5px] text-[12px] leading-tight font-semibold transition-colors",
              activeTab === "all"
                ? "bg-[#0c2a5b] text-white"
                : "text-[#5b6678] hover:text-[#0c2a5b]"
            )}
          >
            All
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex flex-col">
        {/* Table Column Headers */}
        <div className="grid grid-cols-[1.6fr_0.9fr_1fr_0.55fr] items-center rounded-[10px] bg-[#f4f7fc] px-[12px] py-[10px] text-[11px] font-bold tracking-[0.66px] text-[#5b6678] uppercase">
          <span>Patient</span>
          <span>Source</span>
          <span>Status</span>
          <span className="text-right">Arrived</span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-[#eef1f6]">
          {filteredRows.map((row) => (
            <div
              key={row.id}
              onClick={() => onRowClick?.(row)}
              className={cn(
                "grid grid-cols-[1.6fr_0.9fr_1fr_0.55fr] items-center px-[12px] py-[13px] transition-colors",
                onRowClick && "cursor-pointer hover:bg-[#f4f7fc]/60"
              )}
            >
              {/* Patient Cell */}
              <div className="flex min-w-0 items-center gap-[10px] pr-2">
                <div className="flex size-[36px] shrink-0 items-center justify-center rounded-full bg-[#e0f5f8] text-[13px] font-bold text-[#0a6b78]">
                  {row.initials}
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-[13.5px] leading-tight font-bold text-[#0c2a5b]">
                    {row.name}
                  </span>
                  <span className="truncate text-[12px] leading-tight font-normal text-[#8a94a6]">
                    {row.mswdId}
                  </span>
                </div>
              </div>

              {/* Source Cell */}
              <div className="pr-2 text-[12.5px] font-medium text-[#5b6678]">
                {row.source}
              </div>

              {/* Status Cell */}
              <div className="pr-2">
                {row.status === "New" && (
                  <span className="inline-flex items-center gap-[5px] rounded-full bg-[#e0f5f8] px-[10px] py-[3px] text-[11.5px] font-semibold text-[#0a6b78]">
                    <span className="size-[6px] rounded-full bg-[#0a6b78]" />
                    New
                  </span>
                )}
                {row.status === "Transactions" && (
                  <span className="inline-flex items-center rounded-full bg-[#edf3fe] px-[10px] py-[3px] text-[11.5px] font-semibold text-[#1f5fd6]">
                    Transactions
                  </span>
                )}
                {row.status === "Pending approval" && (
                  <span className="inline-flex items-center rounded-full bg-[#fff5e0] px-[10px] py-[3px] text-[11.5px] font-semibold text-[#8a5300]">
                    Pending approval
                  </span>
                )}
              </div>

              {/* Arrived Cell */}
              <div className="text-right text-[12px] font-normal text-[#8a94a6]">
                {row.arrived}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

