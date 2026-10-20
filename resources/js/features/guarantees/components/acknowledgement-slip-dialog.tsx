import React, { useEffect, useMemo, useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { ExternalLink, FileCheck2, Info, Printer } from "lucide-react"
import { formatCurrency } from "@/lib/format-currency"
import { useGuarantees } from "../hooks/use-guarantees"
import { useAssistanceTypeOptions } from "@/features/library/hooks/use-lookup-options"
// Direct file imports (not the hospital barrel, which re-exports this feature).
import { useHospitalEncounter } from "@/features/hospital/hooks/use-hospital-encounters"
import type { EncounterGuarantor } from "@/features/hospital/types/hospital-transaction.types"
import { usePermission } from "@/features/auth/hooks/use-permission"
import { useEncounterServiceTimes } from "@/features/queue/hooks/use-queue"
import { ServiceTimesHint } from "@/features/queue/components/service-times-hint"
import {
  type AcknowledgementSlipFund,
  isMaifipGuarantee,
  isMaifipName,
  openAcknowledgementSlip,
  openEncounterAcknowledgementSlip,
  openHisAcknowledgementSlip,
  slipPurpose,
} from "../lib/acknowledgement-slip"
import type { PatientGuarantee } from "../types"

/** Where a slip prints from: an MSWD guarantee, or the HIS guarantor ledger entry. */
type SlipSource =
  | { key: string; kind: "mswd"; guarantee: PatientGuarantee }
  | { key: string; kind: "his"; entry: EncounterGuarantor }

interface AcknowledgementSlipDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientId: number | string
  transactionId: number | string
  /** Preselect a guarantee (from its row); otherwise the encounter's only/first MAIFIP one. */
  guaranteeId?: number | null
}

const sourceLabel = (source: SlipSource) =>
  source.kind === "mswd"
    ? [
        "MSWD record",
        source.guarantee.guaranteedOn,
        source.guarantee.referenceNo,
        formatCurrency(source.guarantee.total),
      ]
        .filter(Boolean)
        .join(" · ")
    : [
        "HIS ledger",
        source.entry.postDate?.slice(0, 10),
        formatCurrency(source.entry.amount ?? 0),
      ]
        .filter(Boolean)
        .join(" · ")

const FUND_LABELS: Record<AcknowledgementSlipFund, string> = {
  doh_maifip: "DOH-MAIFIP",
  opav_socio_civid_fund: "OPAV-SOCIO CIVID FUND",
  others: "OTHERS",
}

/**
 * Print the Acknowledgement Slip (ZCMC-F-MSWD-46) for the encounter.
 * Sources: MSWD guarantee, HIS guarantor ledger entry, or direct encounter print
 * with manual/blank entries. Fund options: DOH-MAIFIP, OPAV-SOCIO CIVID FUND, OTHERS.
 * Time started / ended prefill from the encounter's queue turnaround.
 */
export const AcknowledgementSlipDialog: React.FC<
  AcknowledgementSlipDialogProps
> = ({ open, onOpenChange, patientId, transactionId, guaranteeId }) => {
  const { data, isLoading } = useGuarantees(patientId, transactionId, open)
  const encounterId = Number(transactionId)
  const { data: encounter, isLoading: hisLoading } = useHospitalEncounter(
    encounterId,
    open && encounterId > 0
  )

  const sources = useMemo<SlipSource[]>(
    () => [
      ...(data?.data ?? [])
        .filter(isMaifipGuarantee)
        .map((guarantee): SlipSource => ({
          key: `mswd-${guarantee.id}`,
          kind: "mswd",
          guarantee,
        })),
      ...(encounter?.guarantors ?? [])
        .filter((entry) => isMaifipName(entry.name))
        .map((entry): SlipSource => ({
          key: `his-${entry.id}`,
          kind: "his",
          entry,
        })),
    ],
    [data, encounter]
  )

  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [fund, setFund] = useState<AcknowledgementSlipFund>("doh_maifip")
  const [fundOther, setFundOther] = useState("")
  const [manualAmount, setManualAmount] = useState("")
  const [timeStarted, setTimeStarted] = useState("")
  const [timeEnded, setTimeEnded] = useState("")
  const [remarks, setRemarks] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Type of assistance (Library id)
  const [typeId, setTypeId] = useState<string | null>(null)
  const { data: typeOptions = [] } = useAssistanceTypeOptions(true)
  const canManageQueue = usePermission("queue.manage")
  const service = useEncounterServiceTimes(
    patientId,
    encounterId,
    open && encounterId > 0 && canManageQueue
  )
  const prefilled = useRef(false)

  // Each opening resets to default fund and sets initial guarantee if provided
  useEffect(() => {
    if (!open) return
    prefilled.current = false
    setSelectedKey(guaranteeId ? `mswd-${guaranteeId}` : null)
    setFund("doh_maifip")
    setFundOther("")
    setManualAmount("")
    setTimeStarted("")
    setTimeEnded("")
    setRemarks("")
    setError(null)
    setTypeId(null)
  }, [open, guaranteeId])

  // Once per opening, fill the times from the queue; never over what was typed.
  useEffect(() => {
    if (!open || prefilled.current || !service.visit) return
    prefilled.current = true
    setTimeStarted((current) => current || service.started)
    setTimeEnded((current) => current || service.ended)
  }, [open, service.visit, service.started, service.ended])

  const selected =
    sources.find((source) => source.key === selectedKey) ??
    (sources.length > 0 ? sources[0] : null)

  const typeName = (id: string | null) =>
    (typeOptions.find((o) => String(o.id) === id)?.label ?? "").toUpperCase()

  const openSlip = async (preview: boolean) => {
    setIsGenerating(true)
    setError(null)

    try {
      const options = {
        remarks,
        timeStarted,
        timeEnded,
        preview,
        assistantTypeIds: typeId ? [Number(typeId)] : [],
        fund,
        fundOther: fund === "others" ? fundOther : undefined,
        amount: manualAmount ? Number(manualAmount) : undefined,
      }

      if (selected && selected.kind === "mswd") {
        await openAcknowledgementSlip(selected.guarantee.id, options)
      } else if (selected && selected.kind === "his") {
        await openHisAcknowledgementSlip(
          transactionId,
          selected.entry.id,
          options
        )
      } else {
        await openEncounterAcknowledgementSlip(transactionId, options)
      }

      if (!preview) onOpenChange(false)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "The slip could not be generated."
      )
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader className="space-y-1.5 border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <FileCheck2 className="size-5.5 shrink-0 text-primary" />
            <DialogTitle className="text-xl font-extrabold text-foreground">
              Acknowledgement Slip (ZCMC-F-MSWD-46)
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs font-medium text-muted-foreground sm:text-sm">
            ZCMC-F-MSWD-46 · printed from this encounter&apos;s guarantee or
            manual fund selection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isLoading || hisLoading ? (
            <Skeleton className="h-24 w-full rounded-xl" />
          ) : (
            <>
              {sources.length === 0 ? (
                <Alert className="border-sky-500/30 bg-sky-500/10">
                  <Info className="size-4 shrink-0 text-sky-600 dark:text-sky-400" />
                  <AlertTitle className="text-sm font-bold">
                    No MAIFIP guarantee on this encounter
                  </AlertTitle>
                  <AlertDescription className="mt-0.5 text-sm">
                    You can select a fund and fill optional details below, or
                    proceed to print with blank lines for handwriting.
                  </AlertDescription>
                </Alert>
              ) : (
                sources.length > 1 && (
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="slip-guarantee"
                      className="text-sm font-bold"
                    >
                      Print from
                    </Label>
                    <Select
                      value={selected?.key ?? null}
                      onValueChange={(v) => v && setSelectedKey(v)}
                    >
                      <SelectTrigger
                        id="slip-guarantee"
                        className="h-10 text-sm"
                      >
                        <SelectValue>
                          {(value: string | null) => {
                            const source = sources.find((m) => m.key === value)
                            return source
                              ? sourceLabel(source)
                              : "Select a source"
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {sources.map((source) => (
                          <SelectItem
                            key={source.key}
                            value={source.key}
                            className="text-sm"
                          >
                            {sourceLabel(source)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )
              )}

              {/* Fund Selector Dropdown */}
              <div className="space-y-1.5">
                <Label htmlFor="slip-fund" className="text-sm font-bold">
                  Fund
                </Label>
                <Select
                  value={fund}
                  onValueChange={(v) =>
                    v && setFund(v as AcknowledgementSlipFund)
                  }
                >
                  <SelectTrigger id="slip-fund" className="h-10 w-full text-sm">
                    <SelectValue>
                      {(value: string | null) =>
                        value
                          ? (FUND_LABELS[value as AcknowledgementSlipFund] ??
                            value)
                          : "Select a fund"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      value="doh_maifip"
                      className="text-sm font-medium"
                    >
                      DOH-MAIFIP
                    </SelectItem>
                    <SelectItem
                      value="opav_socio_civid_fund"
                      className="text-sm font-medium"
                    >
                      OPAV-SOCIO CIVID FUND
                    </SelectItem>
                    <SelectItem value="others" className="text-sm font-medium">
                      OTHERS
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {fund === "others" && (
                <div className="space-y-1.5">
                  <Label
                    htmlFor="slip-fund-other"
                    className="text-sm font-bold"
                  >
                    Specify Other Fund (optional)
                  </Label>
                  <Input
                    id="slip-fund-other"
                    placeholder="e.g. PCSO / LGU / DSWD"
                    value={fundOther}
                    onChange={(e) => setFundOther(e.target.value)}
                    className="h-10 text-sm"
                  />
                </div>
              )}

              {selected ? (
                <div className="space-y-2 rounded-xl border bg-muted/30 p-4 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">
                      sa halagang Php
                    </span>
                    <strong className="font-bold text-foreground">
                      {formatCurrency(
                        selected.kind === "mswd"
                          ? selected.guarantee.total
                          : (selected.entry.amount ?? 0)
                      )}
                    </strong>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">para sa</span>
                    <strong className="text-right font-bold text-foreground">
                      {selected.kind === "mswd"
                        ? slipPurpose(selected.guarantee) ||
                          "— (no types on the breakdown)"
                        : typeName(typeId) || "— (pick below, or leave blank)"}
                    </strong>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Source</span>
                    <strong className="text-right font-bold text-foreground">
                      {selected.kind === "mswd"
                        ? "MSWD guarantee record"
                        : selected.entry.glPosted
                          ? "HIS guarantor ledger (GL posted)"
                          : "HIS guarantor ledger"}
                    </strong>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Fund</span>
                    <strong className="font-bold text-foreground">
                      ☑ {FUND_LABELS[fund]}
                      {fund === "others" && fundOther ? `: ${fundOther}` : ""}
                    </strong>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="slip-manual-amount"
                      className="text-sm font-bold"
                    >
                      Amount (sa halagang Php, optional)
                    </Label>
                    <Input
                      id="slip-manual-amount"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Leave blank for handwriting"
                      value={manualAmount}
                      onChange={(e) => setManualAmount(e.target.value)}
                      className="h-10 font-mono text-sm"
                    />
                  </div>
                </div>
              )}

              {(!selected || selected.kind === "his") && (
                <div className="space-y-1.5">
                  <Label htmlFor="slip-types" className="text-sm font-bold">
                    Type of Assistance (para sa, optional)
                  </Label>
                  <Select
                    value={typeId ?? ""}
                    onValueChange={(v) => setTypeId(v || null)}
                  >
                    <SelectTrigger
                      id="slip-types"
                      className="h-10 w-full text-sm"
                    >
                      <SelectValue>
                        {(value: string | null) =>
                          typeName(value) ||
                          "Select a type or leave blank for handwriting"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {typeOptions.map((option) => (
                        <SelectItem
                          key={option.id}
                          value={String(option.id)}
                          className="text-sm"
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertTitle className="text-sm font-bold">
                    Could not generate the slip
                  </AlertTitle>
                  <AlertDescription className="mt-0.5 text-sm">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="slip-time-started"
                    className="text-sm font-bold"
                  >
                    Time started
                  </Label>
                  <Input
                    id="slip-time-started"
                    type="time"
                    value={timeStarted}
                    onChange={(e) => setTimeStarted(e.target.value)}
                    className="h-10 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="slip-time-ended"
                    className="text-sm font-bold"
                  >
                    Time ended
                  </Label>
                  <Input
                    id="slip-time-ended"
                    type="time"
                    value={timeEnded}
                    onChange={(e) => setTimeEnded(e.target.value)}
                    className="h-10 text-sm"
                  />
                </div>
              </div>
              <ServiceTimesHint visit={service.visit} />

              <div className="space-y-1.5">
                <Label htmlFor="slip-remarks" className="text-sm font-bold">
                  Print remarks (optional)
                </Label>
                <Input
                  id="slip-remarks"
                  placeholder="e.g. Billing copy"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 border-t border-border/40 pt-3 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => openSlip(true)}
            disabled={isGenerating || isLoading || hisLoading}
            className="h-10 cursor-pointer gap-1.5 px-4 text-sm font-bold shadow-2xs"
          >
            <ExternalLink className="size-4 text-primary" />
            Preview in New Tab
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => openSlip(false)}
            disabled={isGenerating || isLoading || hisLoading}
            className="h-10 cursor-pointer gap-1.5 px-4 text-sm font-bold shadow-2xs"
          >
            <Printer className="size-4" />
            Print Slip
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
