import React from "react"
import { format, parseISO } from "date-fns"
import { Calendar, Home, Receipt, User } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Table,
  TableBody,
  TableCell,
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
} from "../lib/expense-item-labels"
import { useSocioeconomicProfile } from "../hooks/use-socioeconomic"

interface HistoryDetailSheetProps {
  profileId: number | null
  isOpen: boolean
  onClose: () => void
}

export const HistoryDetailSheet: React.FC<HistoryDetailSheetProps> = ({
  profileId,
  isOpen,
  onClose,
}) => {
  const {
    data: profile,
    isLoading,
    isError,
    error,
  } = useSocioeconomicProfile(isOpen ? profileId : null)

  const formattedDate = profile?.recordedOn
    ? (() => {
        try {
          return format(parseISO(profile.recordedOn), "MMMM d, yyyy")
        } catch {
          return profile.recordedOn
        }
      })()
    : "Historical Record"

  const isRented = profile?.house?.tenure === "rented"

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 font-[Plus_Jakarta_Sans,sans-serif] sm:max-w-lg"
      >
        <SheetHeader className="border-b border-[#e4e9f2] bg-[#f4f7fc] p-5 dark:border-border dark:bg-muted/40">
          <SheetTitle className="flex items-center gap-2 text-[16px] font-bold text-[#0c2a5b] dark:text-foreground">
            <Calendar className="size-4 text-[#1f5fd6]" />
            <span>List of Expenses — {formattedDate}</span>
          </SheetTitle>
          <SheetDescription className="text-[12px] text-[#5b6678] dark:text-muted-foreground">
            {profile?.recordedBy?.name ? (
              <span className="mt-0.5 flex items-center gap-1">
                <User className="size-3 text-emerald-600 dark:text-emerald-400" />
                Assessed by {profile.recordedBy.name}
              </span>
            ) : (
              "Historical snapshot"
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 p-5">
          {isLoading && (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-28 w-full rounded-lg" />
              <Skeleton className="h-40 w-full rounded-lg" />
            </div>
          )}

          {isError && (
            <Alert variant="destructive">
              <AlertTitle>Failed to load profile</AlertTitle>
              <AlertDescription className="text-xs">
                {(error as Error)?.message ||
                  "An unexpected error occurred while fetching the snapshot."}
              </AlertDescription>
            </Alert>
          )}

          {profile && !isLoading && (
            <>
              {/* Financial Balance Summary */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-lg border bg-card/60 p-3">
                  <span className="block text-[11px] text-muted-foreground">
                    Total Family Income
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {formatCurrency(profile.income.totalFamilyIncome)}
                  </span>
                </div>
                <div className="rounded-lg border bg-card/60 p-3">
                  <span className="block text-[11px] text-muted-foreground">
                    Total Expenses
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {formatCurrency(profile.total)}
                  </span>
                </div>
              </div>

              {/* Net Balance */}
              <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-3 text-xs">
                <span className="font-medium text-muted-foreground">
                  Net Monthly Balance:
                </span>
                <span
                  className={`text-sm font-bold ${
                    profile.income.balance !== null &&
                    profile.income.balance < 0
                      ? "text-rose-600"
                      : "text-foreground"
                  }`}
                >
                  {formatCurrency(profile.income.balance)}
                </span>
              </div>

              {/* Housing & Utilities */}
              <div className="space-y-2 border-t pt-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <Home className="size-3.5" />
                  <span>House & Utilities</span>
                </div>
                <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                  <div className="rounded-lg border bg-muted/10 p-2.5">
                    <span className="block text-[11px] text-muted-foreground">
                      House / Lot
                    </span>
                    <span className="font-semibold text-foreground">
                      {labelFor(HOUSE_TENURE_OPTIONS, profile.house.tenure) ||
                        "—"}
                    </span>
                    {isRented &&
                      profile.house.rentAmount !== null &&
                      profile.house.rentAmount !== undefined && (
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">
                          {formatCurrency(profile.house.rentAmount)}/mo
                        </span>
                      )}
                  </div>
                  <div className="rounded-lg border bg-muted/10 p-2.5">
                    <span className="block text-[11px] text-muted-foreground">
                      Light Source
                    </span>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {profile.lightSource.length > 0 ? (
                        profile.lightSource.map((s) => (
                          <Badge
                            key={s}
                            variant="outline"
                            className="px-1.5 py-0 text-[10px]"
                          >
                            {labelFor(LIGHT_SOURCE_OPTIONS, s) || s}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                    {profile.lightAmount !== null &&
                      profile.lightAmount !== undefined && (
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">
                          {formatCurrency(profile.lightAmount)}/mo
                        </span>
                      )}
                  </div>
                  <div className="rounded-lg border bg-muted/10 p-2.5">
                    <span className="block text-[11px] text-muted-foreground">
                      Water Source
                    </span>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {profile.waterSource.length > 0 ? (
                        profile.waterSource.map((s) => (
                          <Badge
                            key={s}
                            variant="outline"
                            className="px-1.5 py-0 text-[10px]"
                          >
                            {labelFor(WATER_SOURCE_OPTIONS, s) || s}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                    {profile.waterAmount !== null &&
                      profile.waterAmount !== undefined && (
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">
                          {formatCurrency(profile.waterAmount)}/mo
                        </span>
                      )}
                  </div>
                </div>
              </div>

              {/* Itemized Expenses */}
              <div className="space-y-2 border-t pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Receipt className="size-3.5" />
                    <span>Itemized Expenses</span>
                  </div>
                  <span className="text-xs font-bold text-foreground">
                    Total: {formatCurrency(profile.total)}
                  </span>
                </div>

                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="h-7 text-xs">Item</TableHead>
                        <TableHead className="h-7 text-right text-xs">
                          Amount
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isRented &&
                        profile.house.rentAmount !== null &&
                        profile.house.rentAmount > 0 && (
                          <TableRow className="text-xs">
                            <TableCell className="py-1.5 font-medium">
                              House / Lot Rent
                            </TableCell>
                            <TableCell className="py-1.5 text-right font-medium">
                              {formatCurrency(profile.house.rentAmount)}
                            </TableCell>
                          </TableRow>
                        )}
                      {profile.lightAmount !== null &&
                        profile.lightAmount > 0 && (
                          <TableRow className="text-xs">
                            <TableCell className="py-1.5 font-medium">
                              Light Source
                            </TableCell>
                            <TableCell className="py-1.5 text-right font-medium">
                              {formatCurrency(profile.lightAmount)}
                            </TableCell>
                          </TableRow>
                        )}
                      {profile.waterAmount !== null &&
                        profile.waterAmount > 0 && (
                          <TableRow className="text-xs">
                            <TableCell className="py-1.5 font-medium">
                              Water Source
                            </TableCell>
                            <TableCell className="py-1.5 text-right font-medium">
                              {formatCurrency(profile.waterAmount)}
                            </TableCell>
                          </TableRow>
                        )}
                      {EXPENSE_ITEM_KEYS.map((key) => {
                        const amount = profile.expenses[key]
                        const label = EXPENSE_ITEM_LABELS[key]
                        const isOthers = key === "others"
                        const specifyText = isOthers
                          ? profile.expenses.othersSpecify
                          : null

                        return (
                          <TableRow key={key} className="text-xs">
                            <TableCell className="py-1.5 font-medium">
                              <span>{label}</span>
                              {isOthers && specifyText && (
                                <span className="ml-1 font-normal text-muted-foreground">
                                  ({specifyText})
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="py-1.5 text-right font-medium">
                              {amount !== null &&
                              amount !== undefined &&
                              amount > 0
                                ? formatCurrency(amount)
                                : "—"}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Remarks */}
              {profile.remarks && (
                <div className="space-y-1 border-t pt-2 text-xs">
                  <span className="font-medium text-muted-foreground">
                    Remarks
                  </span>
                  <p className="rounded border bg-muted/20 p-2.5 whitespace-pre-line text-foreground">
                    {profile.remarks}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
