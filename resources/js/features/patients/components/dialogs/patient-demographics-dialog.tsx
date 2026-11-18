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
import { PsgcCityPicker } from "@/features/reference/components/psgc-address-fields"
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
    place_of_birth_city_code: patient.placeOfBirthCityCode ?? null,
    educational_attainment: patient.educationalAttainment ?? "",
  }))

  useEffect(() => {
    if (isOpen) {
      setForm({
        religion: patient.religion ?? "",
        nationality: patient.nationality ?? "",
        civil_status: patient.civilStatus ?? "",
        place_of_birth_city_code: patient.placeOfBirthCityCode ?? null,
        educational_attainment: patient.educationalAttainment ?? "",
      })
    }
  }, [isOpen, patient])

  const handleSave = () => {
    onSave({
      religion: form.religion || undefined,
      nationality: form.nationality || undefined,
      civil_status: form.civil_status || undefined,
      // Only when changed: a place still in free text is left alone.
      ...(form.place_of_birth_city_code !== (patient.placeOfBirthCityCode ?? null)
        ? { place_of_birth_city_code: form.place_of_birth_city_code }
        : {}),
      educational_attainment: form.educational_attainment || undefined,
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full max-w-2xl rounded-[20px] p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[18px] font-bold text-[#0c2a5b] dark:text-foreground">Edit Personal Demographics</DialogTitle>
          <DialogDescription className="text-[12px] text-[#5b6678] dark:text-muted-foreground">
            Update personal demographics for {patient.fullName}. Core identity information (name, birth date, sex) is managed via hospital records.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-3 text-[13px]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-[12px] font-semibold text-[#5b6678] dark:text-muted-foreground">Religion</Label>
              <Input
                value={form.religion}
                onChange={(e) => setForm({ ...form, religion: e.target.value })}
                className="h-[40px] text-[13px] font-medium text-[#1b2433] rounded-[10px] border-[#c6e8ee] mt-1 dark:text-foreground"
                placeholder="e.g. Roman Catholic, Islam"
              />
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-[#5b6678] dark:text-muted-foreground">Nationality</Label>
              <Input
                value={form.nationality}
                onChange={(e) => setForm({ ...form, nationality: e.target.value })}
                className="h-[40px] text-[13px] font-medium text-[#1b2433] rounded-[10px] border-[#c6e8ee] mt-1 dark:text-foreground"
                placeholder="e.g. Filipino"
              />
            </div>
          </div>

          <div>
            <Label className="text-[12px] font-semibold text-[#5b6678] dark:text-muted-foreground">Place of Birth</Label>
            <div className="mt-1">
              <PsgcCityPicker
                value={form.place_of_birth_city_code}
                onChange={(code) => setForm({ ...form, place_of_birth_city_code: code })}
                legacyText={patient.placeOfBirthCityCode ? undefined : patient.placeOfBirth}
                disabled={isSaving}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-[12px] font-semibold text-[#5b6678] dark:text-muted-foreground">Civil Status</Label>
              <Select
                value={form.civil_status}
                onValueChange={(val) => setForm({ ...form, civil_status: val ?? "" })}
              >
                <SelectTrigger className="w-full h-[40px] text-[13px] font-medium text-[#1b2433] rounded-[10px] border-[#c6e8ee] mt-1 dark:text-foreground">
                  <SelectValue placeholder="Select Civil Status" />
                </SelectTrigger>
                <SelectContent>
                  {CIVIL_STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status} className="text-[13px] py-1.5 font-medium">
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[12px] font-semibold text-[#5b6678] dark:text-muted-foreground">Educational Attainment</Label>
              <Select
                value={form.educational_attainment}
                onValueChange={(val) => setForm({ ...form, educational_attainment: val ?? "" })}
              >
                <SelectTrigger className="w-full h-[40px] text-[13px] font-medium text-[#1b2433] rounded-[10px] border-[#c6e8ee] mt-1 dark:text-foreground">
                  <SelectValue placeholder="Select Educational Attainment" />
                </SelectTrigger>
                <SelectContent>
                  {EDUCATIONAL_ATTAINMENT_OPTIONS.map((edu) => (
                    <SelectItem key={edu} value={edu} className="text-[13px] py-1.5 font-medium">
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
            {isSaving ? <Spinner className="size-4" /> : "Save Demographics"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
