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

interface PatientContactDialogProps {
  isOpen: boolean
  onClose: () => void
  patient: PatientRecord
  onSave: (payload: UpdatePatientBackgroundPayload) => void
  isSaving: boolean
}

export const PatientContactDialog: React.FC<PatientContactDialogProps> = ({
  isOpen,
  onClose,
  patient,
  onSave,
  isSaving,
}) => {
  const [form, setForm] = useState(() => ({
    contact_number: patient.contactNo ?? "",
    barangay: patient.barangay ?? "",
    municipality: patient.city ?? "",
    address: patient.address ?? "",
    present_address: patient.presentAddress ?? "",
    permanent_address: patient.permanentAddress ?? "",
  }))

  useEffect(() => {
    if (isOpen) {
      setForm({
        contact_number: patient.contactNo ?? "",
        barangay: patient.barangay ?? "",
        municipality: patient.city ?? "",
        address: patient.address ?? "",
        present_address: patient.presentAddress ?? "",
        permanent_address: patient.permanentAddress ?? "",
      })
    }
  }, [isOpen, patient])

  const handleSave = () => {
    onSave({
      contact_number: form.contact_number || undefined,
      barangay: form.barangay || undefined,
      municipality: form.municipality || undefined,
      address: form.address || undefined,
      present_address: form.present_address || undefined,
      permanent_address: form.permanent_address || undefined,
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full max-w-3xl p-7 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Edit Contact &amp; Residence Information</DialogTitle>
          <DialogDescription className="text-sm">
            Update contact numbers and addresses recorded for {patient.fullName}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-4 text-base">
          <div>
            <Label className="text-sm font-bold">Contact Number</Label>
            <Input
              value={form.contact_number}
              onChange={(e) => setForm({ ...form, contact_number: e.target.value })}
              className="h-11 text-base mt-1 font-mono"
              placeholder="e.g. 09171234567"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-bold">Barangay</Label>
              <Input
                value={form.barangay}
                onChange={(e) => setForm({ ...form, barangay: e.target.value })}
                className="h-11 text-base mt-1"
                placeholder="Barangay name"
              />
            </div>
            <div>
              <Label className="text-sm font-bold">City / Municipality</Label>
              <Input
                value={form.municipality}
                onChange={(e) => setForm({ ...form, municipality: e.target.value })}
                className="h-11 text-base mt-1"
                placeholder="City / Municipality name"
              />
            </div>
          </div>

          <div>
            <Label className="text-sm font-bold">Primary Address</Label>
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="h-11 text-base mt-1"
              placeholder="Full primary home address"
            />
          </div>

          <div>
            <Label className="text-sm font-bold">Present Address</Label>
            <Input
              value={form.present_address}
              onChange={(e) => setForm({ ...form, present_address: e.target.value })}
              className="h-11 text-base mt-1"
              placeholder="Current temporary / living address"
            />
          </div>

          <div>
            <Label className="text-sm font-bold">Permanent Address</Label>
            <Input
              value={form.permanent_address}
              onChange={(e) => setForm({ ...form, permanent_address: e.target.value })}
              className="h-11 text-base mt-1"
              placeholder="Hometown / Permanent address"
            />
          </div>
        </div>

        <DialogFooter>
          <Button size="lg" className="h-11 text-base font-bold px-8" disabled={isSaving} onClick={handleSave}>
            {isSaving ? <Spinner className="size-5" /> : "Save Contact Info"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
