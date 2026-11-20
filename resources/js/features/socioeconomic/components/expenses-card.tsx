import React, { useState } from "react"
import {
  Home,
  Lightbulb,
  Droplets,
  Receipt,
  ChevronDown,
  ChevronUp,
  Utensils,
  Bus,
  Stethoscope,
  ShieldCheck,
  GraduationCap,
  Shirt,
  UserPlus,
  MoreHorizontal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
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
import {
  HOUSE_TENURE_OPTIONS,
  LIGHT_SOURCE_OPTIONS,
  WATER_SOURCE_OPTIONS,
  labelFor,
} from "@/lib/socioeconomic-constants"
import {
  EXPENSE_ITEM_KEYS,
  EXPENSE_ITEM_LABELS,
  type ExpenseItemKey,
} from "../lib/expense-item-labels"
import type { ExpenseItems, HouseLiving } from "../types/socioeconomic.types"

interface ExpensesCardProps {
  house: HouseLiving
  lightSource: string[]
  lightAmount: number | null
  waterSource: string[]
  waterAmount: number | null
  expenses: ExpenseItems
  total: number | null
}

const EXPENSE_ICONS: Record<
  ExpenseItemKey,
  React.ComponentType<{ className?: string }>
> = {
  food: Utensils,
  transport: Bus,
  medical: Stethoscope,
  insurance: ShieldCheck,
  education: GraduationCap,
  clothing: Shirt,
  houseHelp: UserPlus,
  others: MoreHorizontal,
}

export const ExpensesCard: React.FC<ExpensesCardProps> = ({
  house,
  lightSource,
  lightAmount,
  waterSource,
  waterAmount,
  expenses,
  total,
}) => {
  const [showAllCategories, setShowAllCategories] = useState(false)
  const isRented = house.tenure === "rented"
  const hasHouseAmount =
    isRented &&
    house.rentAmount !== null &&
    house.rentAmount !== undefined &&
    house.rentAmount > 0
  const hasLightAmount =
    lightAmount !== null && lightAmount !== undefined && lightAmount > 0
  const hasWaterAmount =
    waterAmount !== null && waterAmount !== undefined && waterAmount > 0

  // Filter declared (active) items with > 0 amount or specified text
  const declaredKeys = EXPENSE_ITEM_KEYS.filter((key) => {
    const val = expenses[key]
    if (val !== null && val !== undefined && val > 0) return true
    if (
      key === "others" &&
      expenses.othersSpecify &&
      expenses.othersSpecify.trim() !== ""
    )
      return true
    return false
  })

  const unrecordedCount = EXPENSE_ITEM_KEYS.length - declaredKeys.length
  const displayedKeys = showAllCategories ? EXPENSE_ITEM_KEYS : declaredKeys

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[16px] border border-[#e4e9f2] bg-white font-[Plus_Jakarta_Sans,sans-serif] shadow-[0px_1px_2px_0px_rgba(12,42,91,0.04),0px_2px_6px_0px_rgba(12,42,91,0.05)] dark:border-border dark:bg-card">
      {/* Header with Total */}
      <div className="shrink-0 border-b border-[#e4e9f2] bg-white px-5 py-4 dark:border-border dark:bg-card">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Receipt className="size-4.5" />
            </div>
            <div>
              <h3 className="text-[16px] leading-tight font-bold text-[#0c2a5b] dark:text-foreground">
                Monthly Living Expenses
              </h3>
              <p className="text-[13px] text-[#5b6678] dark:text-muted-foreground">
                Household costs &amp; utilities evaluation
              </p>
            </div>
          </div>
          <div className="rounded-[10px] bg-[#f4f7fc] p-2.5 text-left sm:rounded-none sm:bg-transparent sm:p-0 sm:text-right dark:bg-muted/40">
            <span className="block text-[11px] font-bold tracking-wider text-[#5b6678] uppercase dark:text-muted-foreground">
              Total Expenses
            </span>
            <span className="block font-mono text-[18px] font-extrabold text-[#0c2a5b] dark:text-foreground">
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-5 p-5">
        {/* Living Conditions & Utilities Cards */}
        <div className="space-y-2">
          <span className="block text-[11px] font-bold tracking-wider text-[#5b6678] uppercase dark:text-muted-foreground">
            Living Environment
          </span>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* House / Lot */}
            <div className="space-y-1.5 rounded-[12px] border border-[#e4e9f2] bg-[#f4f7fc] p-3.5 dark:border-border dark:bg-muted/30">
              <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#5b6678] dark:text-muted-foreground">
                <Home className="size-3.5 text-amber-600 dark:text-amber-400" />
                <span>House &amp; Lot</span>
              </div>
              <div className="text-[13px] font-bold text-[#1b2433] dark:text-foreground">
                {labelFor(HOUSE_TENURE_OPTIONS, house.tenure) || "Not recorded"}
              </div>
              {isRented &&
                house.rentAmount !== null &&
                house.rentAmount !== undefined && (
                  <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 dark:text-amber-200">
                    {formatCurrency(house.rentAmount)} / mo
                  </span>
                )}
            </div>

            {/* Light Source */}
            <div className="space-y-1.5 rounded-[12px] border border-[#e4e9f2] bg-[#f4f7fc] p-3.5 dark:border-border dark:bg-muted/30">
              <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#5b6678] dark:text-muted-foreground">
                <Lightbulb className="size-3.5 text-amber-500" />
                <span>Light Source</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {lightSource.length > 0 ? (
                  lightSource.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center rounded-full border border-[#cfd7e4] bg-white px-2 py-0.5 text-[11px] font-semibold text-[#5b6678] dark:border-border dark:bg-card dark:text-muted-foreground"
                    >
                      {labelFor(LIGHT_SOURCE_OPTIONS, s) || s}
                    </span>
                  ))
                ) : (
                  <span className="text-[12px] text-[#5b6678] italic dark:text-muted-foreground">
                    None recorded
                  </span>
                )}
              </div>
              {lightAmount !== null && lightAmount !== undefined && (
                <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 dark:text-amber-200">
                  {formatCurrency(lightAmount)} / mo
                </span>
              )}
            </div>

            {/* Water Source */}
            <div className="space-y-1.5 rounded-[12px] border border-[#e4e9f2] bg-[#f4f7fc] p-3.5 dark:border-border dark:bg-muted/30">
              <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#5b6678] dark:text-muted-foreground">
                <Droplets className="size-3.5 text-blue-500" />
                <span>Water Source</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {waterSource.length > 0 ? (
                  waterSource.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center rounded-full border border-[#cfd7e4] bg-white px-2 py-0.5 text-[11px] font-semibold text-[#5b6678] dark:border-border dark:bg-card dark:text-muted-foreground"
                    >
                      {labelFor(WATER_SOURCE_OPTIONS, s) || s}
                    </span>
                  ))
                ) : (
                  <span className="text-[12px] text-[#5b6678] italic dark:text-muted-foreground">
                    None recorded
                  </span>
                )}
              </div>
              {waterAmount !== null && waterAmount !== undefined && (
                <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-blue-800 dark:text-blue-200">
                  {formatCurrency(waterAmount)} / mo
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Itemized Expenses Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="block text-[11px] font-bold tracking-wider text-[#5b6678] uppercase dark:text-muted-foreground">
              Declared Monthly Costs
            </span>
            <span className="text-[12px] font-semibold text-[#5b6678] dark:text-muted-foreground">
              {declaredKeys.length}{" "}
              {declaredKeys.length === 1 ? "item" : "items"} declared
            </span>
          </div>

          <div className="overflow-hidden rounded-[12px] border border-[#e4e9f2] dark:border-border">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#e4e9f2] bg-[#f4f7fc] hover:bg-[#f4f7fc] dark:border-border dark:bg-muted/60">
                  <TableHead className="h-9 text-[12px] font-semibold text-[#5b6678] dark:text-muted-foreground">
                    Expense Category
                  </TableHead>
                  <TableHead className="h-9 text-right text-[12px] font-semibold text-[#5b6678] dark:text-muted-foreground">
                    Monthly Amount (₱)
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {/* House / Lot Amount row */}
                {hasHouseAmount && (
                  <TableRow className="border-b border-[#e4e9f2] bg-amber-500/5 text-[13px] hover:bg-amber-500/10 dark:border-border">
                    <TableCell className="py-2.5 font-semibold text-[#1b2433] dark:text-foreground">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-[28px] items-center justify-center rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300">
                          <Home className="size-3.5" />
                        </div>
                        <div>
                          <span>
                            House / Lot{" "}
                            {house.tenure
                              ? `(${labelFor(HOUSE_TENURE_OPTIONS, house.tenure) || house.tenure})`
                              : ""}
                          </span>
                          <span className="block text-[11px] font-normal text-[#5b6678] dark:text-muted-foreground">
                            Monthly dwelling cost
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5 text-right font-mono font-bold text-[#1b2433] dark:text-foreground">
                      {formatCurrency(house.rentAmount)}
                    </TableCell>
                  </TableRow>
                )}

                {/* Light Source Amount row */}
                {hasLightAmount && (
                  <TableRow className="border-b border-[#e4e9f2] bg-amber-500/5 text-[13px] hover:bg-amber-500/10 dark:border-border">
                    <TableCell className="py-2.5 font-semibold text-[#1b2433] dark:text-foreground">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-[28px] items-center justify-center rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300">
                          <Lightbulb className="size-3.5" />
                        </div>
                        <div>
                          <span>Light Source</span>
                          <span className="block text-[11px] font-normal text-[#5b6678] dark:text-muted-foreground">
                            {lightSource
                              .map(
                                (s) => labelFor(LIGHT_SOURCE_OPTIONS, s) || s
                              )
                              .join(", ")}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5 text-right font-mono font-bold text-[#1b2433] dark:text-foreground">
                      {formatCurrency(lightAmount)}
                    </TableCell>
                  </TableRow>
                )}

                {/* Water Source Amount row */}
                {hasWaterAmount && (
                  <TableRow className="border-b border-[#e4e9f2] bg-blue-500/5 text-[13px] hover:bg-blue-500/10 dark:border-border">
                    <TableCell className="py-2.5 font-semibold text-[#1b2433] dark:text-foreground">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-[28px] items-center justify-center rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300">
                          <Droplets className="size-3.5" />
                        </div>
                        <div>
                          <span>Water Source</span>
                          <span className="block text-[11px] font-normal text-[#5b6678] dark:text-muted-foreground">
                            {waterSource
                              .map(
                                (s) => labelFor(WATER_SOURCE_OPTIONS, s) || s
                              )
                              .join(", ")}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5 text-right font-mono font-bold text-[#1b2433] dark:text-foreground">
                      {formatCurrency(waterAmount)}
                    </TableCell>
                  </TableRow>
                )}

                {/* Displayed Expense Items */}
                {displayedKeys.length === 0 &&
                !hasHouseAmount &&
                !hasLightAmount &&
                !hasWaterAmount ? (
                  <TableRow>
                    <TableCell
                      colSpan={2}
                      className="py-6 text-center text-[13px] text-[#5b6678] italic dark:text-muted-foreground"
                    >
                      No monthly household expenses recorded on this assessment.
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedKeys.map((key) => {
                    const amount = expenses[key]
                    const label = EXPENSE_ITEM_LABELS[key]
                    const Icon = EXPENSE_ICONS[key] || Receipt
                    const isOthers = key === "others"
                    const specifyText = isOthers ? expenses.othersSpecify : null
                    const hasValue =
                      amount !== null && amount !== undefined && amount > 0

                    return (
                      <TableRow
                        key={key}
                        className={`border-b border-[#e4e9f2] text-[13px] hover:bg-[#f4f7fc]/50 dark:border-border ${hasValue ? "" : "bg-[#f4f7fc]/30 opacity-60 dark:bg-muted/10"}`}
                      >
                        <TableCell className="py-2.5 font-semibold text-[#1b2433] dark:text-foreground">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`flex size-[28px] items-center justify-center rounded-full ${hasValue ? "bg-[#edf3fe] text-[#1f5fd6] dark:bg-primary/20" : "bg-[#f4f7fc] text-[#5b6678] dark:bg-muted dark:text-muted-foreground"}`}
                            >
                              <Icon className="size-3.5" />
                            </div>
                            <div>
                              <span>{label}</span>
                              {isOthers && specifyText && (
                                <span className="block text-[11px] font-normal text-[#5b6678] dark:text-muted-foreground">
                                  Note: {specifyText}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5 text-right font-mono font-bold text-[#1b2433] dark:text-foreground">
                          {hasValue ? (
                            formatCurrency(amount)
                          ) : (
                            <span className="text-[12px] font-normal text-[#5b6678] dark:text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>

              <TableFooter className="border-t border-[#e4e9f2] bg-[#f4f7fc] dark:border-border dark:bg-muted/60">
                <TableRow>
                  <TableCell className="py-3 text-[13px] font-bold text-[#0c2a5b] dark:text-foreground">
                    Total Declared Expenses
                  </TableCell>
                  <TableCell className="py-3 text-right font-mono text-[16px] font-extrabold text-[#0c2a5b] dark:text-foreground">
                    {formatCurrency(total)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>

          {/* Toggle unrecorded categories */}
          {unrecordedCount > 0 && (
            <div className="pt-1 text-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAllCategories((prev) => !prev)}
                className="h-8 cursor-pointer gap-1.5 rounded-full text-[12px] font-semibold text-[#5b6678] hover:bg-[#f4f7fc] hover:text-[#0c2a5b] dark:text-muted-foreground dark:hover:text-foreground"
              >
                <span>
                  {showAllCategories
                    ? "Hide unrecorded categories"
                    : `View all 8 standard categories (${unrecordedCount} unrecorded)`}
                </span>
                {showAllCategories ? (
                  <ChevronUp className="size-3.5" />
                ) : (
                  <ChevronDown className="size-3.5" />
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
