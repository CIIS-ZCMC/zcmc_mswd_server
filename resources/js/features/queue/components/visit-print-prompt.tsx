import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  BadgeCheck,
  Building2,
  FileCheck2,
  FileText,
  Loader2,
  Printer,
} from "lucide-react"
import { usePermission } from "@/features/auth/hooks/use-permission"
import { useHospitalEncounter } from "@/features/hospital/hooks/use-hospital-encounters"
import {
  EncounterPrintableDialog,
  type PrintableType,
} from "@/features/hospital/components/dialogs/encounter-printable-dialog"
import { usePatientDetail } from "@/features/patients/hooks/use-patient-detail"
import type { ServiceVisit } from "../types"

interface VisitPrintPromptProps {
  /** The completed visit to offer printables for. Hold it in state in the caller. */
  visit: ServiceVisit | null
  /** Called when the worker is done (or skips); the caller moves on, e.g. to the DAR question. */
  onClose: () => void
}

/** After a visit is completed: asks what to print for its encounter, then hands over to the printable dialogs. */
export const VisitPrintPrompt: React.FC<VisitPrintPromptProps> = ({
  visit,
  onClose,
}) => {
  if (!visit) return null

  return <VisitPrintPromptBody key={visit.id} visit={visit} onClose={onClose} />
}

const VisitPrintPromptBody: React.FC<{
  visit: ServiceVisit
  onClose: () => void
}> = ({ visit, onClose }) => {
  const canPrintUis = usePermission("intake.view")
  const [printType, setPrintType] = useState<PrintableType | null>(null)

  const { data: encounter, isLoading: encounterLoading } = useHospitalEncounter(
    visit.hisTransactionId,
    true
  )
  const { patient, isLoading: patientLoading } = usePatientDetail(
    String(visit.patientId)
  )

  const isLoading = encounterLoading || patientLoading
  const ready = Boolean(encounter && patient)

  const options: {
    type: PrintableType
    label: string
    icon: React.ElementType
    show: boolean
  }[] = [
    {
      type: "uis",
      label: "Unified Intake Sheet (UIS)",
      icon: FileText,
      show: canPrintUis,
    },
    {
      type: "maifip",
      label: "Acknowledgement Slip (MAIFIP)",
      icon: FileCheck2,
      show: true,
    },
    {
      type: "cga",
      label: "City Mayor Acknowledgement Slip",
      icon: Building2,
      show: true,
    },
    {
      type: "indigency",
      label: "Certificate of Eligibility (Indigency)",
      icon: BadgeCheck,
      show: true,
    },
  ]

  return (
    <>
      <Dialog
        open={printType === null}
        onOpenChange={(next) => {
          if (!next) onClose()
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Printer className="size-5 text-primary" />
              What do you want to print?
            </DialogTitle>
            <DialogDescription className="text-xs">
              Service for {visit.patient?.name || "this patient"} is complete.
              Choose a document for encounter #{visit.hisTransactionId}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {options
              .filter((option) => option.show)
              .map(({ type, label, icon: Icon }) => (
                <Button
                  key={type}
                  type="button"
                  variant="outline"
                  disabled={!ready}
                  onClick={() => setPrintType(type)}
                  className="h-11 w-full justify-start gap-3 text-sm font-bold"
                >
                  {isLoading ? (
                    <Loader2 className="size-5 shrink-0 animate-spin text-primary" />
                  ) : (
                    <Icon className="size-5 shrink-0 text-primary" />
                  )}
                  <span>{label}</span>
                </Button>
              ))}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Not now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {ready && printType && (
        <EncounterPrintableDialog
          open
          onOpenChange={(next) => {
            if (!next) setPrintType(null)
          }}
          type={printType}
          encounter={encounter ?? null}
          patient={patient!}
          caseId={patient?.latestCaseId}
        />
      )}
    </>
  )
}
