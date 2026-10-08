import React, { useEffect, useMemo, useState } from "react"
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
import {
  isMaifipGuarantee,
  isMaifipName,
  openAcknowledgementSlip,
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

/**
 * Print the DOH-MAIFIP Acknowledgement Slip (ZCMC-F-MSWD-46) for the encounter.
 * Sources: the MSWD's MAIFIP guarantees (amount + types of assistance), then the
 * encounter's MAIFIP entries on the HIS guarantor ledger (HIS amount; HIS has
 * no breakdown, so "para sa" is picked here from the Library's Types of
 * Assistance). The times and picked types are printed only, not stored.
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
  const [timeStarted, setTimeStarted] = useState("")
  const [timeEnded, setTimeEnded] = useState("")
  const [remarks, setRemarks] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // HIS source only: the "para sa" type of assistance (a Library id).
  const [typeId, setTypeId] = useState<string | null>(null)
  const { data: typeOptions = [] } = useAssistanceTypeOptions(true)

  // Each opening starts from the requested guarantee (or the first) and empty times.
  useEffect(() => {
    if (!open) return
    setSelectedKey(guaranteeId ? `mswd-${guaranteeId}` : null)
    setTimeStarted("")
    setTimeEnded("")
    setRemarks("")
    setError(null)
    setTypeId(null)
  }, [open, guaranteeId])

  const selected =
    sources.find((source) => source.key === selectedKey) ?? sources[0]

  const typeName = (id: string | null) =>
    (typeOptions.find((o) => String(o.id) === id)?.label ?? "").toUpperCase()

  const openSlip = async (preview: boolean) => {
    if (!selected) return
    setIsGenerating(true)
    setError(null)

    try {
      const options = {
        remarks,
        timeStarted,
        timeEnded,
        preview,
        assistantTypeIds: typeId ? [Number(typeId)] : [],
      }
      if (selected.kind === "mswd") {
        await openAcknowledgementSlip(selected.guarantee.id, options)
      } else {
        await openHisAcknowledgementSlip(
          transactionId,
          selected.entry.id,
          options
        )
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
              Acknowledgement Slip (DOH-MAIFIP)
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs font-medium text-muted-foreground sm:text-sm">
            ZCMC-F-MSWD-46 · printed from this encounter&apos;s MAIFIP guarantee
            (MSWD record or HIS guarantor ledger).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isLoading || hisLoading ? (
            <Skeleton className="h-24 w-full rounded-xl" />
          ) : sources.length === 0 ? (
            <Alert className="border-amber-500/30 bg-amber-500/10">
              <Info className="size-4 shrink-0 text-amber-600" />
              <AlertTitle className="text-xs font-bold">
                No MAIFIP guarantee on this encounter
              </AlertTitle>
              <AlertDescription className="mt-0.5 text-xs">
                Neither the MSWD records nor the HIS guarantor ledger list
                MAIFIP for this encounter. Record one under Guarantors → Add
                Guarantor.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {sources.length > 1 && (
                <div className="space-y-1">
                  <Label htmlFor="slip-guarantee" className="text-xs font-bold">
                    Print from
                  </Label>
                  <Select
                    value={selected?.key ?? null}
                    onValueChange={(v) => v && setSelectedKey(v)}
                  >
                    <SelectTrigger id="slip-guarantee" className="h-9 text-xs">
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
                        <SelectItem key={source.key} value={source.key}>
                          {sourceLabel(source)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selected && (
                <div className="space-y-1.5 rounded-xl border bg-muted/30 p-3.5 text-xs">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">
                      sa halagang Php
                    </span>
                    <strong className="text-foreground">
                      {formatCurrency(
                        selected.kind === "mswd"
                          ? selected.guarantee.total
                          : (selected.entry.amount ?? 0)
                      )}
                    </strong>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">para sa</span>
                    <strong className="text-right text-foreground">
                      {selected.kind === "mswd"
                        ? slipPurpose(selected.guarantee) ||
                          "— (no types on the breakdown)"
                        : typeName(typeId) || "— (pick below, or leave blank)"}
                    </strong>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Source</span>
                    <strong className="text-right text-foreground">
                      {selected.kind === "mswd"
                        ? "MSWD guarantee record"
                        : selected.entry.glPosted
                          ? "HIS guarantor ledger (GL posted)"
                          : "HIS guarantor ledger"}
                    </strong>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Fund</span>
                    <strong className="text-foreground">☑ DOH-MAIFIP</strong>
                  </div>
                </div>
              )}

              {selected?.kind === "his" && (
                <div className="space-y-1">
                  <Label htmlFor="slip-types" className="text-xs font-bold">
                    Type of Assistance (para sa)
                  </Label>
                  <Select value={typeId} onValueChange={(v) => setTypeId(v)}>
                    <SelectTrigger
                      id="slip-types"
                      className="h-9 w-full text-xs"
                    >
                      <SelectValue>
                        {(value: string | null) =>
                          typeName(value) || "Select a type of assistance"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {typeOptions.map((option) => (
                        <SelectItem key={option.id} value={String(option.id)}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    HIS records no type of assistance. Pick one, or leave it
                    blank to write by hand.
                  </p>
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertTitle className="text-xs font-bold">
                    Could not generate the slip
                  </AlertTitle>
                  <AlertDescription className="mt-0.5 text-xs">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label
                    htmlFor="slip-time-started"
                    className="text-xs font-bold"
                  >
                    Time started (optional)
                  </Label>
                  <Input
                    id="slip-time-started"
                    type="time"
                    value={timeStarted}
                    onChange={(e) => setTimeStarted(e.target.value)}
                    className="mt-1 h-9 text-sm"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="slip-time-ended"
                    className="text-xs font-bold"
                  >
                    Time ended (optional)
                  </Label>
                  <Input
                    id="slip-time-ended"
                    type="time"
                    value={timeEnded}
                    onChange={(e) => setTimeEnded(e.target.value)}
                    className="mt-1 h-9 text-sm"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="slip-remarks" className="text-xs font-bold">
                  Print remarks (optional)
                </Label>
                <Input
                  id="slip-remarks"
                  placeholder="e.g. Billing copy"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="mt-1 h-9 text-xs"
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
            disabled={!selected || isGenerating}
            className="h-9 gap-1.5 px-3.5 text-xs font-bold shadow-2xs"
          >
            <ExternalLink className="size-3.5 text-primary" />
            Preview in New Tab
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => openSlip(false)}
            disabled={!selected || isGenerating}
            className="h-9 gap-1.5 px-4 text-xs font-bold shadow-2xs"
          >
            <Printer className="size-3.5" />
            Print Slip
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
