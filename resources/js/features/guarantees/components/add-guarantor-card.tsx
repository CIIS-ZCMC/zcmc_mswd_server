import React, { useMemo, useState } from "react"
import { AlertCircle, ChevronsRight, Landmark, Loader2, Plus } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { formatCurrency } from "@/lib/format-currency"
import { ApiError } from "@/lib/api-client"
import {
  useAssistanceTypeOptions,
  useFundSourceOptions,
  useModeOfAssistanceOptions,
} from "@/features/library/hooks/use-lookup-options"
import { useGuarantorOptions } from "../hooks/use-guarantor-options"
import { useCreateGuarantee } from "../hooks/use-guarantees"
import type { PatientGuarantee, SaveGuaranteeInput, SaveGuaranteeItemInput } from "../types"

export interface AddGuarantorCardProps {
  patientId: number | string
  transactionId: number | string
  onCancel: () => void
  onSuccess: (guarantee?: PatientGuarantee) => void
  className?: string
}

interface BreakdownLine {
  id: string
  assistanceTypeId: number | null
  modeOfAssistanceId: number | null
  amount: string
  phic: string
  phicPf: string
  soaAuto: string
  hospitalShare: string
  patientShare: string
}

function createEmptyLine(index: number): BreakdownLine {
  return {
    id: `line-${Date.now()}-${index}`,
    assistanceTypeId: null,
    modeOfAssistanceId: null,
    amount: "",
    phic: "0.00",
    phicPf: "0.00",
    soaAuto: "8,000.00",
    hospitalShare: "0.00",
    patientShare: "0.00",
  }
}

export const AddGuarantorCard: React.FC<AddGuarantorCardProps> = ({
  patientId,
  transactionId,
  onCancel,
  onSuccess,
  className = "",
}) => {
  const { data: guarantorOptions = [], isLoading: loadingGuarantors } =
    useGuarantorOptions(true, transactionId)
  const { data: typeOptions = [] } = useAssistanceTypeOptions(false)
  const { data: modeOptions = [] } = useModeOfAssistanceOptions(false)
  const { data: fundOptions = [] } = useFundSourceOptions(false)

  const createMutation = useCreateGuarantee(patientId, transactionId)
  const isPending = createMutation.isPending

  const [guarantorId, setGuarantorId] = useState<number | null>(null)
  const [dateGuaranteed, setDateGuaranteed] = useState<string>(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  })
  const [referenceNo, setReferenceNo] = useState("")
  const [remarks, setRemarks] = useState("")
  const [lines, setLines] = useState<BreakdownLine[]>([createEmptyLine(1)])
  const [error, setError] = useState<string | null>(null)

  const selectedGuarantor = useMemo(() => {
    return guarantorOptions.find((opt) => opt.id === guarantorId) ?? null
  }, [guarantorOptions, guarantorId])

  const handleAddLine = () => {
    setLines((prev) => [...prev, createEmptyLine(prev.length + 1)])
  }

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 1) return
    setLines((prev) => prev.filter((_, i) => i !== index))
  }

  const handleLineChange = (index: number, patch: Partial<BreakdownLine>) => {
    setLines((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], ...patch }
      return next
    })
  }

  const totalComputedAmount = useMemo(() => {
    return lines.reduce((sum, line) => {
      const raw = line.amount.replace(/,/g, "").trim()
      const val = parseFloat(raw)
      return sum + (isNaN(val) || val < 0 ? 0 : val)
    }, 0)
  }, [lines])

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setError(null)

    if (!guarantorId) {
      setError("Please select a Guarantor.")
      return
    }

    const defaultFundId = fundOptions[0]?.id ?? 1
    const payloadItems: SaveGuaranteeItemInput[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (!line.assistanceTypeId) {
        setError(`Line ${i + 1}: Please select a Type of Assistance.`)
        return
      }
      const rawAmt = line.amount.replace(/,/g, "").trim()
      const amt = parseFloat(rawAmt)
      if (isNaN(amt) || amt <= 0) {
        setError(`Line ${i + 1}: Please enter a valid Guaranteed amount greater than 0.`)
        return
      }
      if (!line.modeOfAssistanceId) {
        setError(`Line ${i + 1}: Please select a Mode of Assistance.`)
        return
      }

      payloadItems.push({
        assistanceTypeId: line.assistanceTypeId,
        amount: amt,
        modeOfAssistanceId: line.modeOfAssistanceId,
        fundSourceId: defaultFundId,
        othersSpecify: null,
      })
    }

    if (payloadItems.length === 0) {
      setError("Please add at least one assistance line.")
      return
    }

    const input: SaveGuaranteeInput = {
      guarantorId,
      hisTransactionId: Number(transactionId),
      referenceNo: referenceNo.trim() || null,
      guaranteedOn: dateGuaranteed || new Date().toISOString().split("T")[0],
      remarks: remarks.trim() || null,
      items: payloadItems,
    }

    try {
      const result = await createMutation.mutateAsync(input)
      onSuccess(result)
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.firstValidationMessage ?? err.message)
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("An unexpected error occurred while saving the guarantor.")
      }
    }
  }

  return (
    <div
      data-node-id="312:12018"
      data-name="Property 1=div"
      className={`flex w-full flex-col gap-[12px] rounded-[16px] border border-[#1f5fd6] bg-[#edf3fe] p-[17px] font-[Plus_Jakarta_Sans,sans-serif] dark:border-primary dark:bg-primary/10 ${className}`}
    >
      {/* Header */}
      <div
        data-node-id="312:11928"
        data-name="div"
        className="flex w-full items-center gap-[8px]"
      >
        <div
          data-node-id="312:11929"
          data-name="span"
          className="flex size-[18px] shrink-0 items-center justify-center text-[#0c2a5b] dark:text-foreground"
        >
          <Landmark className="size-[18px]" />
        </div>
        <div
          data-node-id="312:11932"
          className="text-[13px] font-bold leading-normal text-[#0c2a5b] dark:text-foreground"
        >
          Add Guarantor
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="py-2.5">
          <AlertCircle className="size-4" />
          <AlertDescription className="text-xs font-medium">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Row 1: Guarantor & Date Guaranteed */}
      <div
        data-node-id="312:11933"
        data-name="div"
        className="flex w-full gap-[10px]"
      >
        {/* Guarantor Select */}
        <div
          data-node-id="312:11934"
          data-name="label"
          className="flex min-w-0 flex-1 flex-col gap-[5px]"
        >
          <span
            data-node-id="312:11936"
            className="text-[12px] font-semibold leading-normal text-[#5b6678] dark:text-muted-foreground"
          >
            Guarantor
          </span>
          <Select
            value={guarantorId ? String(guarantorId) : ""}
            onValueChange={(val) => setGuarantorId(Number(val))}
            disabled={loadingGuarantors || isPending}
          >
            <SelectTrigger
              data-node-id="312:11937"
              className="h-[40px] w-full rounded-[10px] border border-[#c6e8ee] bg-white px-[12px] py-[11px] text-[13px] font-medium text-[#1b2433] shadow-none focus:border-[#1f5fd6] focus:ring-0 dark:border-border dark:bg-card dark:text-foreground"
            >
              <SelectValue
                placeholder={loadingGuarantors ? "Loading..." : "Select guarantor"}
              >
                {selectedGuarantor?.name ?? "Select guarantor"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-[260px]">
              {guarantorOptions.map((opt) => (
                <SelectItem
                  key={opt.id}
                  value={String(opt.id)}
                  className="text-[13px]"
                >
                  <div className="flex w-full items-center justify-between gap-3">
                    <span className="font-medium">{opt.name}</span>
                    {opt.hisAmount !== null && opt.hisAmount !== undefined && (
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(opt.hisAmount)}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Guaranteed */}
        <div
          data-node-id="312:11940"
          data-name="label"
          className="flex min-w-0 flex-1 flex-col gap-[5px]"
        >
          <span
            data-node-id="312:11942"
            className="text-[12px] font-semibold leading-normal text-[#5b6678] dark:text-muted-foreground"
          >
            Date Guaranteed
          </span>
          <input
            type="date"
            value={dateGuaranteed}
            onChange={(e) => setDateGuaranteed(e.target.value)}
            disabled={isPending}
            data-node-id="312:11943"
            className="h-[40px] w-full rounded-[10px] border border-[#c6e8ee] bg-white px-[12px] py-[11px] text-[13px] font-medium text-[#1b2433] outline-none transition-colors focus:border-[#1f5fd6] dark:border-border dark:bg-card dark:text-foreground"
          />
        </div>
      </div>

      {/* Row 2: Reference / GL no. & Remarks */}
      <div
        data-node-id="312:11946"
        data-name="div"
        className="flex w-full gap-[10px]"
      >
        {/* Reference / GL no. */}
        <div
          data-node-id="312:11947"
          data-name="label"
          className="flex min-w-0 flex-1 flex-col gap-[5px]"
        >
          <span
            data-node-id="312:11949"
            className="text-[12px] font-semibold leading-normal text-[#5b6678] dark:text-muted-foreground"
          >
            Reference / GL no. (optional)
          </span>
          <input
            type="text"
            value={referenceNo}
            onChange={(e) => setReferenceNo(e.target.value)}
            disabled={isPending}
            placeholder="e.g. 004253"
            data-node-id="312:11950"
            className="h-[40px] w-full rounded-[10px] border border-[#c6e8ee] bg-white px-[12px] py-[11px] text-[13px] font-medium text-[#1b2433] placeholder:text-[#8a8a8a] outline-none transition-colors focus:border-[#1f5fd6] dark:border-border dark:bg-card dark:text-foreground dark:placeholder:text-muted-foreground"
          />
        </div>

        {/* Remarks */}
        <div
          data-node-id="312:11953"
          data-name="label"
          className="flex min-w-0 flex-1 flex-col gap-[5px]"
        >
          <span
            data-node-id="312:11955"
            className="text-[12px] font-semibold leading-normal text-[#5b6678] dark:text-muted-foreground"
          >
            Remarks (optional)
          </span>
          <input
            type="text"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            disabled={isPending}
            placeholder="e.g. Approved via special fund"
            data-node-id="312:11956"
            className="h-[40px] w-full rounded-[10px] border border-[#c6e8ee] bg-white px-[12px] py-[11px] text-[13px] font-medium text-[#1b2433] placeholder:text-[#8a8a8a] outline-none transition-colors focus:border-[#1f5fd6] dark:border-border dark:bg-card dark:text-foreground dark:placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Section Title */}
      <div
        data-node-id="312:11959"
        className="flex w-full flex-col items-start pt-[2px]"
      >
        <span
          data-node-id="312:11960"
          className="text-[12px] font-bold leading-normal text-[#0c2a5b] dark:text-foreground"
        >
          Assistance Breakdown
        </span>
      </div>

      {/* Assistance Breakdown Lines */}
      {lines.map((line, idx) => (
        <div
          key={line.id}
          data-node-id="312:12275"
          className="flex w-full flex-col gap-[12px] rounded-[12px] border border-[#e4e9f2] bg-white p-[8px] dark:border-border dark:bg-card"
        >
          {/* Row 1: Type of Assistance, Mode of Assistance, Guaranteed */}
          <div
            data-node-id="312:12081"
            className="flex w-full items-start gap-[12px]"
          >
            {/* Type of Assistance */}
            <div
              data-node-id="312:12340"
              data-name="label"
              className="flex min-w-0 flex-1 flex-col gap-[5px]"
            >
              <span
                data-node-id="312:12342"
                className="text-[11px] font-normal leading-[13px] text-[#5b6678] dark:text-muted-foreground"
              >
                Type of Assistance
              </span>
              <Select
                value={line.assistanceTypeId ? String(line.assistanceTypeId) : ""}
                onValueChange={(val) =>
                  handleLineChange(idx, { assistanceTypeId: Number(val) })
                }
                disabled={isPending}
              >
                <SelectTrigger
                  data-node-id="312:12535"
                  className="h-[40px] w-full rounded-[10px] border border-[#c6e8ee] bg-white px-[12px] py-[11px] text-[13px] font-medium text-[#1b2433] shadow-none focus:border-[#1f5fd6] focus:ring-0 dark:border-border dark:bg-card dark:text-foreground"
                >
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="max-h-[220px]">
                  {typeOptions.map((opt) => (
                    <SelectItem
                      key={opt.id}
                      value={String(opt.id)}
                      className="text-[13px]"
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mode of Assistance */}
            <div
              data-node-id="312:12353"
              data-name="label"
              className="flex min-w-0 flex-1 flex-col gap-[5px]"
            >
              <span
                data-node-id="312:12355"
                className="text-[11px] font-normal leading-[13px] text-[#5b6678] dark:text-muted-foreground"
              >
                Mode of Assistance
              </span>
              <Select
                value={
                  line.modeOfAssistanceId ? String(line.modeOfAssistanceId) : ""
                }
                onValueChange={(val) =>
                  handleLineChange(idx, { modeOfAssistanceId: Number(val) })
                }
                disabled={isPending}
              >
                <SelectTrigger
                  data-node-id="312:12542"
                  className="h-[40px] w-full rounded-[10px] border border-[#c6e8ee] bg-white px-[12px] py-[11px] text-[13px] font-medium text-[#1b2433] shadow-none focus:border-[#1f5fd6] focus:ring-0 dark:border-border dark:bg-card dark:text-foreground"
                >
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="max-h-[220px]">
                  {modeOptions.map((opt) => (
                    <SelectItem
                      key={opt.id}
                      value={String(opt.id)}
                      className="text-[13px]"
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Guaranteed Amount */}
            <div
              data-node-id="312:12327"
              data-name="label"
              className="flex min-w-0 flex-1 flex-col gap-[5px]"
            >
              <div className="flex items-center justify-between">
                <span
                  data-node-id="312:12329"
                  className="text-[11px] font-normal leading-[13px] text-[#5b6678] dark:text-muted-foreground"
                >
                  Guaranteed
                </span>
                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveLine(idx)}
                    disabled={isPending}
                    className="cursor-pointer text-[11px] font-semibold text-[#a51d30] hover:text-rose-600 disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                type="text"
                inputMode="decimal"
                value={line.amount}
                onChange={(e) => handleLineChange(idx, { amount: e.target.value })}
                disabled={isPending}
                placeholder="0.00"
                data-node-id="312:12330"
                className="h-[40px] w-full rounded-[10px] border border-[#c6e8ee] bg-white px-[12px] py-[11px] text-[13px] font-medium text-[#1b2433] outline-none transition-colors focus:border-[#1f5fd6] dark:border-border dark:bg-card dark:text-foreground"
              />
            </div>
          </div>

          {/* Row 2: PHIC, PHIC PF, SOA auto, Hospital share, Patient share */}
          <div
            data-node-id="312:12093"
            className="grid w-full grid-cols-5 gap-[10px]"
          >
            {/* PHIC */}
            <div
              data-node-id="312:12100"
              data-name="label"
              className="flex min-w-0 flex-col gap-[5px]"
            >
              <span
                data-node-id="312:12102"
                className="text-[11px] font-normal leading-[13px] text-[#5b6678] dark:text-muted-foreground"
              >
                PHIC
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={line.phic}
                onChange={(e) => handleLineChange(idx, { phic: e.target.value })}
                disabled={isPending}
                placeholder="0.00"
                data-node-id="312:12103"
                className="h-[40px] w-full rounded-[10px] border border-[#c6e8ee] bg-white px-[12px] py-[11px] text-[13px] font-medium text-[#1b2433] outline-none transition-colors focus:border-[#1f5fd6] dark:border-border dark:bg-card dark:text-foreground"
              />
            </div>

            {/* PHIC PF */}
            <div
              data-node-id="312:12106"
              data-name="label"
              className="flex min-w-0 flex-col gap-[5px]"
            >
              <span
                data-node-id="312:12108"
                className="text-[11px] font-normal leading-[13px] text-[#5b6678] dark:text-muted-foreground"
              >
                PHIC PF
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={line.phicPf}
                onChange={(e) => handleLineChange(idx, { phicPf: e.target.value })}
                disabled={isPending}
                placeholder="0.00"
                data-node-id="312:12109"
                className="h-[40px] w-full rounded-[10px] border border-[#c6e8ee] bg-white px-[12px] py-[11px] text-[13px] font-medium text-[#1b2433] outline-none transition-colors focus:border-[#1f5fd6] dark:border-border dark:bg-card dark:text-foreground"
              />
            </div>

            {/* SOA auto (Highlighted amber: bg-[#ffefe0] border-[#e9bd90]) */}
            <div
              data-node-id="312:12113"
              data-name="label"
              className="flex min-w-0 flex-col gap-[5px]"
            >
              <span
                data-node-id="312:12115"
                className="text-[11px] font-normal leading-[13px] text-[#5b6678] dark:text-muted-foreground"
              >
                SOA auto
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={line.soaAuto}
                onChange={(e) => handleLineChange(idx, { soaAuto: e.target.value })}
                disabled={isPending}
                placeholder="8,000.00"
                data-node-id="312:12116"
                className="h-[40px] w-full rounded-[10px] border border-[#e9bd90] bg-[#ffefe0] px-[12px] py-[11px] text-[13px] font-medium text-[#1b2433] outline-none transition-colors focus:border-[#e9bd90] dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-foreground"
              />
            </div>

            {/* Hospital share */}
            <div
              data-node-id="312:12120"
              data-name="label"
              className="flex min-w-0 flex-col gap-[5px]"
            >
              <span
                data-node-id="312:12122"
                className="text-[11px] font-normal leading-[13px] text-[#5b6678] dark:text-muted-foreground"
              >
                Hospital share
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={line.hospitalShare}
                onChange={(e) =>
                  handleLineChange(idx, { hospitalShare: e.target.value })
                }
                disabled={isPending}
                placeholder="0.00"
                data-node-id="312:12123"
                className="h-[40px] w-full rounded-[10px] border border-[#c6e8ee] bg-white px-[12px] py-[11px] text-[13px] font-medium text-[#1b2433] outline-none transition-colors focus:border-[#1f5fd6] dark:border-border dark:bg-card dark:text-foreground"
              />
            </div>

            {/* Patient share */}
            <div
              data-node-id="312:12127"
              data-name="label"
              className="flex min-w-0 flex-col gap-[5px]"
            >
              <span
                data-node-id="312:12129"
                className="text-[11px] font-normal leading-[13px] text-[#5b6678] dark:text-muted-foreground"
              >
                Patient share
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={line.patientShare}
                onChange={(e) =>
                  handleLineChange(idx, { patientShare: e.target.value })
                }
                disabled={isPending}
                placeholder="0.00"
                data-node-id="312:12130"
                className="h-[40px] w-full rounded-[10px] border border-[#c6e8ee] bg-white px-[12px] py-[11px] text-[13px] font-medium text-[#1b2433] outline-none transition-colors focus:border-[#1f5fd6] dark:border-border dark:bg-card dark:text-foreground"
              />
            </div>
          </div>
        </div>
      ))}

      {/* Actions Row: Add Line + Total Computed Amount */}
      <div
        data-node-id="312:11994"
        data-name="div"
        className="flex w-full items-center justify-between pt-[2px]"
      >
        <button
          type="button"
          onClick={handleAddLine}
          disabled={isPending}
          data-node-id="312:11995"
          className="flex h-[34px] cursor-pointer items-center justify-center gap-[4px] rounded-full border border-dashed border-[#cfd7e4] bg-white/70 px-[14px] text-[13px] font-semibold text-[#0c2a5b] transition-colors hover:bg-white active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-border dark:bg-card/70 dark:text-foreground dark:hover:bg-card"
        >
          <Plus className="size-[16px] text-[#0c2a5b] dark:text-foreground" />
          <span>Add line</span>
        </button>

        <div
          data-node-id="312:11996"
          className="flex items-center gap-[8px]"
        >
          <span
            data-node-id="312:11997"
            className="text-[12px] font-semibold tracking-[0px] text-[#146b43] dark:text-emerald-400"
          >
            Total Computed Amount
          </span>
          <span
            data-node-id="312:11999"
            className="min-w-[100px] text-right text-[20px] font-bold leading-none tracking-[0px] text-[#0c2a5b] dark:text-foreground"
          >
            {formatCurrency(totalComputedAmount)}
          </span>
        </div>
      </div>

      {/* Amber Approval Threshold Notice (≥ ₱50,000) */}
      {totalComputedAmount >= 50000 && (
        <div
          data-node-id="312:12000"
          data-name="div"
          className="flex w-full items-center justify-start gap-[8px] rounded-[16px] border border-[#f7dda4] bg-[#faf3e1] px-[21px] py-[10px] text-[#a8822f] dark:border-amber-700/40 dark:bg-amber-950/30 dark:text-amber-300"
        >
          <ChevronsRight className="size-[18px] shrink-0 text-[#a8822f] dark:text-amber-400" />
          <span
            data-node-id="312:12004"
            className="text-[12px] font-semibold leading-normal"
          >
            ₱50,000 and above · goes to the Head, MSWD for approval · signatory:
            Medical Center Chief
          </span>
        </div>
      )}

      {/* Footer Buttons: Cancel + Save */}
      <div
        data-node-id="312:12005"
        data-name="div"
        className="flex w-full items-center justify-end gap-[8px] pt-[2px]"
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          data-node-id="312:12006"
          className="flex h-[36px] cursor-pointer items-center justify-center rounded-full px-[14px] text-[13px] font-semibold text-[#0c2a5b] transition-colors hover:bg-[#cfd7e4]/20 active:scale-[0.98] disabled:opacity-50 dark:text-foreground dark:hover:bg-muted"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          data-node-id="312:12008"
          className="flex h-[36px] cursor-pointer items-center gap-[6px] rounded-full bg-[#1f5fd6] px-[16px] text-[13px] font-semibold text-white shadow-xs transition-colors hover:bg-[#1a53bd] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending && <Loader2 className="size-[14px] animate-spin" />}
          <span data-node-id="312:12009">
            {totalComputedAmount >= 50000
              ? "Save and send for approval"
              : "Save guarantor"}
          </span>
        </button>
      </div>
    </div>
  )
}
