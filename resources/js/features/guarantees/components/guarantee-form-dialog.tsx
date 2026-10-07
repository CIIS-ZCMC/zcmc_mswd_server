import React, { useEffect, useId, useMemo, useState } from "react"
import { Link } from "@inertiajs/react"
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
import { selectableOptions } from "@/features/cases/lib/assessment-constants"
import {
  useAssistanceTypeOptions,
  useFundSourceOptions,
  useModeOfAssistanceOptions,
} from "@/features/library/hooks/use-lookup-options"
import type { LookupOption } from "@/features/library/types"
import { useGuarantorOptions } from "../hooks/use-guarantor-options"
import { useCreateGuarantee, useUpdateGuarantee } from "../hooks/use-guarantees"
import type {
  PatientGuarantee,
  SaveGuaranteeInput,
  SaveGuaranteeItemInput,
} from "../types"

/** A breakdown line, in entry order: Type of Assistance, Amount, Mode, Fund Source. */
interface FormLineItem {
  id?: number
  localId: string
  assistanceTypeId: number | null
  amount: string
  modeOfAssistanceId: number | null
  fundSourceId: number | null
  othersSpecify: string
}

function emptyLine(localId: string): FormLineItem {
  return {
    localId,
    assistanceTypeId: null,
    amount: "",
    modeOfAssistanceId: null,
    fundSourceId: null,
    othersSpecify: "",
  }
}

/**
 * Select options keyed by id: the active ones, plus the line's current value when it
 * has since been retired (shown as "(inactive)").
 */
function lineOptions(
  options: LookupOption[],
  current: number | null
): Array<{ value: string; label: string }> {
  return selectableOptions(
    options
      .filter((o) => o.id !== undefined)
      .map((o) => ({
        value: String(o.id),
        label: o.label,
        isActive: o.isActive,
      })),
    current ? String(current) : null
  )
}

interface GuaranteeFormDialogProps {
  patientId: number | string
  transactionId: number | string
  guarantee?: PatientGuarantee | null
  initialGuarantorId?: number | null
  initialGuarantorName?: string | null
  lockGuarantor?: boolean
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
  initialGuarantorId,
  initialGuarantorName,
  lockGuarantor = false,
  open,
  onOpenChange,
}) => {
  const isEditing = Boolean(guarantee?.id)
  const prefix = useId()
  const canManageLibrary = usePermission("library.manage")

  const { data: guarantorOptions = [], isLoading: loadingGuarantors } =
    useGuarantorOptions(true)
  // Inactive options are fetched too, so a line keeps showing a retired choice.
  const { data: typeOptions = [], isLoading: loadingTypes } =
    useAssistanceTypeOptions(false)
  const { data: modeOptions = [], isLoading: loadingModes } =
    useModeOfAssistanceOptions(false)
  const { data: fundOptions = [], isLoading: loadingFunds } =
    useFundSourceOptions(false)
  const loadingOptions = loadingTypes || loadingModes || loadingFunds
  const activeTypeCount = typeOptions.filter((o) => o.isActive !== false).length

  const createMutation = useCreateGuarantee(patientId, transactionId)
  const updateMutation = useUpdateGuarantee(patientId, transactionId)
  const isPending = createMutation.isPending || updateMutation.isPending

  const [guarantorId, setGuarantorId] = useState<number | null>(null)
  const [referenceNo, setReferenceNo] = useState("")
  const [guaranteedOn, setGuaranteedOn] = useState(getTodayString())
  const [remarks, setRemarks] = useState("")
  const [lines, setLines] = useState<FormLineItem[]>([emptyLine("line-1")])

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
        // Older lines have no type or mode yet; they must be chosen before saving.
        setLines(
          guarantee.items.map((item, idx) => ({
            id: item.id,
            localId: `existing-${item.id ?? idx}`,
            assistanceTypeId: item.assistanceTypeId,
            amount: item.amount > 0 ? String(item.amount) : "",
            modeOfAssistanceId: item.modeOfAssistanceId,
            fundSourceId: item.fundSourceId,
            othersSpecify: item.othersSpecify ?? "",
          }))
        )
      } else {
        setLines([emptyLine("line-1")])
      }
    } else {
      setGuarantorId(initialGuarantorId ?? null)
      setReferenceNo("")
      setGuaranteedOn(getTodayString())
      setRemarks("")
      setLines([emptyLine("line-1")])
    }
    setServerErrors({})
    setGeneralError(null)
  }, [open, guarantee, initialGuarantorId])

  // Pre-select a guarantor by name (e.g. a HIS ledger row) once the options have
  // loaded. Kept apart from the reset above so the options arriving never clears
  // what has been typed, and only fills an empty choice.
  useEffect(() => {
    if (!open || guarantee || !initialGuarantorName || guarantorId !== null) {
      return
    }
    const wanted = initialGuarantorName.trim().toLowerCase()
    const found = guarantorOptions.find(
      (opt) => opt.name.trim().toLowerCase() === wanted
    )
    if (found) {
      setGuarantorId(found.id)
    }
  }, [open, guarantee, initialGuarantorName, guarantorId, guarantorOptions])

  // Live computed total
  const computedTotal = useMemo(() => {
    return lines.reduce((sum, line) => {
      const val = parseFloat(line.amount)
      return sum + (isNaN(val) || val < 0 ? 0 : val)
    }, 0)
  }, [lines])

  // Fund sources by id, to know which ones need a Specify value ("Others").
  const fundsById = useMemo(
    () => new Map(fundOptions.map((f) => [f.id, f])),
    [fundOptions]
  )
  const typesById = useMemo(
    () => new Map(typeOptions.map((t) => [t.id, t])),
    [typeOptions]
  )
  const modesById = useMemo(
    () => new Map(modeOptions.map((m) => [m.id, m])),
    [modeOptions]
  )
  // Base UI's Select.Value shows the raw value unless given a formatter.
  const labelOf =
    (byId: Map<number | undefined, LookupOption>, placeholder: string) =>
    (value: string | null) =>
      value ? (byId.get(Number(value))?.label ?? placeholder) : placeholder
  const fundNeedsSpecify = (fundSourceId: number | null) =>
    fundSourceId !== null &&
    Boolean(fundsById.get(fundSourceId)?.requiresSpecify)

  // Types already used on a line: one line per Type of Assistance.
  const selectedTypeIds = useMemo(() => {
    return new Set(
      lines
        .map((l) => l.assistanceTypeId)
        .filter((id): id is number => id !== null && id > 0)
    )
  }, [lines])

  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      emptyLine(`line-${Date.now()}-${prev.length + 1}`),
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

    // Checked in the order the line is entered.
    const payloadItems: SaveGuaranteeItemInput[] = []
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (!line.assistanceTypeId) {
        setGeneralError(`Line ${i + 1}: Please select a Type of Assistance.`)
        return
      }
      const amt = parseFloat(line.amount)
      if (isNaN(amt) || amt <= 0) {
        setGeneralError(
          `Line ${i + 1}: Please enter a valid amount greater than 0.`
        )
        return
      }
      if (!line.modeOfAssistanceId) {
        setGeneralError(`Line ${i + 1}: Please select a Mode of Assistance.`)
        return
      }
      if (!line.fundSourceId) {
        setGeneralError(`Line ${i + 1}: Please select a Fund Source.`)
        return
      }
      const needsSpecify = fundNeedsSpecify(line.fundSourceId)
      if (needsSpecify && !line.othersSpecify.trim()) {
        setGeneralError(
          `Line ${i + 1}: Please specify the ${fundsById.get(line.fundSourceId)?.label ?? "fund source"}.`
        )
        return
      }
      payloadItems.push({
        assistanceTypeId: line.assistanceTypeId,
        amount: amt,
        modeOfAssistanceId: line.modeOfAssistanceId,
        fundSourceId: line.fundSourceId,
        othersSpecify: needsSpecify ? line.othersSpecify.trim() : null,
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
              Record the guarantor for this hospital encounter and break it down
              by type of assistance, mode of assistance and fund source.
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
                      disabled={
                        loadingGuarantors ||
                        isPending ||
                        (lockGuarantor && Boolean(guarantorId))
                      }
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
                        >
                          {(value: string | null) =>
                            value
                              ? (guarantorOptions.find(
                                  (opt) => String(opt.id) === value
                                )?.name ??
                                guarantee?.guarantor?.name ??
                                "Select guarantor")
                              : loadingGuarantors
                                ? "Loading..."
                                : "Select guarantor"
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {guarantee?.guarantor &&
                          !guarantorOptions.some(
                            (opt) => opt.id === guarantee.guarantor?.id
                          ) && (
                            <SelectItem value={String(guarantee.guarantor.id)}>
                              {guarantee.guarantor.name} (inactive)
                            </SelectItem>
                          )}
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
                  Assistance Breakdown
                </CardTitle>
                <div className="flex items-center gap-2">
                  {canManageLibrary && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      render={<Link href="/library" />}
                      className="h-7 gap-1 px-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
                      title="Manage the options in the Library"
                    >
                      <SlidersHorizontal className="size-3.5 text-primary" />
                      Manage in Library
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddLine}
                    disabled={
                      isPending ||
                      loadingOptions ||
                      lines.length >= Math.max(activeTypeCount, 1)
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
                  const needsSpecify = fundNeedsSpecify(line.fundSourceId)
                  const fieldError = (field: string) =>
                    serverErrors[`items.${idx}.${field}`]?.[0]

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
                            aria-label={`Remove line ${idx + 1}`}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>

                      {/* Type of Assistance -> Amount -> Mode of Assistance -> Fund Source */}
                      <div className="grid grid-cols-1 items-start gap-2.5 sm:grid-cols-12">
                        <div className="space-y-1 sm:col-span-4">
                          <Label className="text-[11px] font-semibold text-muted-foreground">
                            Type of Assistance{" "}
                            <span className="text-destructive">*</span>
                          </Label>
                          <Select
                            value={
                              line.assistanceTypeId
                                ? String(line.assistanceTypeId)
                                : ""
                            }
                            onValueChange={(val) =>
                              handleLineChange(idx, {
                                assistanceTypeId: val ? Number(val) : null,
                              })
                            }
                            disabled={loadingOptions || isPending}
                          >
                            <SelectTrigger className="h-9 text-xs font-medium">
                              <SelectValue placeholder="Select type">
                                {labelOf(typesById, "Select type")}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {lineOptions(
                                typeOptions,
                                line.assistanceTypeId
                              ).map((opt) => {
                                const isTaken =
                                  selectedTypeIds.has(Number(opt.value)) &&
                                  line.assistanceTypeId !== Number(opt.value)
                                return (
                                  <SelectItem
                                    key={opt.value}
                                    value={opt.value}
                                    disabled={isTaken}
                                    className="text-xs"
                                  >
                                    {opt.label} {isTaken ? "(Selected)" : ""}
                                  </SelectItem>
                                )
                              })}
                            </SelectContent>
                          </Select>
                          {fieldError("assistant_type_id") && (
                            <p className="text-[11px] font-semibold text-destructive">
                              {fieldError("assistant_type_id")}
                            </p>
                          )}
                        </div>

                        <div className="space-y-1 sm:col-span-2">
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
                          {fieldError("amount") && (
                            <p className="text-[11px] font-semibold text-destructive">
                              {fieldError("amount")}
                            </p>
                          )}
                        </div>

                        <div className="space-y-1 sm:col-span-3">
                          <Label className="text-[11px] font-semibold text-muted-foreground">
                            Mode of Assistance{" "}
                            <span className="text-destructive">*</span>
                          </Label>
                          <Select
                            value={
                              line.modeOfAssistanceId
                                ? String(line.modeOfAssistanceId)
                                : ""
                            }
                            onValueChange={(val) =>
                              handleLineChange(idx, {
                                modeOfAssistanceId: val ? Number(val) : null,
                              })
                            }
                            disabled={loadingOptions || isPending}
                          >
                            <SelectTrigger className="h-9 text-xs font-medium">
                              <SelectValue placeholder="Select mode">
                                {labelOf(modesById, "Select mode")}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {lineOptions(
                                modeOptions,
                                line.modeOfAssistanceId
                              ).map((opt) => (
                                <SelectItem
                                  key={opt.value}
                                  value={opt.value}
                                  className="text-xs"
                                >
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {fieldError("mode_of_assistance_id") && (
                            <p className="text-[11px] font-semibold text-destructive">
                              {fieldError("mode_of_assistance_id")}
                            </p>
                          )}
                        </div>

                        <div className="space-y-1 sm:col-span-3">
                          <Label className="text-[11px] font-semibold text-muted-foreground">
                            Fund Source{" "}
                            <span className="text-destructive">*</span>
                          </Label>
                          <Select
                            value={
                              line.fundSourceId ? String(line.fundSourceId) : ""
                            }
                            onValueChange={(val) =>
                              handleLineChange(idx, {
                                fundSourceId: val ? Number(val) : null,
                                othersSpecify: "",
                              })
                            }
                            disabled={loadingOptions || isPending}
                          >
                            <SelectTrigger className="h-9 text-xs font-medium">
                              <SelectValue placeholder="Select fund">
                                {labelOf(fundsById, "Select fund")}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {lineOptions(fundOptions, line.fundSourceId).map(
                                (opt) => (
                                  <SelectItem
                                    key={opt.value}
                                    value={opt.value}
                                    className="text-xs"
                                  >
                                    {opt.label}
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                          {fieldError("fund_source_id") && (
                            <p className="text-[11px] font-semibold text-destructive">
                              {fieldError("fund_source_id")}
                            </p>
                          )}
                        </div>

                        {needsSpecify && (
                          <div className="space-y-1 sm:col-span-12">
                            <Label className="text-[11px] font-semibold text-muted-foreground">
                              Specify Fund Source{" "}
                              <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              placeholder="e.g. Barangay Captain"
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
                            {fieldError("others_specify") && (
                              <p className="text-[11px] font-semibold text-destructive">
                                {fieldError("others_specify")}
                              </p>
                            )}
                          </div>
                        )}
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
    </>
  )
}
