import React, { useEffect, useState } from "react"
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
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Calendar,
  ExternalLink,
  FileText,
  Info,
  Loader2,
  Printer,
  Sparkles,
} from "lucide-react"
import type { HospitalEncounter } from "@/features/hospital/types"
import type { PatientRecord } from "@/features/patients/types"
import { formatTransactionType } from "@/features/hospital/lib/transaction-type"
import { AcknowledgementSlipDialog } from "@/features/guarantees"
import { CityMayorSlipDialog } from "./city-mayor-slip-dialog"
import { ApiError } from "@/lib/api-client"
import { openPdfInNewTab } from "@/lib/open-pdf"

export type PrintableType = "uis" | "maifip" | "cga"

interface EncounterPrintableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: PrintableType
  encounter: HospitalEncounter | null
  patient: PatientRecord
  caseId?: number | null
  caseCode?: string | null
  onOpenCaseNeeded?: () => void
}

export const EncounterPrintableDialog: React.FC<
  EncounterPrintableDialogProps
> = ({
  open,
  onOpenChange,
  type,
  encounter,
  patient,
  caseId,
  caseCode,
  onOpenCaseNeeded,
}) => {
  const [remarks, setRemarks] = useState<string>("")
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  // The case has no intake assessment yet (409): offer that case's blank form.
  const [offerBlank, setOfferBlank] = useState(false)

  useEffect(() => {
    if (open) {
      setError(null)
      setOfferBlank(false)
    }
  }, [open, type])

  if (!encounter) return null

  // The MAIFIP slip prints from a guarantee on this encounter, so it has its own
  // dialog (guarantee picker, times) — see docs/ACKNOWLEDGEMENT_SLIP_PLAN.md.
  if (type === "maifip") {
    return (
      <AcknowledgementSlipDialog
        open={open}
        onOpenChange={onOpenChange}
        patientId={patient.id}
        transactionId={encounter.id}
      />
    )
  }

  // The City Mayor slip (ZCMC-F-MSS-04) takes its fund, amount and type in its own
  // dialog — see docs/CITY_MAYOR_SLIP_PLAN.md.
  if (type === "cga") {
    return (
      <CityMayorSlipDialog
        open={open}
        onOpenChange={onOpenChange}
        encounter={encounter}
        patient={patient}
      />
    )
  }

  const getDocConfig = () => {
    switch (type) {
      case "uis":
      default:
        return {
          title: "Unified Intake Sheet (ANNEX B)",
          subtitle: "Official MSWD Unified Intake Sheet assessment form",
          icon: FileText,
          badgeColor: "bg-primary/15 text-primary border-primary/30",
          notice: caseId
            ? `Generates the official populated intake assessment for Case ${caseCode || `#${caseId}`}.`
            : "No social case is linked to this encounter yet. The UIS prints from a case — open a case first.",
          pdfPath: caseId ? `/cases/${caseId}/uis/pdf` : null,
        }
    }
  }

  const config = getDocConfig()
  const IconComponent = config.icon

  const canPrint = config.pdfPath !== null

  const handlePrint = async (preview: boolean, blank = false) => {
    if (!config.pdfPath) return
    setIsGenerating(true)
    setError(null)
    setOfferBlank(false)

    try {
      await openPdfInNewTab(config.pdfPath, {
        remarks: remarks.trim() || undefined,
        preview: preview ? 1 : undefined,
        blank: blank ? 1 : undefined,
      })
      if (!preview) onOpenChange(false)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "The document could not be generated."
      )
      setOfferBlank(err instanceof ApiError && err.code === "uis_no_assessment")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader className="space-y-1.5 border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <IconComponent className="size-5.5 shrink-0 text-primary" />
            <DialogTitle className="text-xl font-extrabold text-foreground">
              {config.title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs font-medium text-muted-foreground sm:text-sm">
            {config.subtitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Encounter Summary Card */}
          <div className="space-y-2 rounded-xl border bg-muted/30 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-1.5 font-bold text-foreground">
                <Calendar className="size-3.5 text-primary" />
                {encounter.registrationDate ?? "No admission date"}
              </span>
              <Badge
                variant="outline"
                className={`text-xs font-semibold ${config.badgeColor}`}
              >
                Encounter #{encounter.id} ·{" "}
                {formatTransactionType(encounter.patientTransactionType)}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-border/40 pt-1 text-xs text-muted-foreground">
              <div>
                Patient:{" "}
                <strong className="text-foreground">{patient.fullName}</strong>
              </div>
              <div>
                Hospital No:{" "}
                <strong className="text-foreground">
                  {patient.hospitalNo || String(patient.hospitalId)}
                </strong>
              </div>
            </div>
          </div>

          {/* Info Notice */}
          <Alert className="border border-primary/20 bg-primary/5">
            <Info className="size-4 shrink-0 text-primary" />
            <AlertTitle className="text-xs font-bold text-foreground">
              Printable Information
            </AlertTitle>
            <AlertDescription className="mt-0.5 text-xs text-muted-foreground">
              {config.notice}
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertTitle className="text-xs font-bold">
                Could not generate the document
              </AlertTitle>
              <AlertDescription className="mt-0.5 text-xs">
                {error}
                {offerBlank && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handlePrint(false, true)}
                    className="mt-2 h-7 text-xs font-bold"
                  >
                    Print a blank UIS for this case instead
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Case Unlinked Notice for UIS */}
          {type === "uis" && !caseId && onOpenCaseNeeded && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
              <div className="text-xs text-amber-900 dark:text-amber-200">
                Want to populate the patient assessment on this form?
              </div>
              <Button
                type="button"
                size="sm"
                variant="default"
                onClick={() => {
                  onOpenChange(false)
                  onOpenCaseNeeded()
                }}
                className="h-7 shrink-0 gap-1 text-xs font-bold"
              >
                <Sparkles className="size-3" />
                Open Case
              </Button>
            </div>
          )}

          {/* Remarks */}
          <div className="pt-1">
            <Label htmlFor="print-remarks" className="text-xs font-bold">
              Print Remarks (Optional)
            </Label>
            <Input
              id="print-remarks"
              placeholder="e.g. For billing release, Malasakit copy"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="mt-1 h-9 text-xs"
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 border-t border-border/40 pt-3 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handlePrint(true)}
            disabled={isGenerating || !canPrint}
            className="h-9 cursor-pointer gap-1.5 px-3.5 text-xs font-bold shadow-2xs"
          >
            <ExternalLink className="size-3.5 text-primary" />
            Preview in New Tab
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => handlePrint(false)}
            disabled={isGenerating || !canPrint}
            className="h-9 cursor-pointer gap-1.5 px-4 text-xs font-bold shadow-2xs"
          >
            {isGenerating ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Printer className="size-3.5" />
            )}
            Print Document
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
