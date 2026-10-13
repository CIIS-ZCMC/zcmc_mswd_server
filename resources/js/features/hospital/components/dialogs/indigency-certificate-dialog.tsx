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
import { BadgeCheck, Calendar, ExternalLink, Printer } from "lucide-react"
import { useAssistanceTypeOptions } from "@/features/library/hooks/use-lookup-options"
import { useSignatories } from "@/features/library/hooks/use-library"
import { useLatestAssessment } from "@/features/cases/hooks/use-assessment"
import { openPdfInNewTab } from "@/lib/open-pdf"
import type { HospitalEncounter } from "@/features/hospital/types"
import type { PatientRecord } from "@/features/patients/types"

/** Mirrors App\Services\IndigencyCertificatePdfService::CLASSIFICATIONS. */
const CLASSIFICATIONS: Record<string, string> = {
  A: "A-Financially Capable",
  B: "B-Partially Financially Capable",
  C1: "C1-Partially Financially Capable",
  C2: "C2-Partially Financially Capable",
  C3: "C3-Partially Financially Capable",
  D: "D-Financially Incapable",
}

/** The select's "leave the line blank" choice. */
const BLANK = "blank"

interface IndigencyCertificateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  encounter: HospitalEncounter
  patient: PatientRecord
  caseId?: number | null
}

/**
 * Print the Certificate of Eligibility (Indigency), Annex A, for a HIS encounter.
 * The classification starts from the linked case's latest assessment; it and the
 * services availed are picked here and printed only (not stored).
 */
export const IndigencyCertificateDialog: React.FC<
  IndigencyCertificateDialogProps
> = ({ open, onOpenChange, encounter, patient, caseId }) => {
  const { data: typeOptions = [] } = useAssistanceTypeOptions(true)
  const { data: signatories } = useSignatories(open)
  const { data: assessment } = useLatestAssessment(open ? caseId : null)
  const [classification, setClassification] = useState(BLANK)
  const [typeIds, setTypeIds] = useState<number[]>([])
  const [remarks, setRemarks] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // The assessed bracket: the worker's override, else the calculated one.
  // Legacy words (e.g. "indigent") are not brackets, so they prefill nothing.
  const assessed = [
    assessment?.classification,
    assessment?.calculatedClassification,
  ].find((code) => !!code && code in CLASSIFICATIONS)

  // Each opening starts fresh: the picks are printed only, never stored.
  useEffect(() => {
    if (!open) return
    setClassification(assessed ?? BLANK)
    setTypeIds([])
    setRemarks("")
    setError(null)
  }, [open, assessed])

  const hasHead = signatories?.some((s) => s.role === "mswd_head" && s.isActive)

  const toggleType = (id: number, checked: boolean) =>
    setTypeIds((ids) =>
      checked ? [...ids, id] : ids.filter((existing) => existing !== id)
    )

  const openCertificate = async (preview: boolean) => {
    setIsGenerating(true)
    setError(null)

    try {
      await openPdfInNewTab(
        `/patient-transactions/${encounter.id}/indigency-certificate/pdf`,
        {
          classification: classification === BLANK ? undefined : classification,
          assistant_type_ids: typeIds.length ? typeIds.join(",") : undefined,
          remarks: remarks.trim() || undefined,
          preview: preview ? 1 : undefined,
        }
      )
      if (!preview) onOpenChange(false)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "The certificate could not be generated."
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
            <BadgeCheck className="size-5.5 shrink-0 text-primary" />
            <DialogTitle className="text-xl font-extrabold text-foreground">
              Certificate of Eligibility (Indigency)
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs font-medium text-muted-foreground sm:text-sm">
            Annex A · Malasakit Center requirement for this encounter.
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
              <strong className="font-bold text-foreground">
                {patient.fullName}
              </strong>{" "}
              · Hospital No:{" "}
              <strong className="font-bold text-foreground">
                {patient.hospitalNo}
              </strong>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ind-classification" className="text-sm font-bold">
              Classification
            </Label>
            <Select
              value={classification}
              onValueChange={(v) => v && setClassification(v)}
            >
              <SelectTrigger
                id="ind-classification"
                className="h-10 w-full text-sm"
              >
                <SelectValue>
                  {(value: string | null) =>
                    value && value !== BLANK
                      ? CLASSIFICATIONS[value]
                      : "Leave blank (write by hand)"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CLASSIFICATIONS).map(([code, label]) => (
                  <SelectItem key={code} value={code} className="text-sm">
                    {label}
                  </SelectItem>
                ))}
                <SelectItem value={BLANK} className="text-sm">
                  Leave blank (write by hand)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {assessed
                ? `Prefilled from the latest assessment (${assessed}).`
                : "No assessed classification on the linked case; pick one or leave it blank."}
            </p>
          </div>

          <fieldset className="space-y-1.5">
            <legend className="text-sm font-bold">
              Assistance / service availed
            </legend>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 rounded-lg border p-3.5 sm:grid-cols-2">
              {typeOptions.map((option) => {
                const id = Number(option.id)
                const inputId = `ind-type-${id}`
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
              Ticked services print on one line in the order ticked (e.g.
              LABORATORY/X-RAY). Leave all unticked to write by hand.
            </p>
          </fieldset>

          <div className="space-y-1.5">
            <Label htmlFor="ind-remarks" className="text-sm font-bold">
              Print remarks (optional)
            </Label>
            <Input
              id="ind-remarks"
              placeholder="e.g. Malasakit copy"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="h-10 text-sm"
            />
          </div>

          {signatories && !hasHead && (
            <Alert>
              <AlertDescription className="text-sm">
                No active MSWD Head in Library → Signatories, so “Issued by”
                prints blank.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTitle className="text-sm font-bold">
                Could not generate the certificate
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
            onClick={() => openCertificate(true)}
            disabled={isGenerating}
            className="h-10 gap-1.5 px-4 text-sm font-bold shadow-2xs"
          >
            <ExternalLink className="size-4 text-primary" />
            Preview in New Tab
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => openCertificate(false)}
            disabled={isGenerating}
            className="h-10 gap-1.5 px-4 text-sm font-bold shadow-2xs"
          >
            <Printer className="size-4" />
            Print Certificate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
