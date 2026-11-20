import React, { useState } from "react"
import { format, parseISO } from "date-fns"
import { ArrowDownRight, ArrowUpRight, History, Minus } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency } from "@/lib/format-currency"
import { HOUSE_TENURE_OPTIONS, labelFor } from "@/lib/socioeconomic-constants"
import { HistoryDetailSheet } from "./history-detail-sheet"
import type { SocioeconomicHistoryItem } from "../types/socioeconomic.types"

interface TrendCardProps {
  history: SocioeconomicHistoryItem[]
}

export const TrendCard: React.FC<TrendCardProps> = ({ history }) => {
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(
    null
  )

  if (!history || history.length === 0) {
    return null
  }

  // Calculate change in total expenses vs previous record (index + 1)
  const getExpensesChangeIndicator = (index: number) => {
    if (index >= history.length - 1) return null
    const current = history[index].total
    const previous = history[index + 1].total
    if (
      current === null ||
      previous === null ||
      current === undefined ||
      previous === undefined
    )
      return null

    const diff = current - previous
    if (diff > 0) {
      return (
        <span className="ml-1.5 inline-flex items-center text-xs font-bold text-rose-600 dark:text-rose-400">
          <ArrowUpRight className="size-3.5" />+{formatCurrency(diff)}
        </span>
      )
    }
    if (diff < 0) {
      return (
        <span className="ml-1.5 inline-flex items-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
          <ArrowDownRight className="size-3.5" />
          {formatCurrency(diff)}
        </span>
      )
    }
    return (
      <span className="ml-1.5 inline-flex items-center text-xs text-muted-foreground">
        <Minus className="size-3.5" />0
      </span>
    )
  }

  return (
    <>
      <div className="overflow-hidden rounded-[16px] border border-[#e4e9f2] bg-white font-[Plus_Jakarta_Sans,sans-serif] shadow-[0px_1px_2px_0px_rgba(12,42,91,0.04),0px_2px_6px_0px_rgba(12,42,91,0.05)] dark:border-border dark:bg-card">
        <div className="border-b border-[#e4e9f2] bg-white px-5 py-4 dark:border-border dark:bg-card">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <History className="size-4.5" />
              </div>
              <div>
                <h3 className="text-[16px] leading-tight font-bold text-[#0c2a5b] dark:text-foreground">
                  Expense &amp; Income History
                </h3>
                <p className="text-[13px] text-[#5b6678] dark:text-muted-foreground">
                  Historical records and past living assessments
                </p>
              </div>
            </div>
            <span className="inline-flex items-center self-start rounded-full border border-[#cfd7e4] bg-[#f4f7fc] px-3 py-1 text-[11px] font-semibold text-[#5b6678] sm:self-auto dark:border-border dark:bg-muted/40 dark:text-muted-foreground">
              {history.length}{" "}
              {history.length === 1 ? "record on file" : "records on file"}
            </span>
          </div>
        </div>

        <div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#e4e9f2] bg-[#f4f7fc] hover:bg-[#f4f7fc] dark:border-border dark:bg-muted/60">
                  <TableHead className="h-9 text-[12px] font-semibold text-[#5b6678] dark:text-muted-foreground">
                    Assessment Date
                  </TableHead>
                  <TableHead className="h-9 text-[12px] font-semibold text-[#5b6678] dark:text-muted-foreground">
                    Housing Status
                  </TableHead>
                  <TableHead className="h-9 text-right text-[12px] font-semibold text-[#5b6678] dark:text-muted-foreground">
                    Family Income (₱)
                  </TableHead>
                  <TableHead className="h-9 text-right text-[12px] font-semibold text-[#5b6678] dark:text-muted-foreground">
                    Total Expenses (₱)
                  </TableHead>
                  <TableHead className="h-9 text-right text-[12px] font-semibold text-[#5b6678] dark:text-muted-foreground">
                    Net Balance (₱)
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {history.map((item, index) => {
                  const formattedDate = item.recordedOn
                    ? (() => {
                        try {
                          return format(
                            parseISO(item.recordedOn),
                            "MMM d, yyyy"
                          )
                        } catch {
                          return item.recordedOn
                        }
                      })()
                    : "—"

                  return (
                    <TableRow
                      key={item.id}
                      onClick={() => setSelectedProfileId(item.id)}
                      className="cursor-pointer border-b border-[#e4e9f2] text-[13px] transition-colors hover:bg-[#f4f7fc]/50 dark:border-border dark:hover:bg-muted/40"
                    >
                      <TableCell className="py-2.5 font-bold text-[#1f5fd6] hover:underline">
                        <div className="flex items-center gap-2">
                          <span>{formattedDate}</span>
                          {index === 0 && (
                            <span className="inline-flex items-center rounded-full bg-[#edf3fe] px-2 py-0.5 text-[10px] font-bold text-[#1f5fd6]">
                              Current
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5 text-[13px] font-medium text-[#1b2433] dark:text-foreground">
                        {labelFor(HOUSE_TENURE_OPTIONS, item.houseTenure) ||
                          "—"}
                      </TableCell>
                      <TableCell className="py-2.5 text-right font-mono font-bold text-[#1b2433] dark:text-foreground">
                        {formatCurrency(item.totalFamilyIncome)}
                      </TableCell>
                      <TableCell className="py-2.5 text-right font-mono font-bold text-[#1b2433] dark:text-foreground">
                        <div className="flex items-center justify-end">
                          <span>{formatCurrency(item.total)}</span>
                          {getExpensesChangeIndicator(index)}
                        </div>
                      </TableCell>
                      <TableCell
                        className={`py-2.5 text-right font-mono font-extrabold ${
                          item.balance !== null && item.balance < 0
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {formatCurrency(item.balance)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <HistoryDetailSheet
        profileId={selectedProfileId}
        isOpen={selectedProfileId !== null}
        onClose={() => setSelectedProfileId(null)}
      />
    </>
  )
}
