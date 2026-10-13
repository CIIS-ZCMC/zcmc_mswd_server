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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { ClipboardPlus, Info } from "lucide-react"
import { useHospitalEncounters } from "@/features/hospital/hooks/use-hospital-encounters"
import { formatTransactionType } from "@/features/hospital/lib/transaction-type"
import type { HospitalEncounter } from "@/features/hospital/types"
import type { PatientRecord } from "@/features/patients/types/patient.types"
import { IntakeAssessmentDialog } from "./intake-assessment-dialog"

interface NewIntakeAssessmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  patient: PatientRecord
  /** Encounters that already have an intake (one per encounter). */
  assessedTransactionIds?: number[]
  /** Skip the picker and start on this encounter. */
  initialTransactionId?: number | null
}

const encounterLabel = (encounter: HospitalEncounter) =>
  `${encounter.registrationDate?.slice(0, 10) ?? "No date"} · ${formatTransactionType(
    encounter.patientTransactionType
  )}`

/**
 * Take an Intake Assessment (UIS) for one of the patient's HIS encounters, with
 * no case needed: pick the encounter, then fill in the intake form. A case
 * opened later on the encounter picks it up. See docs/INTAKE_ASSESSMENT_PLAN.md.
 */
export const NewIntakeAssessmentDialog: React.FC<
  NewIntakeAssessmentDialogProps
> = ({
  open,
  onOpenChange,
  patient,
  assessedTransactionIds = [],
  initialTransactionId = null,
}) => {
  const hospitalNumber = patient.hospitalId ?? patient.hospitalNo
  const { data: encounters = [], isLoading } = useHospitalEncounters(
    open ? hospitalNumber : undefined
  )
  const [selectedId, setSelectedId] = useState<string>("")
  const [formTransactionId, setFormTransactionId] = useState<number | null>(
    null
  )

  useEffect(() => {
    if (!open) return
    setSelectedId(initialTransactionId ? String(initialTransactionId) : "")
    setFormTransactionId(initialTransactionId)
  }, [open, initialTransactionId])

  const assessed = new Set(assessedTransactionIds.map(String))
  const available = encounters.filter((e) => !assessed.has(String(e.id)))

  // The picker step; the form takes over once an encounter is chosen.
  if (formTransactionId) {
    return (
      <IntakeAssessmentDialog
        open={open}
        onOpenChange={onOpenChange}
        patientId={patient.id}
        transactionId={formTransactionId}
        patientName={patient.fullName}
        patientAddress={patient.address}
        patientContact={patient.contactNo}
        patientMonthlyIncome={patient.monthlyIncome}
      />
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader className="space-y-1.5 border-b border-border/40 pb-3">
          <DialogTitle className="flex items-center gap-2 text-xl font-extrabold">
            <ClipboardPlus className="size-5.5 text-primary" />
            New Intake Assessment
          </DialogTitle>
          <DialogDescription className="text-sm">
            The Unified Intake Sheet (ANNEX B) of one hospital encounter. No
            case is needed; a case opened later on the encounter picks it up.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Label htmlFor="intake-encounter" className="text-sm font-bold">
            Hospital encounter
          </Label>
          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : encounters.length === 0 ? (
            <Alert>
              <Info className="size-4" />
              <AlertDescription className="text-sm">
                No HIS encounters were found for this patient
                {hospitalNumber ? "" : " (no hospital number on file)"}.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <Select
                value={selectedId}
                onValueChange={(v) => setSelectedId(v ?? "")}
              >
                <SelectTrigger id="intake-encounter" className="h-10 text-sm">
                  <SelectValue>
                    {(value: string | null) => {
                      const encounter = encounters.find(
                        (e) => String(e.id) === value
                      )
                      return encounter
                        ? encounterLabel(encounter)
                        : "Select a hospital encounter"
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {encounters.map((encounter) => (
                    <SelectItem
                      key={encounter.id}
                      value={String(encounter.id)}
                      disabled={assessed.has(String(encounter.id))}
                      className="text-sm"
                    >
                      {encounterLabel(encounter)}
                      {assessed.has(String(encounter.id)) &&
                        " (already assessed)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {available.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Every encounter already has an intake assessment; open it from
                  the list to reassess.
                </p>
              )}
            </>
          )}
        </div>

        <DialogFooter className="border-t border-border/40 pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-10 px-4 text-sm"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!selectedId}
            onClick={() => setFormTransactionId(Number(selectedId))}
            className="h-10 px-4 text-sm font-bold"
          >
            Continue to intake form
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
