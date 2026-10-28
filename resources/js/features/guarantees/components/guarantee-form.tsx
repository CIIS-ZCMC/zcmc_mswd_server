import React, { useEffect, useId, useMemo, useRef, useState } from "react"
import { Link } from "@inertiajs/react"
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
export interface FormLineItem {
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

function lineOptions(
  options: LookupOption[],
  current: number | null | undefined
): Array<{ value: string; label: string }> {
  return selectableOptions(
    options.map((o) => ({
      value: String(o.id),
      label: o.label,
      isActive: o.isActive,
    })),
    current ? String(current) : null
  )
}

function getTodayString(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export interface GuaranteeFormProps {
  patientId: number | string
  transactionId: number | string
  guarantee?: PatientGuarantee | null
  initialGuarantorId?: number | null
  initialGuarantorName?: string | null
  lockGuarantor?: boolean
  onSuccess?: (guarantee?: PatientGuarantee) => void
  onCancel?: () => void
  onDirtyChange?: (isDirty: boolean) => void
  className?: string
  cancelLabel?: string
  submitLabel?: string
}

export const GuaranteeForm: React.FC<GuaranteeFormProps> = ({
  patientId,
  transactionId,
  guarantee,
  initialGuarantorId,
  initialGuarantorName,
  lockGuarantor = false,
  onSuccess,
  onCancel,
  onDirtyChange,
  className = "",
  cancelLabel = "Cancel",
  submitLabel,
}) => {
  const isEditing = Boolean(guarantee?.id)
  const prefix = useId()
  const canManageLibrary = usePermission("library.manage")

  const { data: guarantorOptions = [], isLoading: loadingGuarantors } =
    useGuarantorOptions(true, transactionId)
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

  const [guarantorId, setGuarantorId] = useState<number | null>(
    guarantee?.guarantor?.id ?? initialGuarantorId ?? null
  )
  const [lines, setLines] = useState<FormLineItem[]>(() => {
    if (guarantee && guarantee.items.length > 0) {
      return guarantee.items.map((item, idx) => ({
        id: item.id,
        localId: `existing-${item.id ?? idx}`,
        assistanceTypeId: item.assistanceTypeId,
        amount: item.amount > 0 ? String(item.amount) : "",
        modeOfAssistanceId: item.modeOfAssistanceId,
        fundSourceId: item.fundSourceId,
        othersSpecify: item.othersSpecify ?? "",
      }))
    }
    return [emptyLine("line-1")]
  })

  const [serverErrors, setServerErrors] = useState<Record<string, string[]>>({})
  const [generalError, setGeneralError] = useState<string | null>(null)

  // Track initial snapshot to detect dirtiness
  const initialSnapshotRef = useRef<string>("")
  const snapshotCurrent = useMemo(() => {
    return JSON.stringify({
      guarantorId,
      lines: lines.map((l) => ({
        assistanceTypeId: l.assistanceTypeId,
        amount: l.amount.trim(),
        modeOfAssistanceId: l.modeOfAssistanceId,
        fundSourceId: l.fundSourceId,
        othersSpecify: l.othersSpecify.trim(),
      })),
    })
  }, [guarantorId, lines])

  // Reset or initialize on guarantee change
  useEffect(() => {
    if (guarantee) {
      const gId = guarantee.guarantor?.id ?? null
      const initLines =
        guarantee.items.length > 0
          ? guarantee.items.map((item, idx) => ({
              id: item.id,
              localId: `existing-${item.id ?? idx}`,
              assistanceTypeId: item.assistanceTypeId,
              amount: item.amount > 0 ? String(item.amount) : "",
              modeOfAssistanceId: item.modeOfAssistanceId,
              fundSourceId: item.fundSourceId,
              othersSpecify: item.othersSpecify ?? "",
            }))
          : [emptyLine("line-1")]

      setGuarantorId(gId)
      setLines(initLines)

      initialSnapshotRef.current = JSON.stringify({
        guarantorId: gId,
        lines: initLines.map((l) => ({
          assistanceTypeId: l.assistanceTypeId,
          amount: l.amount.trim(),
          modeOfAssistanceId: l.modeOfAssistanceId,
          fundSourceId: l.fundSourceId,
          othersSpecify: l.othersSpecify.trim(),
        })),
      })
    } else {
      const gId = initialGuarantorId ?? null
      setGuarantorId(gId)
      const initLines = [emptyLine("line-1")]
      setLines(initLines)

      initialSnapshotRef.current = JSON.stringify({
        guarantorId: gId,
        lines: initLines.map((l) => ({
          assistanceTypeId: l.assistanceTypeId,
          amount: l.amount.trim(),
          modeOfAssistanceId: l.modeOfAssistanceId,
          fundSourceId: l.fundSourceId,
          othersSpecify: l.othersSpecify.trim(),
        })),
      })
    }
    setServerErrors({})
    setGeneralError(null)
  }, [guarantee, initialGuarantorId])

  // Pre-select a guarantor by name (e.g. from HIS ledger row) once options arrive
  useEffect(() => {
    if (guarantee || !initialGuarantorName || guarantorId !== null) {
      return
    }
    const wanted = initialGuarantorName.trim().toLowerCase()
    const found = guarantorOptions.find(
      (opt) => opt.name.trim().toLowerCase() === wanted
    )
    if (found) {
      setGuarantorId(found.id)
    }
  }, [guarantee, initialGuarantorName, guarantorId, guarantorOptions])

  // Compute dirtiness and notify caller
  const isDirty = useMemo(() => {
    if (!initialSnapshotRef.current) return false
    return snapshotCurrent !== initialSnapshotRef.current
  }, [snapshotCurrent])

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  // Live computed total
  const computedTotal = useMemo(() => {
    return lines.reduce((sum, line) => {
      const val = parseFloat(line.amount)
      return sum + (isNaN(val) || val < 0 ? 0 : val)
    }, 0)
  }, [lines])

  const selectedGuarantor = useMemo(() => {
    return guarantorOptions.find((opt) => opt.id === guarantorId) ?? null
  }, [guarantorOptions, guarantorId])

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
      referenceNo: guarantee?.referenceNo ?? null,
      guaranteedOn: guarantee?.guaranteedOn ?? getTodayString(),
      remarks: guarantee?.remarks ?? null,
      items: payloadItems,
    }

    try {
      let result: PatientGuarantee | undefined
      if (isEditing && guarantee?.id) {
        result = await updateMutation.mutateAsync({ id: guarantee.id, input })
      } else {
        result = await createMutation.mutateAsync(input)
      }
      // Re-align snapshot so it's not marked dirty on unmount
      initialSnapshotRef.current = snapshotCurrent
      onSuccess?.(result)
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
    <div className={`space-y-4 ${className}`}>
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
          <CardContent className="p-4">
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
                      {(value: string | null) => {
                        if (!value) {
                          return loadingGuarantors
                            ? "Loading..."
                            : "Select guarantor"
                        }
                        const opt = guarantorOptions.find(
                          (o) => String(o.id) === value
                        )
                        if (opt) {
                          const amt =
                            opt.hisAmount !== null &&
                            opt.hisAmount !== undefined
                              ? ` — ${formatCurrency(opt.hisAmount)}`
                              : ""
                          return `${opt.name}${amt}`
                        }
                        return (
                          guarantee?.guarantor?.name ?? "Select guarantor"
                        )
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {guarantorOptions.map((opt) => (
                      <SelectItem
                        key={opt.id}
                        value={String(opt.id)}
                        className="text-sm"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <span className="font-medium">{opt.name}</span>
                          {opt.hisAmount !== null &&
                            opt.hisAmount !== undefined && (
                              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(opt.hisAmount)}
                              </span>
                            )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {serverErrors.guarantor_id && (
                  <p className="text-xs font-semibold text-destructive">
                    {serverErrors.guarantor_id[0]}
                  </p>
                )}
                {/* Ledger Context Info */}
                {selectedGuarantor?.hisAmount !== null &&
                  selectedGuarantor?.hisAmount !== undefined && (
                    <div className="flex items-center justify-between rounded border border-muted bg-muted/40 px-2 py-1 text-[11px]">
                      <span className="text-muted-foreground">
                        HIS Billing Guarantee:
                      </span>
                      <div className="flex items-center gap-1.5 font-bold">
                        <span>
                          {formatCurrency(selectedGuarantor.hisAmount)}
                        </span>
                        {selectedGuarantor.glPosted && (
                          <span className="rounded bg-emerald-500/10 px-1 py-0.5 text-[10px] text-emerald-600 dark:text-emerald-400">
                            Posted
                          </span>
                        )}
                        <span className="text-[10px] font-normal text-primary">
                          • TARGET AMOUNT
                        </span>
                      </div>
                    </div>
                  )}
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
                  loadingTypes ||
                  (activeTypeCount > 0 &&
                    selectedTypeIds.size >= activeTypeCount)
                }
                title={
                  activeTypeCount > 0 &&
                  selectedTypeIds.size >= activeTypeCount
                    ? "All available types of assistance are already used."
                    : undefined
                }
                className="h-7 gap-1 px-2 text-xs font-bold"
              >
                <Plus className="size-3.5" />
                Add Line
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            {lines.map((line, idx) => {
              const fieldError = (field: string) => {
                const key = `items.${idx}.${field}`
                return serverErrors[key]?.[0]
              }
              const needsSpecify = fundNeedsSpecify(line.fundSourceId)

              return (
                <div
                  key={line.localId}
                  className="relative rounded-lg border bg-muted/10 p-3 transition-colors hover:bg-muted/20"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground">
                      Line #{idx + 1}
                    </span>
                    {lines.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveLine(idx)}
                        disabled={isPending}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        title="Remove line"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>

                  {/* 4-column breakdown grid */}
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-12">
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
                            const optId = Number(opt.value)
                            const isTakenByAnotherLine =
                              selectedTypeIds.has(optId) &&
                              optId !== line.assistanceTypeId
                            return (
                              <SelectItem
                                key={opt.value}
                                value={opt.value}
                                disabled={isTakenByAnotherLine}
                                className="text-xs"
                              >
                                {opt.label}
                                {isTakenByAnotherLine ? " (already chosen)" : ""}
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                      {fieldError("assistance_type_id") && (
                        <p className="text-[11px] font-semibold text-destructive">
                          {fieldError("assistance_type_id")}
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
              <div className="space-y-0.5">
                <span className="text-xs font-bold tracking-wider text-emerald-800 uppercase dark:text-emerald-300">
                  Computed Total
                </span>
                {selectedGuarantor?.hisAmount !== null &&
                  selectedGuarantor?.hisAmount !== undefined && (
                    <div className="text-[11px] font-medium text-emerald-800/90 dark:text-emerald-300/90">
                      {Math.abs(computedTotal - selectedGuarantor.hisAmount) < 0.009 ? (
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          ✓ Matches HIS guarantee ({formatCurrency(selectedGuarantor.hisAmount)})
                        </span>
                      ) : computedTotal < selectedGuarantor.hisAmount ? (
                        <span>
                          Remaining to breakdown:{" "}
                          <strong className="font-bold">
                            {formatCurrency(selectedGuarantor.hisAmount - computedTotal)}
                          </strong>{" "}
                          (Target: {formatCurrency(selectedGuarantor.hisAmount)})
                        </span>
                      ) : (
                        <span className="font-semibold text-amber-600 dark:text-amber-400">
                          Exceeds HIS guarantee by{" "}
                          <strong>
                            {formatCurrency(computedTotal - selectedGuarantor.hisAmount)}
                          </strong>
                        </span>
                      )}
                    </div>
                  )}
              </div>
              <span className="text-base font-black text-emerald-600 sm:text-lg dark:text-emerald-400">
                {formatCurrency(computedTotal)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse items-center justify-end gap-2 pt-2 sm:flex-row sm:gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isPending}
              className="w-full text-xs font-semibold sm:w-auto sm:text-sm"
            >
              {cancelLabel}
            </Button>
          )}
          <Button
            type="submit"
            disabled={isPending}
            className="w-full min-w-[100px] text-xs font-bold sm:w-auto sm:text-sm"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-1.5 size-4 animate-spin" />
                Saving...
              </>
            ) : submitLabel ? (
              submitLabel
            ) : isEditing ? (
              "Save Changes"
            ) : (
              "Save Guarantor"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
