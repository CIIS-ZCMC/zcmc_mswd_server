import React from "react"
import { format, parseISO } from "date-fns"
import { Calendar, Pencil, Trash2, UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useQueueActionGate } from "@/features/queue"
import type { SocioeconomicCurrent } from "../types/socioeconomic.types"

interface SocioeconomicHeaderProps {
  current: SocioeconomicCurrent
  canUpdate: boolean
  canDelete: boolean
  onEdit: () => void
  onDelete: () => void
}

export const SocioeconomicHeader: React.FC<SocioeconomicHeaderProps> = ({
  current,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
}) => {
  const { canPerformActions, reason } = useQueueActionGate()
  const formattedDate = current.recordedOn
    ? (() => {
        try {
          return format(parseISO(current.recordedOn), "MMMM d, yyyy")
        } catch {
          return current.recordedOn
        }
      })()
    : "Unspecified date"

  return (
    <div className="flex flex-col justify-between gap-4 rounded-[16px] border border-[#e4e9f2] bg-white p-5 font-[Plus_Jakarta_Sans,sans-serif] shadow-[0px_1px_2px_0px_rgba(12,42,91,0.04),0px_2px_6px_0px_rgba(12,42,91,0.05)] sm:flex-row sm:items-center dark:border-border dark:bg-card">
      <div className="flex items-center gap-3.5">
        <div className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-[#edf3fe] dark:bg-muted">
          <img
            src="/images/patient-registry/tab-banknotes.svg"
            alt=""
            className="size-[20px]"
          />
        </div>
        <div className="space-y-1">
          <h2 className="text-[16px] leading-tight font-bold text-[#0c2a5b] dark:text-foreground">
            List of Expenses &amp; Living Assessment
          </h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[#5b6678] dark:text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="size-3.5 shrink-0 text-[#1f5fd6]" />
              <span>
                Recorded on:{" "}
                <strong className="font-semibold text-[#1b2433] dark:text-foreground">
                  {formattedDate}
                </strong>
              </span>
            </div>
            {current.recordedBy?.name && (
              <div className="flex items-center gap-1.5">
                <UserCheck className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>
                  Assessed by:{" "}
                  <strong className="font-semibold text-[#1b2433] dark:text-foreground">
                    {current.recordedBy.name}
                  </strong>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        {canUpdate && (
          <Button
            size="default"
            disabled={!canPerformActions}
            title={!canPerformActions ? reason : undefined}
            onClick={onEdit}
            className="h-[36px] cursor-pointer gap-2 rounded-full bg-[#1f5fd6] px-4 text-[13px] font-semibold text-white shadow-[0px_6px_7px_rgba(31,95,214,0.25)] transition-all hover:bg-[#1a53bd] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Pencil className="size-3.5" />
            <span>Update Record</span>
          </Button>
        )}
        {canDelete && (
          <Button
            variant="outline"
            size="default"
            disabled={!canPerformActions}
            title={!canPerformActions ? reason : undefined}
            onClick={onDelete}
            className="h-[36px] cursor-pointer gap-2 rounded-full border border-destructive/30 bg-white px-4 text-[13px] font-semibold text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-card"
          >
            <Trash2 className="size-3.5" />
            <span>Delete</span>
          </Button>
        )}
      </div>
    </div>
  )
}
