import React, { useMemo, useState } from "react"
import { cn } from "@/lib/utils"

export type IntakeQueueTab = "new" | "open" | "all"

export interface IntakeQueueRow {
  id: string
  patientId?: string
  initials: string
  name: string
  mswdId: string
  purpose: string
  status:
    "New" | "Transactions" | "Pending approval" | "Waiting" | "In progress"
  category: "new" | "open"
  arrived: string
}

export const DEFAULT_QUEUE_ROWS: IntakeQueueRow[] = [
  {
    id: "1",
    initials: "JS",
    name: "Juanito R. Salazar",
    mswdId: "MSWD-202609-0151",
    purpose: "Self-intake",
    status: "New",
    category: "new",
    arrived: "8:42 AM",
  },
  {
    id: "2",
    initials: "NJ",
    name: "Nurhaida T. Jalani",
    mswdId: "MSWD-202609-0150",
    purpose: "Self-intake",
    status: "New",
    category: "new",
    arrived: "8:30 AM",
  },
  {
    id: "3",
    initials: "RA",
    name: "Rosalinda M. Abubakar",
    mswdId: "MSWD-202609-0148",
    purpose: "Returning",
    status: "Transactions",
    category: "open",
    arrived: "8:15 AM",
  },
  {
    id: "4",
    initials: "EV",
    name: "Ernesto P. Villanueva",
    mswdId: "MSWD-202609-0149",
    purpose: "Staff-added",
    status: "New",
    category: "new",
    arrived: "8:05 AM",
  },
  {
    id: "5",
    initials: "MF",
    name: "Maria Clara D. Fernandez",
    mswdId: "MSWD-202609-0147",
    purpose: "Self-intake",
    status: "Pending approval",
    category: "open",
    arrived: "7:58 AM",
  },
]

interface IntakeQueueCardProps {
  rows?: IntakeQueueRow[]
  isLoading?: boolean
  onRowClick?: (row: IntakeQueueRow) => void
}

export const IntakeQueueCard: React.FC<IntakeQueueCardProps> = ({
  rows = DEFAULT_QUEUE_ROWS,
  isLoading = false,
  onRowClick,
}) => {
  const [activeTab, setActiveTab] = useState<IntakeQueueTab>("all")

  const effectiveRows = rows

  const newCount = useMemo(
    () => effectiveRows.filter((r) => r.category === "new").length,
    [effectiveRows]
  )
  const openCount = useMemo(
    () => effectiveRows.filter((r) => r.category === "open").length,
    [effectiveRows]
  )

  const filteredRows = useMemo(() => {
    if (activeTab === "all") return effectiveRows
    return effectiveRows.filter((r) => r.category === activeTab)
  }, [effectiveRows, activeTab])

  const renderStatusBadge = (status: IntakeQueueRow["status"]) => {
    if (status === "New" || status === "Waiting") {
      return (
        <span className="inline-flex items-center rounded-full bg-[#e0f5f8] px-[10px] py-[3px] text-[12px] font-semibold text-[#0a6b78]">
          {status}
        </span>
      )
    }
    if (status === "Transactions" || status === "In progress") {
      return (
        <span className="inline-flex items-center rounded-full bg-[#edf3fe] px-[10px] py-[3px] text-[12px] font-semibold text-[#1f5fd6]">
          {status}
        </span>
      )
    }
    if (status === "Pending approval") {
      return (
        <span className="inline-flex items-center rounded-full bg-[#fff5e0] px-[10px] py-[3px] text-[12px] font-semibold text-[#8a5300]">
          Pending approval
        </span>
      )
    }
    return null
  }

  return (
    <div
      data-node-id="144:1573"
      className="flex w-full flex-col gap-[14px] rounded-[16px] border border-[#e4e9f2] bg-white p-[24px] font-[Plus_Jakarta_Sans,sans-serif] shadow-[0px_1px_1px_rgba(12,42,91,0.04),0px_2px_3px_rgba(12,42,91,0.05)]"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-[2px]">
          <h2 className="text-[18px] leading-tight font-bold text-[#0c2a5b]">
            Intake queue
          </h2>
          <p className="text-[13px] leading-normal font-normal text-[#5b6678]">
            Today's visits, waiting and being served
          </p>
        </div>

        {/* Segmented Filter Tabs */}
        <div className="flex items-center gap-[4px] rounded-full border border-[#e4e9f2] bg-[#f4f7fc] p-[5px]">
          <button
            type="button"
            onClick={() => setActiveTab("new")}
            className={cn(
              "h-[32px] cursor-pointer rounded-full px-[14px] text-[13px] font-semibold transition-colors",
              activeTab === "new"
                ? "bg-[#0c2a5b] text-white"
                : "text-[#5b6678] hover:text-[#0c2a5b]"
            )}
          >
            Waiting · {newCount}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("open")}
            className={cn(
              "h-[32px] cursor-pointer rounded-full px-[14px] text-[13px] font-semibold transition-colors",
              activeTab === "open"
                ? "bg-[#0c2a5b] text-white"
                : "text-[#5b6678] hover:text-[#0c2a5b]"
            )}
          >
            In progress · {openCount}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={cn(
              "h-[32px] cursor-pointer rounded-full px-[14px] text-[13px] font-semibold transition-colors",
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
        <div className="grid grid-cols-[1.5fr_1fr_1.1fr_0.6fr] items-center rounded-[10px] bg-[#f4f7fc] px-[16px] py-[10px] text-[12px] font-semibold text-[#5b6678]">
          <span>Patient</span>
          <span>Purpose</span>
          <span>Status</span>
          <span className="text-right">Arrived</span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-[#e4e9f2]">
          {filteredRows.map((row) => (
            <div
              key={row.id}
              onClick={() => onRowClick?.(row)}
              className={cn(
                "grid grid-cols-[1.5fr_1fr_1.1fr_0.6fr] items-center px-[16px] py-[12px] transition-colors",
                onRowClick && "cursor-pointer hover:bg-[#f4f7fc]/50"
              )}
            >
              {/* Patient Cell */}
              <div className="flex min-w-0 items-center gap-[10px] pr-2">
                <div className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-[#e0f5f8] text-[12px] font-bold text-[#0a6b78]">
                  {row.initials}
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-[13.5px] leading-tight font-bold text-[#0c2a5b]">
                    {row.name}
                  </span>
                  <span className="truncate font-mono text-[11.5px] leading-tight text-[#8a94a6]">
                    {row.mswdId}
                  </span>
                </div>
              </div>

              {/* Purpose Cell */}
              <div className="truncate pr-2 text-[12.5px] font-medium text-[#5b6678]">
                {row.purpose || "—"}
              </div>

              {/* Status Cell */}
              <div className="pr-2">{renderStatusBadge(row.status)}</div>

              {/* Arrived Cell */}
              <div className="text-right font-mono text-[12px] font-normal text-[#5b6678]">
                {row.arrived}
              </div>
            </div>
          ))}
        </div>

        {filteredRows.length === 0 && (
          <p className="py-[22px] text-center text-[13px] text-[#8a94a6]">
            {isLoading ? "Loading the queue..." : "No one is on the queue."}
          </p>
        )}
      </div>
    </div>
  )
}
