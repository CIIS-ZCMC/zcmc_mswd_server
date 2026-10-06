import React from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { getCardColorConfig } from "../lib/case-card-color"
import type { CaseRecord } from "../types/case.types"
import { formatTransactionType } from "@/features/hospital/lib/transaction-type"
import { Building2, Stethoscope, User, Hash, UserCheck } from "lucide-react"

interface SocialCaseContextHeaderProps {
  caseRecord: CaseRecord
  className?: string
}

export const SocialCaseContextHeader: React.FC<SocialCaseContextHeaderProps> = ({
  caseRecord,
  className,
}) => {
  const cardColorConfig = getCardColorConfig(caseRecord.cardColor)

  const statusBadgeClass =
    caseRecord.status === "closed"
      ? "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30"
      : caseRecord.status === "referred"
        ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
        : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4 sm:p-5 shadow-2xs border-l-8 transition-all",
        cardColorConfig.borderClass,
        className
      )}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          {/* Top Row: Case Code, Status, Priority, Card Color */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Active Episode:
            </span>
            <span className="font-heading text-lg sm:text-xl font-extrabold tracking-tight font-mono text-foreground">
              {caseRecord.caseCode}
            </span>

            <Badge variant="outline" className={cn("text-xs font-bold px-2.5 py-0.5 border-2", statusBadgeClass)}>
              {caseRecord.status.toUpperCase()}
            </Badge>

            <Badge variant="outline" className="text-xs font-bold px-2 py-0.5 border">
              {caseRecord.priorityLevel} Priority
            </Badge>

            {/* Read-Only Card Color Badge */}
            <Badge variant="outline" className={cn("text-xs font-bold border px-2.5 py-0.5", cardColorConfig.badgeClass)}>
              <span className={cn("size-2 rounded-full mr-1.5", cardColorConfig.dotClass)} />
              {cardColorConfig.label}
            </Badge>
          </div>

          {/* Encounter & Medical Info: Case Type, Admission Type, HIS Encounter */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground font-medium pt-0.5">
            <span className="flex items-center gap-1.5 font-semibold text-foreground">
              <Stethoscope className="size-3.5 text-primary" />
              Case Type: <strong className="text-foreground font-bold">{caseRecord.caseType ?? "—"}</strong>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 font-semibold text-foreground">
              <Building2 className="size-3.5 text-primary" />
              Admission Type: <strong className="text-foreground font-bold">{caseRecord.admissionType ?? "—"}</strong>
            </span>
            {caseRecord.transactionId && (
              <>
                <span>•</span>
                <span className="font-mono flex items-center gap-1.5 text-muted-foreground">
                  <Hash className="size-3 text-primary/70" />
                  HIS Encounter #{caseRecord.transactionId}
                  {caseRecord.transactionType && (
                    <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-sans text-xs font-semibold">
                      {formatTransactionType(caseRecord.transactionType)}
                    </span>
                  )}
                </span>
              </>
            )}
          </div>

          {/* Social Worker Assignment Meta */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-0.5">
            <span className="flex items-center gap-1.5">
              <UserCheck className="size-3.5 text-primary/70" />
              Assigned to:{" "}
              <strong className="text-foreground font-semibold">
                {caseRecord.assignedUser?.name ?? "Unassigned"}
              </strong>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <User className="size-3.5 text-muted-foreground" />
              Opened by:{" "}
              <strong className="text-foreground font-semibold">
                {caseRecord.createdByUser?.name ?? "System"}
              </strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
