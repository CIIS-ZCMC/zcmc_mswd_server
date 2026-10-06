import React, { useState } from "react"
import { format, parseISO } from "date-fns"
import { ArrowDownRight, ArrowUpRight, History, Minus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/format-currency"
import { HOUSE_TENURE_OPTIONS, labelFor } from "@/lib/socioeconomic-constants"
import { HistoryDetailSheet } from "./history-detail-sheet"
import type { SocioeconomicHistoryItem } from "../types/socioeconomic.types"

interface TrendCardProps {
  history: SocioeconomicHistoryItem[]
}

export const TrendCard: React.FC<TrendCardProps> = ({ history }) => {
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null)

  if (!history || history.length === 0) {
    return null
  }

  // Calculate change in total expenses vs previous record (index + 1)
  const getExpensesChangeIndicator = (index: number) => {
    if (index >= history.length - 1) return null
    const current = history[index].total
    const previous = history[index + 1].total
    if (current === null || previous === null || current === undefined || previous === undefined) return null

    const diff = current - previous
    if (diff > 0) {
      return (
        <span className="inline-flex items-center text-xs text-rose-600 dark:text-rose-400 font-bold ml-1.5">
          <ArrowUpRight className="size-3.5" />
          +{formatCurrency(diff)}
        </span>
      )
    }
    if (diff < 0) {
      return (
        <span className="inline-flex items-center text-xs text-emerald-600 dark:text-emerald-400 font-bold ml-1.5">
          <ArrowDownRight className="size-3.5" />
          {formatCurrency(diff)}
        </span>
      )
    }
    return (
      <span className="inline-flex items-center text-xs text-muted-foreground ml-1.5">
        <Minus className="size-3.5" />
        0
      </span>
    )
  }

  return (
    <>
      <Card className="shadow-sm border rounded-2xl overflow-hidden bg-card">
        <CardHeader className="py-4 px-5 border-b bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <History className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-bold text-foreground">
                  Expense & Income History
                </CardTitle>
                <p className="text-xs text-muted-foreground">Historical records and past living assessments</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1 self-start sm:self-auto bg-background">
              {history.length} {history.length === 1 ? "record on file" : "records on file"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs sm:text-sm font-bold h-10">Assessment Date</TableHead>
                  <TableHead className="text-xs sm:text-sm font-bold h-10">Housing Status</TableHead>
                  <TableHead className="text-xs sm:text-sm font-bold h-10 text-right">Family Income (₱)</TableHead>
                  <TableHead className="text-xs sm:text-sm font-bold h-10 text-right">Total Expenses (₱)</TableHead>
                  <TableHead className="text-xs sm:text-sm font-bold h-10 text-right">Net Balance (₱)</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {history.map((item, index) => {
                  const formattedDate = item.recordedOn
                    ? (() => {
                        try {
                          return format(parseISO(item.recordedOn), "MMM d, yyyy")
                        } catch {
                          return item.recordedOn
                        }
                      })()
                    : "—"

                  return (
                    <TableRow
                      key={item.id}
                      onClick={() => setSelectedProfileId(item.id)}
                      className="text-sm cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <TableCell className="py-3 font-bold text-primary underline-offset-4 hover:underline">
                        <div className="flex items-center gap-2">
                          <span>{formattedDate}</span>
                          {index === 0 && (
                            <Badge variant="secondary" className="text-xs font-bold px-2 py-0">
                              Current
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 text-sm text-foreground font-medium">
                        {labelFor(HOUSE_TENURE_OPTIONS, item.houseTenure) || "—"}
                      </TableCell>
                      <TableCell className="py-3 text-right font-semibold text-foreground">
                        {formatCurrency(item.totalFamilyIncome)}
                      </TableCell>
                      <TableCell className="py-3 text-right font-semibold text-foreground">
                        <div className="flex items-center justify-end">
                          <span>{formatCurrency(item.total)}</span>
                          {getExpensesChangeIndicator(index)}
                        </div>
                      </TableCell>
                      <TableCell className={`py-3 text-right font-bold ${
                        item.balance !== null && item.balance < 0
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}>
                        {formatCurrency(item.balance)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <HistoryDetailSheet
        profileId={selectedProfileId}
        isOpen={selectedProfileId !== null}
        onClose={() => setSelectedProfileId(null)}
      />
    </>
  )
}
