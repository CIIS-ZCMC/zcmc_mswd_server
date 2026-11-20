import {
  AlertCircle,
  PiggyBank,
  User,
  HeartHandshake,
  Store,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency } from "@/lib/format-currency"
import { useQueueActionGate } from "@/features/queue"
import type { ProfileIncome } from "../types/socioeconomic.types"

interface IncomeCardProps {
  income: ProfileIncome
  onUpdate?: () => void
}

export const IncomeCard: React.FC<IncomeCardProps> = ({ income, onUpdate }) => {
  const { canPerformActions, reason } = useQueueActionGate()
  const ratio = income.expenseToIncomeRatio
  const ratioPercent =
    ratio !== null && ratio !== undefined ? Math.round(ratio * 100) : null

  const getRatioBadge = (pct: number) => {
    if (pct <= 50) {
      return {
        label: "Comfortable (≤50%)",
        className:
          "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
        barColor: "bg-emerald-500",
      }
    }
    if (pct <= 80) {
      return {
        label: "Moderate (51–80%)",
        className:
          "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
        barColor: "bg-blue-500",
      }
    }
    if (pct <= 100) {
      return {
        label: "High Ratio (81–100%)",
        className:
          "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
        barColor: "bg-amber-500",
      }
    }
    return {
      label: "Deficit (>100%)",
      className:
        "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
      barColor: "bg-rose-500",
    }
  }

  const ratioInfo = ratioPercent !== null ? getRatioBadge(ratioPercent) : null

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[16px] border border-[#e4e9f2] bg-white font-[Plus_Jakarta_Sans,sans-serif] shadow-[0px_1px_2px_0px_rgba(12,42,91,0.04),0px_2px_6px_0px_rgba(12,42,91,0.05)] dark:border-border dark:bg-card">
      {/* Header with Total Family Income */}
      <div className="shrink-0 border-b border-[#e4e9f2] bg-white px-5 py-4 dark:border-border dark:bg-card">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <PiggyBank className="size-4.5" />
            </div>
            <div>
              <h3 className="text-[16px] leading-tight font-bold text-[#0c2a5b] dark:text-foreground">
                Family Income Sources
              </h3>
              <p className="text-[13px] text-[#5b6678] dark:text-muted-foreground">
                Household contributors &amp; monthly earnings
              </p>
            </div>
          </div>
          <div className="rounded-[10px] bg-[#f4f7fc] p-2.5 text-left sm:rounded-none sm:bg-transparent sm:p-0 sm:text-right dark:bg-muted/40">
            <span className="block text-[11px] font-bold tracking-wider text-[#5b6678] uppercase dark:text-muted-foreground">
              Total Family Income
            </span>
            <span className="block font-mono text-[18px] font-extrabold text-[#0c2a5b] dark:text-foreground">
              {formatCurrency(income.totalFamilyIncome)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-5 p-5">
        {/* Income Changed Warning Banner */}
        {income.incomeChanged && (
          <div className="flex flex-col justify-between gap-3 rounded-[12px] border border-amber-300 bg-[#fff5e0] p-3.5 text-[13px] text-[#8a5300] sm:flex-row sm:items-center dark:border-amber-700/50 dark:bg-amber-950/20 dark:text-amber-300">
            <div className="flex items-start gap-2.5 sm:items-center">
              <AlertCircle className="mt-0.5 size-4.5 shrink-0 text-amber-600 sm:mt-0 dark:text-amber-400" />
              <span>
                Family member incomes have been updated in patient master
                records since this evaluation.
              </span>
            </div>
            {onUpdate && (
              <Button
                variant="outline"
                size="sm"
                disabled={!canPerformActions}
                title={!canPerformActions ? reason : undefined}
                onClick={onUpdate}
                className="h-[32px] shrink-0 cursor-pointer rounded-full border-amber-400 bg-white px-3 text-[12px] font-semibold text-amber-900 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-card dark:text-amber-200"
              >
                Sync Changes
              </Button>
            )}
          </div>
        )}

        {/* Expense-to-Income Ratio Assessment Bar */}
        {ratioPercent !== null && ratioInfo && (
          <div className="space-y-2.5 rounded-[12px] border border-[#e4e9f2] bg-[#f4f7fc] p-4 dark:border-border dark:bg-muted/30">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <span className="block text-[13px] font-bold text-[#0c2a5b] dark:text-foreground">
                  Expense-to-Income Ratio
                </span>
                <span className="text-[12px] text-[#5b6678] dark:text-muted-foreground">
                  Percentage of monthly family income spent on living costs
                </span>
              </div>
              <Badge
                variant="outline"
                className={`self-start rounded-full px-3 py-0.5 text-[11px] font-bold sm:self-auto ${ratioInfo.className}`}
              >
                {ratioPercent}% ({ratioInfo.label})
              </Badge>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-[#e4e9f2] dark:bg-muted">
              <div
                className={`h-full rounded-full transition-all duration-300 ${ratioInfo.barColor}`}
                style={{ width: `${Math.min(ratioPercent, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Income Breakdown by Contributor Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="block text-[11px] font-bold tracking-wider text-[#5b6678] uppercase dark:text-muted-foreground">
              Declared Monthly Contributors
            </span>
            <span className="text-[12px] font-semibold text-[#5b6678] dark:text-muted-foreground">
              {1 + income.familyMembers.length + income.otherSources.length}{" "}
              sources
            </span>
          </div>

          <div className="overflow-hidden rounded-[12px] border border-[#e4e9f2] dark:border-border">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#e4e9f2] bg-[#f4f7fc] hover:bg-[#f4f7fc] dark:border-border dark:bg-muted/60">
                  <TableHead className="h-9 text-[12px] font-semibold text-[#5b6678] dark:text-muted-foreground">
                    Contributor / Source
                  </TableHead>
                  <TableHead className="h-9 text-[12px] font-semibold text-[#5b6678] dark:text-muted-foreground">
                    Relationship
                  </TableHead>
                  <TableHead className="h-9 text-right text-[12px] font-semibold text-[#5b6678] dark:text-muted-foreground">
                    Monthly Income (₱)
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {/* Patient row */}
                <TableRow className="border-b border-[#e4e9f2] bg-[#edf3fe]/40 text-[13px] hover:bg-[#edf3fe]/60 dark:border-border dark:bg-primary/5">
                  <TableCell className="py-2.5 font-semibold text-[#1b2433] dark:text-foreground">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-[28px] items-center justify-center rounded-full bg-[#edf3fe] text-[#1f5fd6] dark:bg-primary/20">
                        <User className="size-3.5" />
                      </div>
                      <div>
                        <span>Patient (Self)</span>
                        <span className="block text-[11px] font-normal text-[#5b6678] dark:text-muted-foreground">
                          Primary applicant
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <span className="inline-flex items-center rounded-full bg-[#edf3fe] px-2.5 py-0.5 text-[11px] font-bold text-[#1f5fd6]">
                      Self
                    </span>
                  </TableCell>
                  <TableCell className="py-2.5 text-right font-mono font-bold text-[#1b2433] dark:text-foreground">
                    {formatCurrency(income.patientIncome)}
                  </TableCell>
                </TableRow>

                {/* Family Members from Master Records */}
                {income.familyMembers.map((fm, idx) => (
                  <TableRow
                    key={idx}
                    className="border-b border-[#e4e9f2] text-[13px] hover:bg-[#f4f7fc]/50 dark:border-border"
                  >
                    <TableCell className="py-2.5 font-semibold text-[#1b2433] dark:text-foreground">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-[28px] items-center justify-center rounded-full bg-[#f4f7fc] text-[#5b6678] dark:bg-muted dark:text-muted-foreground">
                          <HeartHandshake className="size-3.5" />
                        </div>
                        <span>{fm.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <span className="inline-flex items-center rounded-full border border-[#cfd7e4] bg-white px-2.5 py-0.5 text-[11px] font-semibold text-[#5b6678] dark:border-border dark:bg-card dark:text-muted-foreground">
                        {fm.relationship || "Member"}
                      </span>
                    </TableCell>
                    <TableCell className="py-2.5 text-right font-mono font-bold text-[#1b2433] dark:text-foreground">
                      {formatCurrency(fm.monthlyIncome)}
                    </TableCell>
                  </TableRow>
                ))}

                {/* Other Additional Income Sources */}
                {income.otherSources.map((os, idx) => (
                  <TableRow
                    key={`other-${idx}`}
                    className="border-b border-[#e4e9f2] text-[13px] hover:bg-[#f4f7fc]/50 dark:border-border"
                  >
                    <TableCell className="py-2.5 font-semibold text-[#1b2433] dark:text-foreground">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-[28px] items-center justify-center rounded-full bg-[#f4f7fc] text-[#5b6678] dark:bg-muted dark:text-muted-foreground">
                          <Store className="size-3.5" />
                        </div>
                        <span>{os.source}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5 text-[12px] font-medium text-[#5b6678] dark:text-muted-foreground">
                      Other Livelihood
                    </TableCell>
                    <TableCell className="py-2.5 text-right font-mono font-bold text-[#1b2433] dark:text-foreground">
                      {formatCurrency(os.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>

              <TableFooter className="border-t border-[#e4e9f2] bg-[#f4f7fc] dark:border-border dark:bg-muted/60">
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="py-3 text-[13px] font-bold text-[#0c2a5b] dark:text-foreground"
                  >
                    Total Family Monthly Income
                  </TableCell>
                  <TableCell className="py-3 text-right font-mono text-[16px] font-extrabold text-[#0c2a5b] dark:text-foreground">
                    {formatCurrency(income.totalFamilyIncome)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </div>
      </div>
    </div>
  )
}
