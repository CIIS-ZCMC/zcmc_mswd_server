import React from "react"
import { format, parseISO } from "date-fns"
import { Calendar, Pencil, Trash2, UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border bg-card text-card-foreground shadow-sm">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2.5">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
            List of Expenses & Living Assessment
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs sm:text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="size-4 text-primary shrink-0" />
            <span>
              Recorded on: <strong className="font-semibold text-foreground">{formattedDate}</strong>
            </span>
          </div>
          {current.recordedBy?.name && (
            <div className="flex items-center gap-1.5">
              <UserCheck className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                Assessed by: <strong className="font-semibold text-foreground">{current.recordedBy.name}</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        {canUpdate && (
          <Button
            size="default"
            onClick={onEdit}
            className="h-9 sm:h-10 px-4 gap-2 text-xs sm:text-sm font-semibold cursor-pointer shadow-sm"
          >
            <Pencil className="size-4" />
            <span>Update Record</span>
          </Button>
        )}
        {canDelete && (
          <Button
            variant="outline"
            size="default"
            onClick={onDelete}
            className="h-9 sm:h-10 px-3.5 gap-2 text-xs sm:text-sm font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30 cursor-pointer"
          >
            <Trash2 className="size-4" />
            <span>Delete</span>
          </Button>
        )}
      </div>
    </div>
  )
}
