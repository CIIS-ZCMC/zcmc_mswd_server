import React from "react"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatTransactionType } from "@/features/hospital/lib/transaction-type"
import {
  getBracketColor,
  getClassificationBadgeText,
} from "@/features/cases/lib/classification"
import type { PatientUisRow } from "@/features/cases/types/uis.types"
import { CheckCircle2, AlertTriangle, Printer } from "lucide-react"

interface UisEncounterRailProps {
  rows: PatientUisRow[]
  selectedCaseId: number | null
  onSelectCase: (caseId: number) => void
  className?: string
}

export const UisEncounterRail: React.FC<UisEncounterRailProps> = ({
  rows,
  selectedCaseId,
  onSelectCase,
  className = "",
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Mobile Select (visible on < md) */}
      <div className="block md:hidden">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">
          Select Encounter / Case
        </label>
        <Select
          value={selectedCaseId ? String(selectedCaseId) : ""}
          onValueChange={(val) => onSelectCase(Number(val))}
        >
          <SelectTrigger className="w-full h-11">
            <SelectValue placeholder="Select an encounter" />
          </SelectTrigger>
          <SelectContent>
            {rows.map((row) => {
              const dateStr = row.case.dateOpened
                ? new Date(row.case.dateOpened).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : ""
              const typeStr = formatTransactionType(row.case.transactionType)

              return (
                <SelectItem key={row.case.id} value={String(row.case.id)}>
                  <span className="font-mono font-medium">{row.case.caseCode}</span>
                  <span className="text-muted-foreground ml-2">
                    · {typeStr} ({dateStr})
                  </span>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop Vertical Rail (visible on md+) */}
      <div className="hidden md:flex flex-col gap-2">
        <div className="flex items-center justify-between pb-1 border-b border-border/50">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Encounters ({rows.length})
          </span>
          <span className="text-[11px] text-muted-foreground">Newest first</span>
        </div>

        <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
          {rows.map((row) => {
            const isSelected = row.case.id === selectedCaseId
            const dateStr = row.case.dateOpened
              ? new Date(row.case.dateOpened).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "—"
            const typeStr = formatTransactionType(row.case.transactionType)
            const classCode =
              row.uis.classification?.classification ||
              row.uis.classification?.calculatedClassification ||
              row.uis.assessment?.classification ||
              null

            return (
              <button
                key={row.case.id}
                type="button"
                onClick={() => onSelectCase(row.case.id)}
                className={`w-full text-left p-3 rounded-lg border transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/30"
                    : "border-border/70 hover:border-border hover:bg-muted/40 bg-card"
                }`}
              >
                <div className="flex items-start justify-between gap-1.5 mb-1.5">
                  <div className="font-mono font-bold text-xs text-foreground truncate">
                    {row.case.caseCode}
                  </div>
                  {row.uis.hasAssessment ? (
                    <Badge
                      className={`text-[10px] px-1.5 py-0 font-bold uppercase ${getBracketColor(
                        classCode
                      )}`}
                    >
                      {getClassificationBadgeText(classCode)}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground px-1.5 py-0">
                      Unassessed
                    </Badge>
                  )}
                </div>

                <div className="text-[11px] text-muted-foreground truncate mb-2">
                  <span className="font-medium text-foreground/80">{typeStr}</span>
                  <span className="mx-1">·</span>
                  <span>{dateStr}</span>
                </div>

                <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-border/40 text-muted-foreground">
                  <div className="flex items-center gap-1">
                    {row.uis.ready ? (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="size-3" />
                        Ready to print
                      </span>
                    ) : row.uis.hasAssessment ? (
                      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                        <AlertTriangle className="size-3" />
                        {row.uis.missing.length} missing
                      </span>
                    ) : (
                      <span className="text-muted-foreground/80">No assessment</span>
                    )}
                  </div>

                  {row.uis.printCount > 0 && (
                    <span className="flex items-center gap-1 font-mono font-medium text-muted-foreground">
                      <Printer className="size-2.5" />
                      {row.uis.printCount}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
