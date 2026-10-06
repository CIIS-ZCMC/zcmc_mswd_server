import React, { useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ChevronDown,
  ChevronRight,
  CreditCard,
  Edit2,
  Loader2,
  Plus,
  Receipt,
  Trash2,
} from "lucide-react"
import { usePermission } from "@/features/auth/hooks/use-permission"
import { formatCurrency } from "@/lib/format-currency"
import { useDeleteGuarantee, useGuarantees } from "../hooks/use-guarantees"
import { GuaranteeFormDialog } from "./guarantee-form-dialog"
import type { PatientGuarantee } from "../types"

interface EncounterGuaranteesCardProps {
  patientId: number | string
  transactionId: number | string
  className?: string
}

export const EncounterGuaranteesCard: React.FC<
  EncounterGuaranteesCardProps
> = ({ patientId, transactionId, className = "" }) => {
  const canView = usePermission("guarantee.view")
  const canCreate = usePermission("guarantee.create")
  const canUpdate = usePermission("guarantee.update")
  const canDelete = usePermission("guarantee.delete")

  const { data, isLoading } = useGuarantees(
    patientId,
    transactionId,
    Boolean(patientId && transactionId)
  )
  const deleteMutation = useDeleteGuarantee(patientId, transactionId)

  const guarantees = data?.data ?? []
  const grandTotal = data?.grandTotal ?? 0

  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingGuarantee, setEditingGuarantee] =
    useState<PatientGuarantee | null>(null)
  const [deletingGuarantee, setDeletingGuarantee] =
    useState<PatientGuarantee | null>(null)

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleAdd = () => {
    setEditingGuarantee(null)
    setDialogOpen(true)
  }

  const handleEdit = (g: PatientGuarantee) => {
    setEditingGuarantee(g)
    setDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingGuarantee) return
    try {
      await deleteMutation.mutateAsync(deletingGuarantee.id)
    } catch {
      // The record stays in the list, so a failed delete is visible without a toast.
    } finally {
      setDeletingGuarantee(null)
    }
  }

  if (!canView) {
    return null
  }

  return (
    <Card className={`border bg-card/60 shadow-2xs ${className}`}>
      <CardHeader className="border-b p-4 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-0.5">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-primary sm:text-base">
              <CreditCard className="size-4 shrink-0 text-primary" />
              MSWD Patient Guarantors
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Guarantor coverage and assistance breakdowns logged by MSWD for
              this encounter.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2.5">
            {grandTotal > 0 && (
              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-600 sm:text-sm dark:text-emerald-400">
                Total: {formatCurrency(grandTotal)}
              </div>
            )}
            {canCreate && (
              <Button
                type="button"
                size="sm"
                onClick={handleAdd}
                className="h-8 gap-1 px-2.5 text-xs font-bold shadow-2xs"
              >
                <Plus className="size-3.5" />
                Add Guarantor
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 p-4">
        {isLoading ? (
          <div className="space-y-2 py-2">
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-12 w-full rounded-md" />
            <Skeleton className="h-12 w-full rounded-md" />
          </div>
        ) : guarantees.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/10 py-6 text-center text-sm font-medium text-muted-foreground">
            No MSWD patient guarantor records filed for this encounter.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-9 px-2 text-center"></TableHead>
                  <TableHead className="text-xs font-bold text-foreground">
                    Guarantor
                  </TableHead>
                  <TableHead className="text-xs font-bold text-foreground">
                    Reference / GL
                  </TableHead>
                  <TableHead className="text-xs font-bold text-foreground">
                    Date
                  </TableHead>
                  <TableHead className="text-right text-xs font-bold text-foreground">
                    Total Amount
                  </TableHead>
                  <TableHead className="text-xs font-bold text-foreground">
                    Recorded By
                  </TableHead>
                  {(canUpdate || canDelete) && (
                    <TableHead className="text-right text-xs font-bold text-foreground">
                      Actions
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {guarantees.map((g) => {
                  const isExpanded = expandedIds.has(g.id)
                  const itemCount = g.items.length

                  return (
                    <React.Fragment key={g.id}>
                      <TableRow className="transition-colors hover:bg-muted/30">
                        {/* Expand toggle */}
                        <TableCell className="px-2 py-3 text-center align-middle">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleExpand(g.id)}
                            className="size-6 text-muted-foreground hover:text-foreground"
                            aria-label={
                              isExpanded
                                ? "Collapse breakdown"
                                : "Expand breakdown"
                            }
                          >
                            {isExpanded ? (
                              <ChevronDown className="size-4 text-primary" />
                            ) : (
                              <ChevronRight className="size-4" />
                            )}
                          </Button>
                        </TableCell>

                        {/* Guarantor Name + Items Badge */}
                        <TableCell className="text-sm font-bold text-foreground">
                          <div className="flex items-center gap-2">
                            <span>{g.guarantor?.name ?? "—"}</span>
                            <Badge
                              variant="secondary"
                              className="h-4 cursor-pointer bg-muted px-1.5 py-0 text-[10px] font-semibold text-muted-foreground hover:bg-muted"
                              onClick={() => toggleExpand(g.id)}
                            >
                              {itemCount}{" "}
                              {itemCount === 1 ? "source" : "sources"}
                            </Badge>
                          </div>
                          {g.remarks && (
                            <div className="mt-0.5 line-clamp-1 text-[11px] font-normal text-muted-foreground">
                              {g.remarks}
                            </div>
                          )}
                        </TableCell>

                        {/* Reference / GL No */}
                        <TableCell className="text-xs font-medium text-muted-foreground sm:text-sm">
                          {g.referenceNo ? (
                            <span className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-xs font-semibold text-foreground">
                              {g.referenceNo}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>

                        {/* Date Guaranteed */}
                        <TableCell className="text-xs font-medium sm:text-sm">
                          {g.guaranteedOn ?? "—"}
                        </TableCell>

                        {/* Total Amount */}
                        <TableCell className="text-right text-sm font-black text-emerald-600 sm:text-base dark:text-emerald-400">
                          {formatCurrency(g.total)}
                        </TableCell>

                        {/* Recorded By */}
                        <TableCell className="text-xs text-muted-foreground">
                          {g.recordedBy?.name ?? "—"}
                        </TableCell>

                        {/* Actions */}
                        {(canUpdate || canDelete) && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {canUpdate && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(g)}
                                  className="size-7 text-muted-foreground hover:text-foreground"
                                  title="Edit guarantor"
                                >
                                  <Edit2 className="size-3.5" />
                                </Button>
                              )}
                              {canDelete && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeletingGuarantee(g)}
                                  className="size-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  title="Delete guarantor"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>

                      {/* Expanded Breakdown Table */}
                      {isExpanded && (
                        <TableRow className="border-b bg-muted/15 hover:bg-muted/20">
                          <TableCell
                            colSpan={canUpdate || canDelete ? 7 : 6}
                            className="p-3 pl-10"
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                                <Receipt className="size-3.5 text-primary" />
                                Assistance Sources Breakdown
                              </div>
                              <div className="overflow-hidden rounded-md border bg-background">
                                <Table>
                                  <TableHeader className="bg-muted/30">
                                    <TableRow className="h-7 border-b">
                                      <TableHead className="h-7 py-1 text-[11px] font-bold">
                                        Assistance Source
                                      </TableHead>
                                      <TableHead className="h-7 py-1 text-[11px] font-bold">
                                        Details / Specify
                                      </TableHead>
                                      <TableHead className="h-7 py-1 text-right text-[11px] font-bold">
                                        Amount
                                      </TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {g.items.map((item, idx) => (
                                      <TableRow
                                        key={item.id ?? idx}
                                        className="h-8 border-b last:border-b-0"
                                      >
                                        <TableCell className="py-1.5 text-xs font-semibold">
                                          {item.sourceName}
                                        </TableCell>
                                        <TableCell className="py-1.5 text-xs text-muted-foreground">
                                          {item.othersSpecify ? (
                                            <span className="italic">
                                              {item.othersSpecify}
                                            </span>
                                          ) : (
                                            "—"
                                          )}
                                        </TableCell>
                                        <TableCell className="py-1.5 text-right text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                          {formatCurrency(item.amount)}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Guarantee Add/Edit Dialog */}
      <GuaranteeFormDialog
        patientId={patientId}
        transactionId={transactionId}
        guarantee={editingGuarantee}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={Boolean(deletingGuarantee)}
        onOpenChange={(open) => !open && setDeletingGuarantee(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              Delete Patient Guarantor
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Are you sure you want to delete the guarantor record for{" "}
              <strong>
                {deletingGuarantee?.guarantor?.name ?? "this guarantor"}
              </strong>{" "}
              ({formatCurrency(deletingGuarantee?.total ?? 0)})? This action
              will remove all associated assistance breakdown lines.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="text-destructive-foreground bg-destructive font-bold hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Record"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
