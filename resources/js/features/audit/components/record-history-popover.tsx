import React, { useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { History, Clock, User, ArrowRight } from "lucide-react"
import { useRecordHistory } from "../hooks/use-activity-log"

interface RecordHistoryPopoverProps {
  /**
   * The model's class basename, as `ActivityResource` emits it and as the
   * server resolves it back (`App\Models\{subjectType}`) — so
   * `PatientFamilyMember`, not `FamilyMember`. A name that resolves to no
   * class matches nothing and the popover just comes up empty.
   */
  subjectType: string
  /** One specific record's id — not the patient's, unless the subject *is* the patient. */
  subjectId: string | number
  label?: string
  onViewFullHistory?: () => void
}

export const RecordHistoryPopover: React.FC<RecordHistoryPopoverProps> = ({
  subjectType,
  subjectId,
  label,
  onViewFullHistory,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const numericId = typeof subjectId === "number" ? subjectId : parseInt(subjectId, 10) || 0

  // Fetch on open, not on mount: five of these per detail view would otherwise
  // add five requests to every render for data almost nobody expands.
  const { data, isLoading } = useRecordHistory(subjectType, numericId, 5, isOpen)

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        className="h-7 w-7 p-0 flex items-center justify-center text-muted-foreground hover:text-primary rounded-full hover:bg-muted/50 transition-colors cursor-pointer"
        title={`View change history for ${label || subjectType}`}
      >
        <History className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4 space-y-3" align="end">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
            <History className="size-3.5 text-primary" />
            <span>{label ? `History: ${label}` : `${subjectType} History`}</span>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
            Last 5
          </Badge>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-4 text-muted-foreground">
            <Spinner className="size-4" />
          </div>
        ) : !data || !data.data || data.data.length === 0 ? (
          <div className="text-center py-4 text-xs text-muted-foreground italic">
            No history entries for this record.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            {data.data.map((item) => (
              <div key={item.id} className="text-xs space-y-1 border-b border-border/40 pb-2 last:border-b-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-bold text-foreground line-clamp-1">
                    {item.subject_label || item.description || item.event}
                  </span>
                  <Badge variant="secondary" className="text-[10px] font-mono px-1">
                    {item.event}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="size-3 text-primary" />
                    {item.causer?.name || "System"}
                  </span>
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="size-3" />
                    {item.created_at ? new Date(item.created_at).toLocaleDateString() : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {onViewFullHistory && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsOpen(false)
              onViewFullHistory()
            }}
            className="w-full text-xs font-semibold h-8 gap-1.5 mt-1"
          >
            Full Patient History <ArrowRight className="size-3" />
          </Button>
        )}
      </PopoverContent>
    </Popover>
  )
}
