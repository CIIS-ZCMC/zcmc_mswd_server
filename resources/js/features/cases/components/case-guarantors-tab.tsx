import React, { useMemo, useState } from "react"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Edit2,
  Loader2,
  Plus,
  Receipt,
  SlidersHorizontal,
  Trash2,
} from "lucide-react"
import { usePermission } from "@/features/auth/hooks/use-permission"
import { useHospitalEncounter } from "@/features/hospital/hooks/use-hospital-encounters"
import {
  AssistanceSourcesManagerDialog,
  GuaranteeFormDialog,
  useDeleteGuarantee,
  useGuarantees,
} from "@/features/guarantees"
import type { PatientGuarantee } from "@/features/guarantees/types"
import { formatCurrency } from "@/lib/format-currency"

export interface CaseGuarantorsTabProps {
  patientId: number | string
  transactionId?: number | string | null
  caseCode?: string | null
  className?: string
}

interface UnifiedGuarantorRow {
  key: string
  name: string
  hisAmount: number | null
  glPosted: boolean | null
  glPostDate: string | null
  mswdGuarantee: PatientGuarantee | null
}

export const CaseGuarantorsTab: React.FC<CaseGuarantorsTabProps> = ({
  patientId,
  transactionId,
  caseCode,
  className = "",
}) => {
  const hasTransaction = Boolean(transactionId)
  const encounterId = transactionId ? Number(transactionId) : 0

  const canView = usePermission("guarantee.view")
  const canCreate = usePermission("guarantee.create")
  const canUpdate = usePermission("guarantee.update")
  const canDelete = usePermission("guarantee.delete")

  // Load HIS encounter details
  const { data: encounter, isLoading: isEncounterLoading } =
    useHospitalEncounter(encounterId, hasTransaction)

  // Load MSWD patient guarantees
  const { data: guaranteesData, isLoading: isGuaranteesLoading } =
    useGuarantees(patientId, transactionId ?? undefined, hasTransaction)
  const deleteMutation = useDeleteGuarantee(
    patientId,
    transactionId ?? undefined
  )

  const guaranteesList = guaranteesData?.data
  const grandTotal = guaranteesData?.grandTotal ?? 0

  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isManageTypesOpen, setIsManageTypesOpen] = useState(false)
  const [editingGuarantee, setEditingGuarantee] =
    useState<PatientGuarantee | null>(null)
  const [targetGuarantorName, setTargetGuarantorName] = useState<string | null>(
    null
  )
  const [lockGuarantor, setLockGuarantor] = useState(false)
  const [deletingGuarantee, setDeletingGuarantee] =
    useState<PatientGuarantee | null>(null)

  // Merge HIS billing guarantors and MSWD guarantee records
  const unifiedRows = useMemo<UnifiedGuarantorRow[]>(() => {
    const hisGuarantors = encounter?.guarantors ?? []
    const mswdGuarantees = guaranteesList ?? []
    const matchedMswdIds = new Set<number>()

    const rows: UnifiedGuarantorRow[] = hisGuarantors.map((hisG) => {
      const hisName = hisG.name?.trim().toLowerCase() ?? ""
      // Each MSWD record pairs with at most one HIS row; a nameless HIS row pairs with none.
      const match = hisName
        ? mswdGuarantees.find(
            (g) =>
              !matchedMswdIds.has(g.id) &&
              g.guarantor?.name.trim().toLowerCase() === hisName
          )
        : undefined
      if (match) {
        matchedMswdIds.add(match.id)
      }

      return {
        key: `his-${hisG.id}`,
        name: hisG.name ?? "Unnamed guarantor",
        hisAmount: hisG.amount,
        glPosted: hisG.glPosted,
        glPostDate: hisG.glPostDate,
        mswdGuarantee: match ?? null,
      }
    })

    // Add any MSWD guarantees that were added independently without a direct HIS match
    mswdGuarantees.forEach((g) => {
      if (!matchedMswdIds.has(g.id)) {
        rows.push({
          key: `mswd-${g.id}`,
          name: g.guarantor?.name ?? "Guarantor",
          hisAmount: null,
          glPosted: null,
          glPostDate: null,
          mswdGuarantee: g,
        })
      }
    })

    return rows
  }, [encounter?.guarantors, guaranteesList])

  if (!canView) {
    return null
  }

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const handleAddGeneral = () => {
    setEditingGuarantee(null)
    setTargetGuarantorName(null)
    setLockGuarantor(false)
    setIsFormOpen(true)
  }

  const handleAddForGuarantor = (guarantorName: string, rowKey: string) => {
    setEditingGuarantee(null)
    setTargetGuarantorName(guarantorName)
    setLockGuarantor(true)
    setIsFormOpen(true)
    // Auto expand row when adding
    setExpandedKeys((prev) => new Set(prev).add(rowKey))
  }

  const handleEdit = (g: PatientGuarantee) => {
    setEditingGuarantee(g)
    setTargetGuarantorName(null)
    setLockGuarantor(false)
    setIsFormOpen(true)
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

  if (!hasTransaction) {
    return (
      <Card className={`border bg-card/60 shadow-2xs ${className}`}>
        <CardHeader className="border-b p-4">
          <div className="flex items-center gap-2">
            <CreditCard className="size-4.5 shrink-0 text-muted-foreground" />
            <div className="space-y-0.5">
              <CardTitle className="text-sm font-bold text-foreground sm:text-base">
                Patient Guarantors & Assistance Breakdowns
              </CardTitle>
              <CardDescription className="text-xs">
                Guarantor coverage for Case #{caseCode ?? "—"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="bg-muted/10 p-8 text-center">
          <div className="mx-auto flex max-w-md flex-col items-center justify-center space-y-2.5">
            <div className="rounded-full bg-amber-500/10 p-3 text-amber-600 dark:text-amber-400">
              <AlertCircle className="size-6" />
            </div>
            <h4 className="text-sm font-bold text-foreground">
              No Hospital Encounter Linked
            </h4>
            <p className="text-xs leading-relaxed text-muted-foreground">
              This case episode does not have a linked hospital encounter (HIS
              transaction). Hospital billing guarantors and MSWD guarantee
              breakdowns are tied to hospital encounters.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const isLoading = isEncounterLoading || isGuaranteesLoading

  return (
    <div className={`space-y-6 ${className}`}>
      <Card className="border bg-card/60 shadow-2xs">
        <CardHeader className="border-b p-4 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-0.5">
              <CardTitle className="flex items-center gap-2 text-sm font-bold text-primary sm:text-base">
                <CreditCard className="size-4 shrink-0 text-primary" />
                Patient Guarantors & Assistance Breakdowns
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Hospital billing coverage and MSWD assistance breakdown lines
                for Encounter #{transactionId}.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {grandTotal > 0 && (
                <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-600 sm:text-sm dark:text-emerald-400">
                  Total Breakdown: {formatCurrency(grandTotal)}
                </div>
              )}
              {canCreate && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsManageTypesOpen(true)}
                    className="h-8 cursor-pointer gap-1.5 px-2.5 text-xs font-semibold shadow-2xs"
                    title="Manage Breakdown Types"
                  >
                    <SlidersHorizontal className="size-3.5 text-primary" />
                    Manage Types
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddGeneral}
                    className="h-8 cursor-pointer gap-1 px-2.5 text-xs font-bold shadow-2xs"
                  >
                    <Plus className="size-3.5" />
                    Add Guarantor Breakdown
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4">
          {isLoading ? (
            <div className="space-y-2 py-2">
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-14 w-full rounded-md" />
              <Skeleton className="h-14 w-full rounded-md" />
            </div>
          ) : unifiedRows.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/10 py-8 text-center text-sm font-medium text-muted-foreground">
              No billing guarantors or MSWD assistance records filed for this
              encounter.
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
                      HIS Posted Status
                    </TableHead>
                    <TableHead className="text-right text-xs font-bold text-foreground">
                      MSWD Breakdown Total
                    </TableHead>
                    <TableHead className="text-right text-xs font-bold text-foreground">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unifiedRows.map((row) => {
                    const isExpanded = expandedKeys.has(row.key)
                    const g = row.mswdGuarantee
                    const itemCount = g?.items?.length ?? 0

                    return (
                      <React.Fragment key={row.key}>
                        <TableRow className="transition-colors hover:bg-muted/30">
                          {/* Expand/collapse chevron */}
                          <TableCell className="px-2 py-3 text-center align-middle">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleExpand(row.key)}
                              className="size-6 cursor-pointer text-muted-foreground hover:text-foreground"
                              aria-label={
                                isExpanded
                                  ? "Collapse assistance breakdown"
                                  : "Expand assistance breakdown"
                              }
                            >
                              {isExpanded ? (
                                <ChevronDown className="size-4 text-primary" />
                              ) : (
                                <ChevronRight className="size-4" />
                              )}
                            </Button>
                          </TableCell>

                          {/* Guarantor Name & Breakdown Sources Badge */}
                          <TableCell className="text-sm font-bold text-foreground">
                            <div className="flex items-center gap-2">
                              <span>{row.name}</span>
                              {g ? (
                                <Badge
                                  variant="secondary"
                                  className="h-4 cursor-pointer bg-muted px-1.5 py-0 text-[10px] font-semibold text-muted-foreground hover:bg-muted/80"
                                  onClick={() => toggleExpand(row.key)}
                                >
                                  {itemCount}{" "}
                                  {itemCount === 1 ? "source" : "sources"}
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="h-4 border-dashed px-1.5 py-0 text-[10px] font-normal text-muted-foreground"
                                >
                                  No breakdown
                                </Badge>
                              )}
                            </div>
                            {g?.remarks && (
                              <div className="mt-0.5 line-clamp-1 text-[11px] font-normal text-muted-foreground">
                                {g.remarks}
                              </div>
                            )}
                          </TableCell>

                          {/* HIS Posted Status */}
                          <TableCell className="text-xs font-medium sm:text-sm">
                            {row.glPosted !== null ? (
                              row.glPosted ? (
                                <Badge
                                  variant="secondary"
                                  className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"
                                >
                                  Posted{" "}
                                  {row.glPostDate ? `(${row.glPostDate})` : ""}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  Not Posted
                                </span>
                              )
                            ) : (
                              <span className="text-xs text-muted-foreground italic">
                                MSWD Entry Only
                              </span>
                            )}
                          </TableCell>

                          {/* MSWD Breakdown Total */}
                          <TableCell className="text-right text-sm font-black text-emerald-600 sm:text-base dark:text-emerald-400">
                            {g ? formatCurrency(g.total) : "—"}
                          </TableCell>

                          {/* Row Actions */}
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {g ? (
                                <>
                                  {canUpdate && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleEdit(g)}
                                      className="size-7 cursor-pointer text-muted-foreground hover:text-foreground"
                                      title="Edit assistance breakdown"
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
                                      className="size-7 cursor-pointer text-destructive hover:bg-destructive/10 hover:text-destructive"
                                      title="Delete assistance breakdown"
                                    >
                                      <Trash2 className="size-3.5" />
                                    </Button>
                                  )}
                                </>
                              ) : (
                                canCreate && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      handleAddForGuarantor(row.name, row.key)
                                    }
                                    className="h-7 cursor-pointer gap-1 border-primary/30 px-2 text-xs font-bold text-primary hover:bg-primary/10"
                                  >
                                    <Plus className="size-3" />
                                    Add Breakdown
                                  </Button>
                                )
                              )}
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Collapsible Expanded Breakdown Area */}
                        {isExpanded && (
                          <TableRow className="border-b bg-muted/15 hover:bg-muted/20">
                            <TableCell colSpan={5} className="p-3.5 pl-10">
                              {g ? (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                                      <Receipt className="size-3.5 text-primary" />
                                      Assistance Sources Breakdown ({row.name})
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                      {g.referenceNo && (
                                        <span>
                                          Ref/GL:{" "}
                                          <strong className="font-mono text-foreground">
                                            {g.referenceNo}
                                          </strong>
                                        </span>
                                      )}
                                      {g.guaranteedOn && (
                                        <span>
                                          Date:{" "}
                                          <strong className="text-foreground">
                                            {g.guaranteedOn}
                                          </strong>
                                        </span>
                                      )}
                                      {g.recordedBy && (
                                        <span>
                                          Recorded by:{" "}
                                          <strong className="text-foreground">
                                            {g.recordedBy.name}
                                          </strong>
                                        </span>
                                      )}
                                    </div>
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
                              ) : (
                                <div className="flex flex-col items-center justify-between gap-3 rounded-lg border border-dashed bg-muted/20 p-3 text-xs text-muted-foreground sm:flex-row">
                                  <div className="flex items-center gap-2">
                                    <Receipt className="size-4 shrink-0 text-muted-foreground" />
                                    <span>
                                      No MSWD assistance breakdown recorded for{" "}
                                      <strong>{row.name}</strong> yet.
                                    </span>
                                  </div>
                                  {canCreate && (
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() =>
                                        handleAddForGuarantor(row.name, row.key)
                                      }
                                      className="h-7 cursor-pointer gap-1 px-2.5 text-xs font-bold"
                                    >
                                      <Plus className="size-3" />
                                      Add Assistance Breakdown
                                    </Button>
                                  )}
                                </div>
                              )}
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
      </Card>

      {/* Breakdown Add/Edit Modal */}
      <GuaranteeFormDialog
        patientId={patientId}
        transactionId={transactionId!}
        guarantee={editingGuarantee}
        initialGuarantorName={targetGuarantorName}
        lockGuarantor={lockGuarantor}
        open={isFormOpen}
        onOpenChange={(isOpen) => {
          setIsFormOpen(isOpen)
          if (!isOpen) {
            setEditingGuarantee(null)
            setTargetGuarantorName(null)
            setLockGuarantor(false)
          }
        }}
      />

      {/* Breakdown Types Manager Modal */}
      <AssistanceSourcesManagerDialog
        open={isManageTypesOpen}
        onOpenChange={setIsManageTypesOpen}
      />

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={Boolean(deletingGuarantee)}
        onOpenChange={(open) => !open && setDeletingGuarantee(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              Delete Assistance Breakdown
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Are you sure you want to delete the assistance breakdown for{" "}
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
              className="text-destructive-foreground cursor-pointer bg-destructive font-bold hover:bg-destructive/90"
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
    </div>
  )
}
