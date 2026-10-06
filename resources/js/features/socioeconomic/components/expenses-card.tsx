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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import type {
  ExpenseItems,
  HouseLiving,
} from "../types/socioeconomic.types"

interface ExpensesCardProps {
  house: HouseLiving
  lightSource: string[]
  waterSource: string[]
  expenses: ExpenseItems
  total: number | null
}

const EXPENSE_ICONS: Record<ExpenseItemKey, React.ComponentType<{ className?: string }>> = {
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
  waterSource,
  expenses,
  total,
}) => {
  const [showAllCategories, setShowAllCategories] = useState(false)
  const isRented = house.tenure === "rented"

  // Filter declared (active) items with > 0 amount or specified text
  const declaredKeys = EXPENSE_ITEM_KEYS.filter((key) => {
    const val = expenses[key]
    if (val !== null && val !== undefined && val > 0) return true
    if (key === "others" && expenses.othersSpecify && expenses.othersSpecify.trim() !== "") return true
    return false
  })

  const unrecordedCount = EXPENSE_ITEM_KEYS.length - declaredKeys.length
  const displayedKeys = showAllCategories ? EXPENSE_ITEM_KEYS : declaredKeys

  return (
    <Card className="shadow-sm border rounded-2xl overflow-hidden bg-card h-full flex flex-col">
      {/* Header with Large Total */}
      <CardHeader className="py-4 px-5 border-b bg-muted/20 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Receipt className="size-5" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg font-bold text-foreground">
                Monthly Living Expenses
              </CardTitle>
              <p className="text-xs text-muted-foreground">Household costs & utilities evaluation</p>
            </div>
          </div>
          <div className="text-left sm:text-right bg-background sm:bg-transparent p-2.5 sm:p-0 rounded-xl border sm:border-0">
            <span className="text-xs text-muted-foreground block font-medium">Total Expenses</span>
            <span className="text-lg sm:text-xl font-bold text-foreground block">
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-5">
        {/* Living Conditions & Utilities Cards */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
            Living Environment
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* House / Lot */}
            <div className="p-3.5 rounded-xl border bg-muted/10 space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Home className="size-4 text-amber-600 dark:text-amber-400" />
                <span>House & Lot</span>
              </div>
              <div className="text-sm font-bold text-foreground">
                {labelFor(HOUSE_TENURE_OPTIONS, house.tenure) || "Not recorded"}
              </div>
              {isRented && house.rentAmount !== null && (
                <Badge variant="outline" className="text-xs font-semibold bg-amber-500/10 text-amber-800 dark:text-amber-200 border-amber-500/30">
                  {formatCurrency(house.rentAmount)} / month
                </Badge>
              )}
            </div>

            {/* Light Source */}
            <div className="p-3.5 rounded-xl border bg-muted/10 space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Lightbulb className="size-4 text-amber-500" />
                <span>Light Source</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {lightSource.length > 0 ? (
                  lightSource.map((s) => (
                    <Badge key={s} variant="secondary" className="text-xs font-semibold px-2 py-0.5">
                      {labelFor(LIGHT_SOURCE_OPTIONS, s) || s}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground italic">None recorded</span>
                )}
              </div>
            </div>

            {/* Water Source */}
            <div className="p-3.5 rounded-xl border bg-muted/10 space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Droplets className="size-4 text-blue-500" />
                <span>Water Source</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {waterSource.length > 0 ? (
                  waterSource.map((s) => (
                    <Badge key={s} variant="secondary" className="text-xs font-semibold px-2 py-0.5">
                      {labelFor(WATER_SOURCE_OPTIONS, s) || s}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground italic">None recorded</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Itemized Expenses Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
              Declared Monthly Costs
            </span>
            <span className="text-xs font-semibold text-muted-foreground">
              {declaredKeys.length} {declaredKeys.length === 1 ? "item" : "items"} declared
            </span>
          </div>

          <div className="rounded-xl border overflow-hidden shadow-2xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs sm:text-sm font-bold h-10">Expense Category</TableHead>
                  <TableHead className="text-xs sm:text-sm font-bold h-10 text-right">
                    Monthly Amount (₱)
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {/* If Rented, show House Rent row */}
                {isRented && house.rentAmount !== null && house.rentAmount > 0 && (
                  <TableRow className="text-sm bg-amber-500/5">
                    <TableCell className="py-3 font-semibold flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300">
                        <Home className="size-4" />
                      </div>
                      <div>
                        <span>House / Lot Rent</span>
                        <span className="text-xs text-muted-foreground block font-normal">Monthly dwelling rent</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-right font-bold text-foreground">
                      {formatCurrency(house.rentAmount)}
                    </TableCell>
                  </TableRow>
                )}

                {/* Displayed Expense Items */}
                {displayedKeys.length === 0 && !isRented ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-6 text-sm text-muted-foreground italic">
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
                    const hasValue = amount !== null && amount !== undefined && amount > 0

                    return (
                      <TableRow key={key} className={`text-sm ${hasValue ? "" : "opacity-60 bg-muted/10"}`}>
                        <TableCell className="py-3 font-semibold">
                          <div className="flex items-center gap-2.5">
                            <div className={`p-1.5 rounded-md ${hasValue ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                              <Icon className="size-4" />
                            </div>
                            <div>
                              <span>{label}</span>
                              {isOthers && specifyText && (
                                <span className="text-xs text-muted-foreground block font-normal mt-0.5">
                                  Note: {specifyText}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 text-right font-bold text-foreground">
                          {hasValue ? (
                            formatCurrency(amount)
                          ) : (
                            <span className="text-xs text-muted-foreground font-normal">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>

              <TableFooter className="bg-muted/30">
                <TableRow>
                  <TableCell className="text-sm font-bold text-foreground">
                    Total Declared Expenses
                  </TableCell>
                  <TableCell className="text-right text-base sm:text-lg font-bold text-foreground">
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
                className="h-8 text-xs font-semibold text-muted-foreground hover:text-foreground gap-1.5 cursor-pointer"
              >
                <span>{showAllCategories ? "Hide unrecorded categories" : `View all 8 standard categories (${unrecordedCount} unrecorded)`}</span>
                {showAllCategories ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
