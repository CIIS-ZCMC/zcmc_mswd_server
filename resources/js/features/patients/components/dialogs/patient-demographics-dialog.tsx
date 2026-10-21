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

export const EDUCATIONAL_ATTAINMENT_OPTIONS = [
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

export const CIVIL_STATUS_OPTIONS = [
  "Single",
  "Married",
  "Widowed",
  "Separated",
  "Divorced",
  "Common-Law",
]

interface PatientDemographicsDialogProps {
  isOpen: boolean
  onClose: () => void
  patient: PatientRecord
  onSave: (payload: UpdatePatientBackgroundPayload) => void
  isSaving: boolean
}

export const PatientDemographicsDialog: React.FC<PatientDemographicsDialogProps> = ({
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
    educational_attainment: patient.educationalAttainment ?? "",
  }))

  useEffect(() => {
    if (isOpen) {
      setForm({
        religion: patient.religion ?? "",
        nationality: patient.nationality ?? "",
        civil_status: patient.civilStatus ?? "",
        place_of_birth: patient.placeOfBirth ?? "",
        educational_attainment: patient.educationalAttainment ?? "",
      })
    }
  }, [isOpen, patient])

  const handleSave = () => {
    onSave({
      religion: form.religion || undefined,
      nationality: form.nationality || undefined,
      civil_status: form.civil_status || undefined,
      place_of_birth: form.place_of_birth || undefined,
      educational_attainment: form.educational_attainment || undefined,
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full max-w-2xl p-7 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Edit Personal Demographics</DialogTitle>
          <DialogDescription className="text-sm">
            Update personal demographics for {patient.fullName}. Core identity information (name, birth date, sex) is managed via hospital records.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-4 text-base">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-bold">Religion</Label>
              <Input
                value={form.religion}
                onChange={(e) => setForm({ ...form, religion: e.target.value })}
                className="h-11 text-base mt-1"
                placeholder="e.g. Roman Catholic, Islam"
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

          <div>
            <Label className="text-sm font-bold">Place of Birth</Label>
            <Input
              value={form.place_of_birth}
              onChange={(e) => setForm({ ...form, place_of_birth: e.target.value })}
              className="h-11 text-base mt-1"
              placeholder="City / Municipality, Province"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            {isSaving ? <Spinner className="size-5" /> : "Save Demographics"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
