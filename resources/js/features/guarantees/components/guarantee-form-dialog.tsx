import React, { useEffect, useId, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertCircle,
  CreditCard,
  Loader2,
  Plus,
  Receipt,
  SlidersHorizontal,
  Trash2,
} from "lucide-react"
import { usePermission } from "@/features/auth/hooks/use-permission"
import { formatCurrency } from "@/lib/format-currency"
import { ApiError } from "@/lib/api-client"
import { useAssistanceSources } from "../hooks/use-assistance-sources"
import { useGuarantorOptions } from "../hooks/use-guarantor-options"
import { useCreateGuarantee, useUpdateGuarantee } from "../hooks/use-guarantees"
import { AssistanceSourcesManagerDialog } from "./assistance-sources-manager-dialog"
import type {
  PatientGuarantee,
  SaveGuaranteeInput,
  SaveGuaranteeItemInput,
} from "../types"

interface FormLineItem {
  id?: number
  localId: string
  sourceId: number | null
  amount: string
  othersSpecify: string
}

interface GuaranteeFormDialogProps {
  patientId: number | string
  transactionId: number | string
  guarantee?: PatientGuarantee | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function getTodayString(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export const GuaranteeFormDialog: React.FC<GuaranteeFormDialogProps> = ({
  patientId,
  transactionId,
  guarantee,
  open,
  onOpenChange,
}) => {
  const isEditing = Boolean(guarantee?.id)
  const prefix = useId()
  const canManageSources = usePermission("guarantee.create")
  const [isManageTypesOpen, setIsManageTypesOpen] = useState(false)

  const { data: guarantorOptions = [], isLoading: loadingGuarantors } =
    useGuarantorOptions(true)
  const { data: assistanceSources = [], isLoading: loadingSources } =
    useAssistanceSources(true)

  const createMutation = useCreateGuarantee(patientId, transactionId)
  const updateMutation = useUpdateGuarantee(patientId, transactionId)
  const isPending = createMutation.isPending || updateMutation.isPending

  const [guarantorId, setGuarantorId] = useState<number | null>(null)
  const [referenceNo, setReferenceNo] = useState("")
  const [guaranteedOn, setGuaranteedOn] = useState(getTodayString())
  const [remarks, setRemarks] = useState("")
  const [lines, setLines] = useState<FormLineItem[]>([
    { localId: "line-1", sourceId: null, amount: "", othersSpecify: "" },
  ])

  const [serverErrors, setServerErrors] = useState<Record<string, string[]>>({})
  const [generalError, setGeneralError] = useState<string | null>(null)

  // Populate form when editing or opening
  useEffect(() => {
    if (!open) {
      setServerErrors({})
      setGeneralError(null)
      return
    }

    if (guarantee) {
      setGuarantorId(guarantee.guarantor?.id ?? null)
      setReferenceNo(guarantee.referenceNo ?? "")
      setGuaranteedOn(guarantee.guaranteedOn ?? getTodayString())
      setRemarks(guarantee.remarks ?? "")
      if (guarantee.items.length > 0) {
        setLines(
          guarantee.items.map((item, idx) => ({
            id: item.id,
            localId: `existing-${item.id ?? idx}`,
            sourceId: item.sourceId,
            amount: item.amount > 0 ? String(item.amount) : "",
            othersSpecify: item.othersSpecify ?? "",
          }))
        )
      } else {
        setLines([
          { localId: "line-1", sourceId: null, amount: "", othersSpecify: "" },
        ])
      }
    } else {
      setGuarantorId(null)
      setReferenceNo("")
      setGuaranteedOn(getTodayString())
      setRemarks("")
      setLines([
        { localId: "line-1", sourceId: null, amount: "", othersSpecify: "" },
      ])
    }
    setServerErrors({})
    setGeneralError(null)
  }, [open, guarantee])

  // Live computed total
  const computedTotal = useMemo(() => {
    return lines.reduce((sum, line) => {
      const val = parseFloat(line.amount)
      return sum + (isNaN(val) || val < 0 ? 0 : val)
    }, 0)
  }, [lines])

  // Sources map for quick lookup of requiresSpecify
  const sourcesMap = useMemo(() => {
    return new Map(assistanceSources.map((s) => [s.id, s]))
  }, [assistanceSources])

  // Selected source IDs across all lines
  const selectedSourceIds = useMemo(() => {
    return new Set(
      lines
        .map((l) => l.sourceId)
        .filter((id): id is number => id !== null && id > 0)
    )
  }, [lines])

  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      {
        localId: `line-${Date.now()}-${prev.length + 1}`,
        sourceId: null,
        amount: "",
        othersSpecify: "",
      },
    ])
  }

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 1) return
    setLines((prev) => prev.filter((_, i) => i !== index))
  }

  const handleLineChange = (index: number, patch: Partial<FormLineItem>) => {
    setLines((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], ...patch }
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerErrors({})
    setGeneralError(null)

    if (!guarantorId) {
      setGeneralError("Please select a Guarantor.")
      return
    }

    if (!guaranteedOn) {
      setGeneralError("Please specify the Date Guaranteed.")
      return
    }

    const payloadItems: SaveGuaranteeItemInput[] = []
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (!line.sourceId) {
        setGeneralError(`Line ${i + 1}: Please select an Assistance Source.`)
        return
      }
      const amt = parseFloat(line.amount)
      if (isNaN(amt) || amt <= 0) {
        setGeneralError(
          `Line ${i + 1}: Please enter a valid amount greater than 0.`
        )
        return
      }
      const sourceDef = sourcesMap.get(line.sourceId)
      if (sourceDef?.requiresSpecify && !line.othersSpecify.trim()) {
        setGeneralError(
          `Line ${i + 1}: Please specify the details for ${sourceDef.name}.`
        )
        return
      }
      payloadItems.push({
        sourceId: line.sourceId,
        amount: amt,
        othersSpecify: sourceDef?.requiresSpecify
          ? line.othersSpecify.trim()
          : null,
      })
    }

    if (payloadItems.length === 0) {
      setGeneralError("Please add at least one breakdown line.")
      return
    }

    const input: SaveGuaranteeInput = {
      guarantorId,
      ...(isEditing ? {} : { hisTransactionId: Number(transactionId) }),
      referenceNo: referenceNo.trim() || null,
      guaranteedOn,
      remarks: remarks.trim() || null,
      items: payloadItems,
    }

    try {
      if (isEditing && guarantee?.id) {
        await updateMutation.mutateAsync({ id: guarantee.id, input })
      } else {
        await createMutation.mutateAsync(input)
      }
      onOpenChange(false)
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.errors) {
          setServerErrors(err.errors)
        }
        setGeneralError(err.firstValidationMessage ?? err.message)
      } else {
        setGeneralError(
          "An unexpected error occurred while saving the guarantee."
        )
      }
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-primary sm:text-xl">
              <CreditCard className="size-5 shrink-0 text-primary" />
              {isEditing ? "Edit Patient Guarantor" : "Add Patient Guarantor"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground sm:text-sm">
              Record hospital encounter financial coverage and assistance source
              breakdowns.
            </DialogDescription>
          </DialogHeader>

          {generalError && (
            <Alert variant="destructive" className="py-2.5">
              <AlertCircle className="size-4" />
              <AlertDescription className="text-xs font-medium sm:text-sm">
                {generalError}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            {/* Header Card */}
            <Card className="border bg-card/60 shadow-2xs">
              <CardHeader className="border-b bg-muted/20 px-4 pt-3.5 pb-3">
                <CardTitle className="flex items-center gap-2 text-xs font-bold tracking-wider text-muted-foreground uppercase sm:text-sm">
                  <Receipt className="size-4 shrink-0 text-primary" />
                  Guarantor Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3.5 p-4">
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  {/* Guarantor Select */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor={`${prefix}-guarantor`}
                      className="text-xs font-bold"
                    >
                      Guarantor <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={guarantorId ? String(guarantorId) : ""}
                      onValueChange={(val) => setGuarantorId(Number(val))}
                      disabled={loadingGuarantors || isPending}
                    >
                      <SelectTrigger
                        id={`${prefix}-guarantor`}
                        className="h-9 text-sm font-medium"
                      >
                        <SelectValue
                          placeholder={
                            loadingGuarantors
                              ? "Loading..."
                              : "Select guarantor"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {guarantorOptions.map((opt) => (
                          <SelectItem key={opt.id} value={String(opt.id)}>
                            {opt.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {serverErrors.guarantor_id && (
                      <p className="text-xs font-semibold text-destructive">
                        {serverErrors.guarantor_id[0]}
                      </p>
                    )}
                  </div>

                  {/* Date Guaranteed */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor={`${prefix}-date`}
                      className="text-xs font-bold"
                    >
                      Date Guaranteed{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id={`${prefix}-date`}
                      type="date"
                      value={guaranteedOn}
                      onChange={(e) => setGuaranteedOn(e.target.value)}
                      className="h-9 text-sm"
                      disabled={isPending}
                      required
                    />
                    {serverErrors.guaranteed_on && (
                      <p className="text-xs font-semibold text-destructive">
                        {serverErrors.guaranteed_on[0]}
                      </p>
                    )}
                  </div>
                </div>

                {/* Reference No & Remarks */}
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor={`${prefix}-ref`}
                      className="text-xs font-bold"
                    >
                      Reference / GL No.{" "}
                      <span className="font-normal text-muted-foreground">
                        (Optional)
                      </span>
                    </Label>
                    <Input
                      id={`${prefix}-ref`}
                      placeholder="e.g. GL-2026-00123"
                      value={referenceNo}
                      onChange={(e) => setReferenceNo(e.target.value)}
                      className="h-9 text-sm"
                      disabled={isPending}
                    />
                    {serverErrors.reference_no && (
                      <p className="text-xs font-semibold text-destructive">
                        {serverErrors.reference_no[0]}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor={`${prefix}-remarks`}
                      className="text-xs font-bold"
                    >
                      Remarks{" "}
                      <span className="font-normal text-muted-foreground">
                        (Optional)
                      </span>
                    </Label>
                    <Input
                      id={`${prefix}-remarks`}
                      placeholder="e.g. Approved via special fund"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="h-9 text-sm"
                      disabled={isPending}
                    />
                    {serverErrors.remarks && (
                      <p className="text-xs font-semibold text-destructive">
                        {serverErrors.remarks[0]}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Breakdown Lines Card */}
            <Card className="border bg-card/60 shadow-2xs">
              <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20 px-4 pt-3.5 pb-2.5">
                <CardTitle className="text-xs font-bold tracking-wider text-muted-foreground uppercase sm:text-sm">
                  Assistance Sources & Breakdown
                </CardTitle>
                <div className="flex items-center gap-2">
                  {canManageSources && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsManageTypesOpen(true)}
                      disabled={isPending}
                      className="h-7 cursor-pointer gap-1 px-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
                      title="Manage Breakdown Types"
                    >
                      <SlidersHorizontal className="size-3.5 text-primary" />
                      Manage Types
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddLine}
                    disabled={
                      isPending ||
                      loadingSources ||
                      lines.length >= assistanceSources.length
                    }
                    className="h-7 cursor-pointer gap-1 px-2 text-xs font-semibold"
                  >
                    <Plus className="size-3.5" />
                    Add Line
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 p-4">
                {lines.map((line, idx) => {
                  const selectedSource = line.sourceId
                    ? sourcesMap.get(line.sourceId)
                    : null
                  const needsSpecify = Boolean(selectedSource?.requiresSpecify)

                  return (
                    <div
                      key={line.localId}
                      className="space-y-2.5 rounded-lg border bg-muted/10 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-muted-foreground">
                          Line #{idx + 1}
                        </span>
                        {lines.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveLine(idx)}
                            disabled={isPending}
                            className="size-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 items-start gap-2.5 sm:grid-cols-12">
                        {/* Assistance Source select */}
                        <div
                          className={
                            needsSpecify
                              ? "space-y-1 sm:col-span-5"
                              : "space-y-1 sm:col-span-7"
                          }
                        >
                          <Label className="text-[11px] font-semibold text-muted-foreground">
                            Assistance Source{" "}
                            <span className="text-destructive">*</span>
                          </Label>
                          <Select
                            value={line.sourceId ? String(line.sourceId) : ""}
                            onValueChange={(val) => {
                              const newSourceId = Number(val)
                              handleLineChange(idx, {
                                sourceId: newSourceId,
                                othersSpecify: "",
                              })
                            }}
                            disabled={loadingSources || isPending}
                          >
                            <SelectTrigger className="h-9 text-xs font-medium">
                              <SelectValue placeholder="Select source" />
                            </SelectTrigger>
                            <SelectContent>
                              {assistanceSources.map((source) => {
                                const isTaken =
                                  selectedSourceIds.has(source.id) &&
                                  line.sourceId !== source.id
                                return (
                                  <SelectItem
                                    key={source.id}
                                    value={String(source.id)}
                                    disabled={isTaken}
                                    className="text-xs"
                                  >
                                    {source.name} {isTaken ? "(Selected)" : ""}
                                  </SelectItem>
                                )
                              })}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Optional Specify input */}
                        {needsSpecify && (
                          <div className="space-y-1 sm:col-span-3">
                            <Label className="text-[11px] font-semibold text-muted-foreground">
                              Specify{" "}
                              <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              placeholder="Specify source..."
                              value={line.othersSpecify}
                              onChange={(e) =>
                                handleLineChange(idx, {
                                  othersSpecify: e.target.value,
                                })
                              }
                              className="h-9 text-xs"
                              disabled={isPending}
                              required
                            />
                          </div>
                        )}

                        {/* Amount input */}
                        <div
                          className={
                            needsSpecify
                              ? "space-y-1 sm:col-span-4"
                              : "space-y-1 sm:col-span-5"
                          }
                        >
                          <Label className="text-[11px] font-semibold text-muted-foreground">
                            Amount (₱){" "}
                            <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="0.00"
                            value={line.amount}
                            onChange={(e) =>
                              handleLineChange(idx, { amount: e.target.value })
                            }
                            className="h-9 text-right text-xs font-semibold"
                            disabled={isPending}
                            required
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Total Calculation in Footer */}
                <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                  <span className="text-xs font-bold tracking-wider text-emerald-800 uppercase dark:text-emerald-300">
                    Computed Total
                  </span>
                  <span className="text-base font-black text-emerald-600 sm:text-lg dark:text-emerald-400">
                    {formatCurrency(computedTotal)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <DialogFooter className="gap-2 pt-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
                className="text-xs font-semibold sm:text-sm"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="min-w-[100px] text-xs font-bold sm:text-sm"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-1.5 size-4 animate-spin" />
                    Saving...
                  </>
                ) : isEditing ? (
                  "Save Changes"
                ) : (
                  "Save Guarantor"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AssistanceSourcesManagerDialog
        open={isManageTypesOpen}
        onOpenChange={setIsManageTypesOpen}
      />
    </>
  )
}
