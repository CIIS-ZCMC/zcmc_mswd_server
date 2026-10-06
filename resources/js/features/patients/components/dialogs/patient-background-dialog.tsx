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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import type { UpdatePatientBackgroundPayload } from "../../api/patients-api"
import type { PatientRecord } from "../../types"

const EDUCATIONAL_ATTAINMENT_OPTIONS = [
  "No Formal Education",
  "Elementary Level",
  "Elementary Graduate",
  "High School Level",
  "High School Graduate",
  "Vocational / Technical",
  "College Level",
  "College Graduate",
  "Post-Graduate",
]

const CIVIL_STATUS_OPTIONS = [
  "Single",
  "Married",
  "Widowed",
  "Separated",
  "Divorced",
  "Common-Law",
]

interface PatientBackgroundDialogProps {
  isOpen: boolean
  onClose: () => void
  patient: PatientRecord
  onSave: (payload: UpdatePatientBackgroundPayload) => void
  isSaving: boolean
}

export const PatientBackgroundDialog: React.FC<PatientBackgroundDialogProps> = ({
  isOpen,
  onClose,
  patient,
  onSave,
  isSaving,
}) => {
  const [form, setForm] = useState(() => ({
    religion: patient.religion ?? "",
    nationality: patient.nationality ?? "",
    civil_status: patient.civilStatus ?? "",
    place_of_birth: patient.placeOfBirth ?? "",
    permanent_address: patient.permanentAddress ?? "",
    present_address: patient.presentAddress ?? "",
    educational_attainment: patient.educationalAttainment ?? "",
    occupation: patient.occupation ?? "",
    employer: patient.employer ?? "",
    monthly_income: patient.monthlyIncome != null ? String(patient.monthlyIncome) : "",
  }))

  useEffect(() => {
    if (isOpen) {
      setForm({
        religion: patient.religion ?? "",
        nationality: patient.nationality ?? "",
        civil_status: patient.civilStatus ?? "",
        place_of_birth: patient.placeOfBirth ?? "",
        permanent_address: patient.permanentAddress ?? "",
        present_address: patient.presentAddress ?? "",
        educational_attainment: patient.educationalAttainment ?? "",
        occupation: patient.occupation ?? "",
        employer: patient.employer ?? "",
        monthly_income: patient.monthlyIncome != null ? String(patient.monthlyIncome) : "",
      })
    }
  }, [isOpen, patient])

  const handleSave = () => {
    onSave({
      religion: form.religion || undefined,
      nationality: form.nationality || undefined,
      civil_status: form.civil_status || undefined,
      place_of_birth: form.place_of_birth || undefined,
      permanent_address: form.permanent_address || undefined,
      present_address: form.present_address || undefined,
      educational_attainment: form.educational_attainment || undefined,
      occupation: form.occupation || undefined,
      employer: form.employer || undefined,
      monthly_income: form.monthly_income ? Number(form.monthly_income) : undefined,
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full max-w-3xl p-7 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Edit Background &amp; Economic Profile</DialogTitle>
          <DialogDescription className="text-sm">
            Saved directly to {patient.fullName}&apos;s patient record.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4 text-base">
          {/* Section 1: Demographics */}
          <div className="space-y-3.5">
            <h4 className="font-bold text-sm uppercase tracking-wider text-primary border-b border-border/60 pb-1.5">
              Personal Demographics
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-bold">Religion</Label>
                <Input
                  value={form.religion}
                  onChange={(e) => setForm({ ...form, religion: e.target.value })}
                  className="h-11 text-base mt-1"
                  placeholder="e.g. Roman Catholic"
                />
              </div>
              <div>
                <Label className="text-sm font-bold">Nationality</Label>
                <Input
                  value={form.nationality}
                  onChange={(e) => setForm({ ...form, nationality: e.target.value })}
                  className="h-11 text-base mt-1"
                  placeholder="e.g. Filipino"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-bold">Place of Birth</Label>
                <Input
                  value={form.place_of_birth}
                  onChange={(e) => setForm({ ...form, place_of_birth: e.target.value })}
                  className="h-11 text-base mt-1"
                  placeholder="City / Municipality"
                />
              </div>
              <div>
                <Label className="text-sm font-bold">Civil Status</Label>
                <Select
                  value={form.civil_status}
                  onValueChange={(val) => setForm({ ...form, civil_status: val ?? "" })}
                >
                  <SelectTrigger className="w-full h-11 text-base mt-1">
                    <SelectValue placeholder="Select Civil Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {CIVIL_STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status} className="text-base py-2 font-medium">
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-bold">Educational Attainment</Label>
                <Select
                  value={form.educational_attainment}
                  onValueChange={(val) => setForm({ ...form, educational_attainment: val ?? "" })}
                >
                  <SelectTrigger className="w-full h-11 text-base mt-1">
                    <SelectValue placeholder="Select Educational Attainment" />
                  </SelectTrigger>
                  <SelectContent>
                    {EDUCATIONAL_ATTAINMENT_OPTIONS.map((edu) => (
                      <SelectItem key={edu} value={edu} className="text-base py-2 font-medium">
                        {edu}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Section 2: Residence & Addresses */}
          <div className="space-y-3.5">
            <h4 className="font-bold text-sm uppercase tracking-wider text-primary border-b border-border/60 pb-1.5">
              Residence &amp; Addresses
            </h4>
            <div>
              <Label className="text-sm font-bold">Present Address</Label>
              <Input
                value={form.present_address}
                onChange={(e) => setForm({ ...form, present_address: e.target.value })}
                className="h-11 text-base mt-1"
                placeholder="Current living address"
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

          {/* Section 3: Socio-Economic */}
          <div className="space-y-3.5">
            <h4 className="font-bold text-sm uppercase tracking-wider text-primary border-b border-border/60 pb-1.5">
              Socio-Economic &amp; Employment
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-bold">Occupation</Label>
                <Input
                  value={form.occupation}
                  onChange={(e) => setForm({ ...form, occupation: e.target.value })}
                  className="h-11 text-base mt-1"
                  placeholder="e.g. Driver, Farmer"
                />
              </div>
              <div>
                <Label className="text-sm font-bold">Employer</Label>
                <Input
                  value={form.employer}
                  onChange={(e) => setForm({ ...form, employer: e.target.value })}
                  className="h-11 text-base mt-1"
                  placeholder="Company / Self-employed"
                />
              </div>
              <div>
                <Label className="text-sm font-bold">Monthly Income (₱)</Label>
                <Input
                  type="number"
                  value={form.monthly_income}
                  onChange={(e) => setForm({ ...form, monthly_income: e.target.value })}
                  className="h-11 text-base mt-1 font-mono"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button size="lg" className="h-11 text-base font-bold px-8" disabled={isSaving} onClick={handleSave}>
            {isSaving ? <Spinner className="size-5" /> : "Save Profile Details"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
