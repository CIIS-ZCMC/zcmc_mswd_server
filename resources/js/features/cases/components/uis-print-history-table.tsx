import React from "react"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useCaseUisPrintHistory } from "../hooks/use-uis-prints"
import { AlertCircle, Clock, History, Loader2, User } from "lucide-react"

export interface UisPrintHistoryTableProps {
  caseId?: number | string | null
  className?: string
  emptyAction?: React.ReactNode
}

export const UisPrintHistoryTable: React.FC<UisPrintHistoryTableProps> = ({
  caseId,
  className = "",
  emptyAction,
}) => {
  const { data: prints = [], isLoading, error } = useCaseUisPrintHistory(caseId)

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center gap-2 p-8 text-xs text-muted-foreground ${className}`}>
        <Loader2 className="size-4 animate-spin text-primary" />
        Loading print history…
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center gap-2 p-4 text-xs text-destructive ${className}`}>
        <AlertCircle className="size-4 shrink-0" />
        Could not load print history for this case.
      </div>
    )
  }

  if (prints.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 text-center space-y-2.5 bg-muted/10 ${className}`}>
        <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <History className="size-5 opacity-70" />
        </div>
        <div className="space-y-0.5">
          <div className="text-xs sm:text-sm font-semibold text-foreground">
            No Prints Recorded Yet
          </div>
          <p className="text-xs text-muted-foreground max-w-sm">
            Official prints of the Unified Intake Sheet (ANNEX B) will appear here with timestamps, copies, and remarks.
          </p>
        </div>
        {emptyAction && <div className="pt-2">{emptyAction}</div>}
      </div>
    )
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent bg-muted/30 text-xs">
            <TableHead className="font-bold">Printed By</TableHead>
            <TableHead className="font-bold">Date &amp; Time</TableHead>
            <TableHead className="font-bold">Copies</TableHead>
            <TableHead className="font-bold">Remarks</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {prints.map((log) => {
            const printDate = log.printed_at || log.created_at
            const formattedDate = printDate
              ? new Date(printDate).toLocaleString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"

            return (
              <TableRow key={log.id} className="text-xs">
                <TableCell className="font-medium text-foreground">
                  <span className="flex items-center gap-1.5">
                    <User className="size-3.5 text-muted-foreground" />
                    {log.printed_by?.name ?? "—"}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground font-mono">
                  <span className="flex items-center gap-1.5">
                    <Clock className="size-3.5 text-muted-foreground" />
                    {formattedDate}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono text-[11px] font-semibold px-2 py-0.2">
                    {log.copies ?? 1} cop{log.copies === 1 ? "y" : "ies"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {log.remarks ? log.remarks : <span className="text-muted-foreground/60">—</span>}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
