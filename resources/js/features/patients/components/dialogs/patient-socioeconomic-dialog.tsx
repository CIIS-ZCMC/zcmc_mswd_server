import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import type { UpdatePatientBackgroundPayload } from "../../api/patients-api"
import type { PatientRecord } from "../../types"

interface PatientSocioEconomicDialogProps {
  isOpen: boolean
  onClose: () => void
  patient: PatientRecord
  onSave: (payload: UpdatePatientBackgroundPayload) => void
  isSaving: boolean
}

export const PatientSocioEconomicDialog: React.FC<PatientSocioEconomicDialogProps> = ({
  isOpen,
  onClose,
  patient,
  onSave,
  isSaving,
}) => {
  const [form, setForm] = useState(() => ({
    occupation: patient.occupation ?? "",
    employer: patient.employer ?? "",
    monthly_income: patient.monthlyIncome != null ? String(patient.monthlyIncome) : "",
  }))

  useEffect(() => {
    if (isOpen) {
      setForm({
        occupation: patient.occupation ?? "",
        employer: patient.employer ?? "",
        monthly_income: patient.monthlyIncome != null ? String(patient.monthlyIncome) : "",
      })
    }
  }, [isOpen, patient])

  const handleSave = () => {
    onSave({
      occupation: form.occupation.trim() || undefined,
      employer: form.employer.trim() || undefined,
      monthly_income: form.monthly_income !== "" ? Number(form.monthly_income) : undefined,
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full max-w-xl p-7 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Edit Socio-Economic &amp; Employment</DialogTitle>
          <DialogDescription className="text-sm">
            Update occupation, employer, and monthly income details for {patient.fullName}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-4 text-base">
          <div>
            <Label className="text-sm font-bold">Occupation</Label>
            <Input
              value={form.occupation}
              onChange={(e) => setForm({ ...form, occupation: e.target.value })}
              className="h-11 text-base mt-1"
              placeholder="e.g. Driver, Farmer, ZCMC Job Order"
            />
          </div>

          <div>
            <Label className="text-sm font-bold">Employer</Label>
            <Input
              value={form.employer}
              onChange={(e) => setForm({ ...form, employer: e.target.value })}
              className="h-11 text-base mt-1"
              placeholder="Company / Office / Self-employed"
            />
          </div>

          <div>
            <Label className="text-sm font-bold">Patient Monthly Income (₱)</Label>
            <Input
              type="number"
              min="0"
              step="any"
              value={form.monthly_income}
              onChange={(e) => setForm({ ...form, monthly_income: e.target.value })}
              className="h-11 text-base mt-1 font-mono"
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Personal monthly income of the patient. Leave blank if none or unknown.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="lg"
            className="h-11 text-base font-bold px-6"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            size="lg"
            className="h-11 text-base font-bold px-8"
            disabled={isSaving}
            onClick={handleSave}
          >
            {isSaving ? <Spinner className="size-5" /> : "Save Socio-Economic Details"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
