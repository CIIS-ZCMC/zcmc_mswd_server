import { AlertCircle, PiggyBank, User, HeartHandshake, Store } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import type { ProfileIncome } from "../types/socioeconomic.types"

interface IncomeCardProps {
  income: ProfileIncome
  onUpdate?: () => void
}

export const IncomeCard: React.FC<IncomeCardProps> = ({ income, onUpdate }) => {
  const ratio = income.expenseToIncomeRatio
  const ratioPercent = ratio !== null && ratio !== undefined ? Math.round(ratio * 100) : null

  const getRatioBadge = (pct: number) => {
    if (pct <= 50) {
      return {
        label: "Comfortable (≤50%)",
        className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
        barColor: "bg-emerald-500",
      }
    }
    if (pct <= 80) {
      return {
        label: "Moderate (51–80%)",
        className: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
        barColor: "bg-blue-500",
      }
    }
    if (pct <= 100) {
      return {
        label: "High Ratio (81–100%)",
        className: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
        barColor: "bg-amber-500",
      }
    }
    return {
      label: "Deficit (>100%)",
      className: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
      barColor: "bg-rose-500",
    }
  }

  const ratioInfo = ratioPercent !== null ? getRatioBadge(ratioPercent) : null

  return (
    <Card className="shadow-sm border rounded-2xl overflow-hidden bg-card h-full flex flex-col">
      {/* Header with Large Total Family Income */}
      <CardHeader className="py-4 px-5 border-b bg-muted/20 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <PiggyBank className="size-5" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg font-bold text-foreground">
                Family Income Sources
              </CardTitle>
              <p className="text-xs text-muted-foreground">Household contributors & monthly earnings</p>
            </div>
          </div>
          <div className="text-left sm:text-right bg-background sm:bg-transparent p-2.5 sm:p-0 rounded-xl border sm:border-0">
            <span className="text-xs text-muted-foreground block font-medium">Total Family Income</span>
            <span className="text-lg sm:text-xl font-bold text-foreground block">
              {formatCurrency(income.totalFamilyIncome)}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-5">
        {/* Income Changed Warning Banner */}
        {income.incomeChanged && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200 text-sm">
            <div className="flex items-start sm:items-center gap-2.5">
              <AlertCircle className="size-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5 sm:mt-0" />
              <span>
                Family member incomes have been updated in patient master records since this evaluation.
              </span>
            </div>
            {onUpdate && (
              <Button
                variant="outline"
                size="sm"
                onClick={onUpdate}
                className="h-8 text-xs font-bold bg-background hover:bg-muted border-amber-500/40 shrink-0 cursor-pointer shadow-2xs"
              >
                Sync Changes
              </Button>
            )}
          </div>
        )}

        {/* Expense-to-Income Ratio Assessment Bar */}
        {ratioPercent !== null && ratioInfo && (
          <div className="p-4 rounded-xl border bg-muted/10 space-y-2.5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-foreground block">Expense-to-Income Ratio</span>
                <span className="text-xs text-muted-foreground">
                  Percentage of monthly family income spent on living costs
                </span>
              </div>
              <Badge
                variant="outline"
                className={`text-xs font-bold px-3 py-1 self-start sm:self-auto rounded-full ${ratioInfo.className}`}
              >
                {ratioPercent}% ({ratioInfo.label})
              </Badge>
            </div>

            <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
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
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
              Declared Monthly Contributors
            </span>
            <span className="text-xs font-semibold text-muted-foreground">
              {1 + income.familyMembers.length + income.otherSources.length} sources
            </span>
          </div>

          <div className="rounded-xl border overflow-hidden shadow-2xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs sm:text-sm font-bold h-10">Contributor / Source</TableHead>
                  <TableHead className="text-xs sm:text-sm font-bold h-10">Relationship</TableHead>
                  <TableHead className="text-xs sm:text-sm font-bold h-10 text-right">
                    Monthly Income (₱)
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {/* Patient row */}
                <TableRow className="text-sm bg-primary/5">
                  <TableCell className="py-3 font-semibold">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                        <User className="size-4" />
                      </div>
                      <div>
                        <span>Patient (Self)</span>
                        <span className="text-xs text-muted-foreground block font-normal">Primary applicant</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge variant="secondary" className="text-xs font-semibold">
                      Self
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3 text-right font-bold text-foreground">
                    {formatCurrency(income.patientIncome)}
                  </TableCell>
                </TableRow>

                {/* Family Members from Master Records */}
                {income.familyMembers.map((fm, idx) => (
                  <TableRow key={idx} className="text-sm">
                    <TableCell className="py-3 font-semibold">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-md bg-muted text-muted-foreground">
                          <HeartHandshake className="size-4" />
                        </div>
                        <span>{fm.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge variant="outline" className="text-xs font-medium bg-background">
                        {fm.relationship || "Member"}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 text-right font-bold text-foreground">
                      {formatCurrency(fm.monthlyIncome)}
                    </TableCell>
                  </TableRow>
                ))}

                {/* Other Additional Income Sources */}
                {income.otherSources.map((os, idx) => (
                  <TableRow key={`other-${idx}`} className="text-sm">
                    <TableCell className="py-3 font-semibold">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-md bg-muted text-muted-foreground">
                          <Store className="size-4" />
                        </div>
                        <span>{os.source}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-xs text-muted-foreground font-medium">
                      Other Livelihood
                    </TableCell>
                    <TableCell className="py-3 text-right font-bold text-foreground">
                      {formatCurrency(os.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>

              <TableFooter className="bg-muted/30">
                <TableRow>
                  <TableCell colSpan={2} className="text-sm font-bold text-foreground">
                    Total Family Monthly Income
                  </TableCell>
                  <TableCell className="text-right text-base sm:text-lg font-bold text-foreground">
                    {formatCurrency(income.totalFamilyIncome)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
