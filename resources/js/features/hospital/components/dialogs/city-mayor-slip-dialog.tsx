import React, { useEffect, useState } from "react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Building2, Calendar, ExternalLink, Printer } from "lucide-react"
import { useAssistanceTypeOptions } from "@/features/library/hooks/use-lookup-options"
import { openPdfInNewTab } from "@/lib/open-pdf"
import type { HospitalEncounter } from "@/features/hospital/types"
import type { PatientRecord } from "@/features/patients/types"

/** Mirrors App\Services\CityMayorSlipPdfService::FUNDS ("tulong na nagmula sa"). */
const FUNDS: Record<string, string> = {
  city_grant: "City Grant in Aid",
  dswd: "DSWD",
  pcso: "Philippine Charity Sweepstakes",
  armm: "ARMM",
  others: "Others (specify)",
}

interface CityMayorSlipDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  encounter: HospitalEncounter
  patient: PatientRecord
}

/**
 * Print the City Mayor Acknowledgement Slip (Medical Assistance), ZCMC-F-MSS-04,
 * for a HIS encounter. The patient's details print from the registry; the fund,
 * amount and "para sa" type are picked here and printed only (not stored).
 */
export const CityMayorSlipDialog: React.FC<CityMayorSlipDialogProps> = ({
  open,
  onOpenChange,
  encounter,
  patient,
}) => {
  const { data: typeOptions = [] } = useAssistanceTypeOptions(true)
  // The "Para sa" ticks: Library type ids (several allowed, like the paper checklist).
  const [typeIds, setTypeIds] = useState<number[]>([])
  const [fund, setFund] = useState("city_grant")
  const [fundOther, setFundOther] = useState("")
  const [amount, setAmount] = useState("")
  const [timeStarted, setTimeStarted] = useState("")
  const [timeEnded, setTimeEnded] = useState("")
  const [remarks, setRemarks] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Each opening starts fresh: the picks are printed only, never stored.
  useEffect(() => {
    if (!open) return
    setTypeIds([])
    setFund("city_grant")
    setFundOther("")
    setAmount("")
    setTimeStarted("")
    setTimeEnded("")
    setRemarks("")
    setError(null)
  }, [open])

  const toggleType = (id: number, checked: boolean) =>
    setTypeIds((ids) =>
      checked ? [...ids, id] : ids.filter((existing) => existing !== id)
    )

  const openSlip = async (preview: boolean) => {
    if (fund === "others" && !fundOther.trim()) {
      setError("Specify the source of assistance for “Others”.")
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      await openPdfInNewTab(
        `/patient-transactions/${encounter.id}/city-mayor-slip/pdf`,
        {
          assistant_type_ids: typeIds.length ? typeIds.join(",") : undefined,
          fund,
          fund_other: fund === "others" ? fundOther.trim() : undefined,
          amount: amount.trim() || undefined,
          time_started: timeStarted || undefined,
          time_ended: timeEnded || undefined,
          remarks: remarks.trim() || undefined,
          preview: preview ? 1 : undefined,
        }
      )
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
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader className="space-y-1.5 border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="size-5.5 shrink-0 text-primary" />
            <DialogTitle className="text-xl font-extrabold text-foreground">
              Acknowledgement Slip (City Mayor)
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs font-medium text-muted-foreground sm:text-sm">
            ZCMC-F-MSS-04 · Medical Assistance acknowledgement for this
            encounter.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2 rounded-xl border bg-muted/30 p-4 text-sm">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <Calendar className="size-4 text-primary" />
              {encounter.registrationDate ?? "No admission date"} · Encounter #
              {encounter.id}
            </div>
            <div className="text-muted-foreground">
              Patient:{" "}
              <strong className="text-foreground font-bold">{patient.fullName}</strong> ·
              Hospital No:{" "}
              <strong className="text-foreground font-bold">{patient.hospitalNo}</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cm-fund" className="text-sm font-bold">
                Tulong na nagmula sa
              </Label>
              <Select value={fund} onValueChange={(v) => v && setFund(v)}>
                <SelectTrigger id="cm-fund" className="h-10 w-full text-sm">
                  <SelectValue>
                    {(value: string | null) => (value ? FUNDS[value] : "")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FUNDS).map(([key, label]) => (
                    <SelectItem key={key} value={key} className="text-sm">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cm-amount" className="text-sm font-bold">
                Sa halagang Php (optional)
              </Label>
              <Input
                id="cm-amount"
                type="number"
                min={0}
                step="0.01"
                placeholder="Leave blank to write by hand"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-10 text-sm"
              />
            </div>
          </div>

          {fund === "others" && (
            <div className="space-y-1.5">
              <Label htmlFor="cm-fund-other" className="text-sm font-bold">
                Others — please specify
              </Label>
              <Input
                id="cm-fund-other"
                maxLength={100}
                value={fundOther}
                onChange={(e) => setFundOther(e.target.value)}
                className="h-10 text-sm"
              />
            </div>
          )}

          <fieldset className="space-y-1.5">
            <legend className="text-sm font-bold">
              Type of Assistance (para sa)
            </legend>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 rounded-lg border p-3.5 sm:grid-cols-2">
              {typeOptions.map((option) => {
                const id = Number(option.id)
                const inputId = `cm-type-${id}`
                return (
                  <label
                    key={id}
                    htmlFor={inputId}
                    className="flex cursor-pointer items-center gap-2.5 text-sm font-medium"
                  >
                    <Checkbox
                      id={inputId}
                      checked={typeIds.includes(id)}
                      onCheckedChange={(checked) => toggleType(id, checked)}
                    />
                    {option.label}
                  </label>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Tick one or more; the slip lists every type and ticks these. Leave
              all unticked to tick by hand.
            </p>
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cm-time-started" className="text-sm font-bold">
                Time started (optional)
              </Label>
              <Input
                id="cm-time-started"
                type="time"
                value={timeStarted}
                onChange={(e) => setTimeStarted(e.target.value)}
                className="h-10 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cm-time-ended" className="text-sm font-bold">
                Time ended (optional)
              </Label>
              <Input
                id="cm-time-ended"
                type="time"
                value={timeEnded}
                onChange={(e) => setTimeEnded(e.target.value)}
                className="h-10 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cm-remarks" className="text-sm font-bold">
              Print remarks (optional)
            </Label>
            <Input
              id="cm-remarks"
              placeholder="e.g. Billing copy"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="h-10 text-sm"
            />
          </div>

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
        </div>

        <DialogFooter className="flex-col gap-2 border-t border-border/40 pt-3 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => openSlip(true)}
            disabled={isGenerating}
            className="h-10 gap-1.5 px-4 text-sm font-bold shadow-2xs"
          >
            <ExternalLink className="size-4 text-primary" />
            Preview in New Tab
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => openSlip(false)}
            disabled={isGenerating}
            className="h-10 gap-1.5 px-4 text-sm font-bold shadow-2xs"
          >
            <Printer className="size-4" />
            Print Slip
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
