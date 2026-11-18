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
      <DialogContent className="w-full max-w-xl rounded-[20px] p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[18px] font-bold text-[#0c2a5b] dark:text-foreground">Edit Socio-Economic &amp; Employment</DialogTitle>
          <DialogDescription className="text-[12px] text-[#5b6678] dark:text-muted-foreground">
            Update occupation, employer, and monthly income details for {patient.fullName}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-3 text-[13px]">
          <div>
            <Label className="text-[12px] font-semibold text-[#5b6678] dark:text-muted-foreground">Occupation</Label>
            <Input
              value={form.occupation}
              onChange={(e) => setForm({ ...form, occupation: e.target.value })}
              className="h-[40px] text-[13px] font-medium text-[#1b2433] rounded-[10px] border-[#c6e8ee] mt-1 dark:text-foreground"
              placeholder="e.g. Driver, Farmer, ZCMC Job Order"
            />
          </div>

          <div>
            <Label className="text-[12px] font-semibold text-[#5b6678] dark:text-muted-foreground">Employer</Label>
            <Input
              value={form.employer}
              onChange={(e) => setForm({ ...form, employer: e.target.value })}
              className="h-[40px] text-[13px] font-medium text-[#1b2433] rounded-[10px] border-[#c6e8ee] mt-1 dark:text-foreground"
              placeholder="Company / Office / Self-employed"
            />
          </div>

          <div>
            <Label className="text-[12px] font-semibold text-[#5b6678] dark:text-muted-foreground">Patient Monthly Income (₱)</Label>
            <Input
              type="number"
              min="0"
              step="any"
              value={form.monthly_income}
              onChange={(e) => setForm({ ...form, monthly_income: e.target.value })}
              className="h-[40px] text-[13px] font-medium text-[#1b2433] rounded-[10px] border-[#c6e8ee] mt-1 font-mono dark:text-foreground"
              placeholder="0.00"
            />
            <p className="text-[11px] text-[#5b6678] dark:text-muted-foreground mt-1">
              Personal monthly income of the patient. Leave blank if none or unknown.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="h-[36px] rounded-full border border-[#cfd7e4] px-[16px] text-[13px] font-semibold text-[#0c2a5b] transition-colors hover:bg-[#f4f7fc] active:scale-[0.98] dark:border-border dark:text-foreground dark:hover:bg-muted"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-[36px] rounded-full bg-[#1f5fd6] px-[20px] text-[13px] font-semibold text-white shadow-xs transition-colors hover:bg-[#1a53bd] active:scale-[0.98]"
            disabled={isSaving}
            onClick={handleSave}
          >
            {isSaving ? <Spinner className="size-4" /> : "Save Socio-Economic Details"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
