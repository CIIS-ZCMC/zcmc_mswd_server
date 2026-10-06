import React from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { getCardColorConfig } from "../lib/case-card-color"
import type { CaseListItem } from "../types/case.types"
import { Calendar, ChevronRight, User } from "lucide-react"
import { cn } from "@/lib/utils"

interface CaseCardProps {
  item: CaseListItem
  onClick?: () => void
}

export const CaseCard: React.FC<CaseCardProps> = ({ item, onClick }) => {
  const cardColor = getCardColorConfig(item.cardColor)

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "open":
      case "active":
        return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
      case "closed":
        return "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30"
      case "referred":
        return "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
      case "for_review":
        return "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30"
      default:
        return "bg-muted text-muted-foreground border-border"
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "urgent":
      case "high":
        return "bg-destructive/15 text-destructive border-destructive/30"
      case "medium":
        return "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30"
      default:
        return "bg-muted text-muted-foreground border-border"
    }
  }

  return (
    <Card
      onClick={onClick}
      className={cn(
        "cursor-pointer border-2 transition-all hover:shadow-md hover:border-primary/50 relative overflow-hidden group border-l-6",
        cardColor.borderClass
      )}
    >
      <CardContent className="p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-base font-black text-foreground group-hover:text-primary transition-colors">
              {item.caseCode}
            </span>
            <Badge variant="outline" className={cn("text-xs font-bold border px-2 py-0.5", getStatusBadge(item.status))}>
              {item.status.toUpperCase()}
            </Badge>
            <Badge variant="outline" className={cn("text-xs font-bold border px-2 py-0.5", getPriorityBadge(item.priorityLevel))}>
              {item.priorityLevel}
            </Badge>
            <Badge variant="outline" className={cn("text-xs font-bold border px-2 py-0.5", cardColor.badgeClass)}>
              <span className={cn("size-2 rounded-full mr-1.5", cardColor.dotClass)} />
              {cardColor.label}
            </Badge>
          </div>

          <div className="flex items-center text-xs sm:text-sm font-medium text-muted-foreground gap-1.5">
            <Calendar className="size-4" />
            <span>{item.dateOpened ?? item.createdAt?.substring(0, 10) ?? "—"}</span>
            <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-0.5">
          <div className="space-y-0.5">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Patient</div>
            <div className="text-base font-bold text-foreground line-clamp-1">{item.patientName}</div>
            <div className="text-xs sm:text-sm font-mono text-muted-foreground">
              {item.patientHospitalNo ? `Hosp #${item.patientHospitalNo}` : ""}
              {item.patientMswdNo ? ` · MSWD #${item.patientMswdNo}` : ""}
            </div>
          </div>

          <div className="space-y-0.5">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Encounter / Service</div>
            <div className="text-sm sm:text-base font-semibold text-foreground">
              {item.admissionType ?? item.caseType ?? "General Case"}
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground">
              {item.transactionType ?? (item.transactionId ? `Tx #${item.transactionId}` : "Walk-in / OPD")}
            </div>
          </div>

          <div className="space-y-0.5">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Social Worker</div>
            <div className="text-sm sm:text-base font-semibold text-foreground flex items-center gap-1.5">
              <User className="size-4 text-primary" />
              <span>{item.assignedUserName ?? item.createdByUserName ?? "Unassigned"}</span>
            </div>
            {item.socialCaseStatus && (
              <div className="text-xs sm:text-sm font-medium text-muted-foreground">
                SCSR: <span className="font-semibold">{item.socialCaseStatus}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
