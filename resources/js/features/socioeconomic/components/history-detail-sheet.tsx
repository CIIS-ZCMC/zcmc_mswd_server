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
  const { data: profile, isLoading, isError, error } = useSocioeconomicProfile(
    isOpen ? profileId : null
  )

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
        className="w-full sm:max-w-lg overflow-y-auto p-0 flex flex-col gap-0"
      >
        <SheetHeader className="p-5 border-b bg-muted/20">
          <SheetTitle className="text-base font-bold flex items-center gap-2">
            <Calendar className="size-4 text-primary" />
            <span>List of Expenses — {formattedDate}</span>
          </SheetTitle>
          <SheetDescription className="text-xs">
            {profile?.recordedBy?.name ? (
              <span className="flex items-center gap-1 mt-0.5">
                <User className="size-3" />
                Assessed by {profile.recordedBy.name}
              </span>
            ) : (
              "Historical snapshot"
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="p-5 space-y-5 flex-1">
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
                {(error as Error)?.message || "An unexpected error occurred while fetching the snapshot."}
              </AlertDescription>
            </Alert>
          )}

          {profile && !isLoading && (
            <>
              {/* Financial Balance Summary */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-lg border bg-card/60">
                  <span className="text-[11px] text-muted-foreground block">Total Family Income</span>
                  <span className="text-sm font-bold text-foreground">
                    {formatCurrency(profile.income.totalFamilyIncome)}
                  </span>
                </div>
                <div className="p-3 rounded-lg border bg-card/60">
                  <span className="text-[11px] text-muted-foreground block">Total Expenses</span>
                  <span className="text-sm font-bold text-foreground">
                    {formatCurrency(profile.total)}
                  </span>
                </div>
              </div>

              {/* Net Balance */}
              <div className="p-3 rounded-lg border bg-muted/20 flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Net Monthly Balance:</span>
                <span className={`font-bold text-sm ${
                  profile.income.balance !== null && profile.income.balance < 0
                    ? "text-rose-600"
                    : "text-foreground"
                }`}>
                  {formatCurrency(profile.income.balance)}
                </span>
              </div>

              {/* Housing & Utilities */}
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <Home className="size-3.5" />
                  <span>House & Utilities</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg border bg-muted/10">
                    <span className="text-[11px] text-muted-foreground block">House / Lot</span>
                    <span className="font-semibold text-foreground">
                      {labelFor(HOUSE_TENURE_OPTIONS, profile.house.tenure) || "—"}
                    </span>
                    {isRented && profile.house.rentAmount !== null && (
                      <span className="text-[11px] text-muted-foreground block mt-0.5">
                        {formatCurrency(profile.house.rentAmount)}/mo
                      </span>
                    )}
                  </div>
                  <div className="p-2.5 rounded-lg border bg-muted/10 sm:col-span-2">
                    <span className="text-[11px] text-muted-foreground block">Light / Water</span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {profile.lightSource.map((s) => (
                        <Badge key={s} variant="outline" className="text-[10px] px-1.5 py-0">
                          {labelFor(LIGHT_SOURCE_OPTIONS, s) || s}
                        </Badge>
                      ))}
                      {profile.waterSource.map((s) => (
                        <Badge key={s} variant="outline" className="text-[10px] px-1.5 py-0">
                          {labelFor(WATER_SOURCE_OPTIONS, s) || s}
                        </Badge>
                      ))}
                      {profile.lightSource.length === 0 && profile.waterSource.length === 0 && (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Itemized Expenses */}
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Receipt className="size-3.5" />
                    <span>Itemized Expenses</span>
                  </div>
                  <span className="text-xs font-bold text-foreground">
                    Total: {formatCurrency(profile.total)}
                  </span>
                </div>

                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="text-xs h-7">Item</TableHead>
                        <TableHead className="text-xs h-7 text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isRented && profile.house.rentAmount !== null && profile.house.rentAmount > 0 && (
                        <TableRow className="text-xs">
                          <TableCell className="py-1.5 font-medium">House / Lot Rent</TableCell>
                          <TableCell className="py-1.5 text-right font-medium">
                            {formatCurrency(profile.house.rentAmount)}
                          </TableCell>
                        </TableRow>
                      )}
                      {EXPENSE_ITEM_KEYS.map((key) => {
                        const amount = profile.expenses[key]
                        const label = EXPENSE_ITEM_LABELS[key]
                        const isOthers = key === "others"
                        const specifyText = isOthers ? profile.expenses.othersSpecify : null

                        return (
                          <TableRow key={key} className="text-xs">
                            <TableCell className="py-1.5 font-medium">
                              <span>{label}</span>
                              {isOthers && specifyText && (
                                <span className="text-muted-foreground font-normal ml-1">
                                  ({specifyText})
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="py-1.5 text-right font-medium">
                              {amount !== null && amount !== undefined && amount > 0
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
                <div className="space-y-1 pt-2 border-t text-xs">
                  <span className="text-muted-foreground font-medium">Remarks</span>
                  <p className="bg-muted/20 p-2.5 rounded border whitespace-pre-line text-foreground">
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
