import React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getCardColorConfig } from "../lib/case-card-color"
import type { CaseListItem } from "../types/case.types"
import { ExternalLink, User } from "lucide-react"
import { cn } from "@/lib/utils"

interface CaseTableProps {
  items: CaseListItem[]
  onRowClick: (id: number) => void
}

export const CaseTable: React.FC<CaseTableProps> = ({ items, onRowClick }) => {
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
    <div className="rounded-xl border bg-card shadow-2xs overflow-hidden">
      <Table className="text-sm sm:text-base">
        <TableHeader className="bg-muted/50">
          <TableRow className="border-b hover:bg-transparent">
            <TableHead className="w-[190px] font-bold text-sm text-foreground py-3.5">Case Code & Category</TableHead>
            <TableHead className="font-bold text-sm text-foreground min-w-[220px] py-3.5">Patient</TableHead>
            <TableHead className="font-bold text-sm text-foreground min-w-[150px] py-3.5">Status / Priority</TableHead>
            <TableHead className="font-bold text-sm text-foreground min-w-[170px] py-3.5">Encounter / Type</TableHead>
            <TableHead className="font-bold text-sm text-foreground min-w-[170px] py-3.5">Social Worker</TableHead>
            <TableHead className="font-bold text-sm text-foreground w-[130px] py-3.5">Date Opened</TableHead>
            <TableHead className="text-right font-bold text-sm text-foreground w-[100px] py-3.5">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const cardColor = getCardColorConfig(item.cardColor)

            return (
              <TableRow
                key={item.id}
                onClick={() => onRowClick(item.id)}
                className="cursor-pointer transition-colors hover:bg-muted/50 group border-b"
              >
                {/* Case Code & Category */}
                <TableCell className="py-3.5 font-medium">
                  <div className="flex flex-col gap-1.5">
                    <span className="font-mono text-base font-bold text-foreground group-hover:text-primary transition-colors">
                      {item.caseCode}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn("text-xs w-fit font-bold border py-0.5 px-2", cardColor.badgeClass)}
                    >
                      <span className={cn("size-2 rounded-full mr-1.5", cardColor.dotClass)} />
                      {cardColor.label.split(" ")[0]} Card
                    </Badge>
                  </div>
                </TableCell>

                {/* Patient Information */}
                <TableCell className="py-3.5">
                  <div className="space-y-1">
                    <div className="text-base font-bold text-foreground line-clamp-1">
                      {item.patientName}
                    </div>
                    <div className="text-xs sm:text-sm font-mono text-muted-foreground">
                      {item.patientHospitalNo ? `Hosp #${item.patientHospitalNo}` : ""}
                      {item.patientMswdNo ? ` · MSWD #${item.patientMswdNo}` : ""}
                    </div>
                  </div>
                </TableCell>

                {/* Status & Priority */}
                <TableCell className="py-3.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={cn("text-xs sm:text-sm font-bold border px-2 py-0.5", getStatusBadge(item.status))}
                    >
                      {item.status.toUpperCase()}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn("text-xs sm:text-sm font-bold border px-2 py-0.5", getPriorityBadge(item.priorityLevel))}
                    >
                      {item.priorityLevel}
                    </Badge>
                  </div>
                </TableCell>

                {/* Encounter / Type */}
                <TableCell className="py-3.5">
                  <div className="space-y-0.5">
                    <div className="text-sm sm:text-base font-semibold text-foreground">
                      {item.admissionType ?? item.caseType ?? "General Case"}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      {item.transactionType ?? (item.transactionId ? `Tx #${item.transactionId}` : "Walk-in / OPD")}
                    </div>
                  </div>
                </TableCell>

                {/* Social Worker */}
                <TableCell className="py-3.5">
                  <div className="space-y-0.5">
                    <div className="text-sm sm:text-base font-semibold text-foreground flex items-center gap-1.5">
                      <User className="size-3.5 text-primary" />
                      <span className="truncate max-w-[150px]">
                        {item.assignedUserName ?? item.createdByUserName ?? "Unassigned"}
                      </span>
                    </div>
                    {item.socialCaseStatus && (
                      <div className="text-xs sm:text-sm text-muted-foreground font-medium">
                        SCSR: <span className="font-semibold">{item.socialCaseStatus}</span>
                      </div>
                    )}
                  </div>
                </TableCell>

                {/* Date Opened */}
                <TableCell className="py-3.5 text-sm sm:text-base text-muted-foreground font-medium whitespace-nowrap">
                  {item.dateOpened ?? item.createdAt?.substring(0, 10) ?? "—"}
                </TableCell>

                {/* Action */}
                <TableCell className="py-3.5 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRowClick(item.id)
                    }}
                    className="h-9 px-3 text-sm font-bold gap-1 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all"
                  >
                    <span>View</span>
                    <ExternalLink className="size-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
