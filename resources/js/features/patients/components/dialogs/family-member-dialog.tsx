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
import { Briefcase, GraduationCap, Heart, Phone, User, Users } from "lucide-react"
import type { FamilyMember } from "../../types"

interface FamilyMemberDialogProps {
  isOpen: boolean
  onClose: () => void
  initialMember?: FamilyMember | null
  onAddFamilyMember: (member: Omit<FamilyMember, "id">) => void
  onUpdateFamilyMember?: (memberId: string, member: Omit<FamilyMember, "id">) => void
}

const RELATIONSHIP_OPTIONS = [
  "Spouse",
  "Child",
  "Father",
  "Mother",
  "Brother",
  "Sister",
  "Grandparent",
  "Relative",
  "In-law",
  "Other",
]

const CIVIL_STATUS_OPTIONS = [
  "Single",
  "Married",
  "Widowed",
  "Separated",
  "Common-law",
  "Other",
]

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

function computeAgeFromBirthdate(birthdateString: string): number | null {
  if (!birthdateString) return null
  const birthDate = new Date(birthdateString)
  if (isNaN(birthDate.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age >= 0 ? age : 0
}

function formatToYmdDate(dateStr?: string | null, age?: number): string {
  if (dateStr && dateStr.trim()) {
    const trimmed = dateStr.trim()
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.slice(0, 10)
    }
    const parsed = new Date(trimmed)
    if (!isNaN(parsed.getTime())) {
      const yyyy = parsed.getFullYear()
      const mm = String(parsed.getMonth() + 1).padStart(2, "0")
      const dd = String(parsed.getDate()).padStart(2, "0")
      return `${yyyy}-${mm}-${dd}`
    }
  }
  if (age && age > 0) {
    const estYear = new Date().getFullYear() - age
    return `${estYear}-01-01`
  }
  return ""
}

function inferSex(sex?: string | null, relationship?: string | null): string {
  if (sex && sex.trim()) {
    const lower = sex.trim().toLowerCase()
    if (lower === "m" || lower === "male") return "male"
    if (lower === "f" || lower === "female") return "female"
  }
  if (relationship && relationship.trim()) {
    const relLower = relationship.trim().toLowerCase()
    if (["husband", "father", "son", "brother", "grandfather", "uncle", "nephew"].some((r) => relLower.includes(r))) {
      return "male"
    }
    if (["wife", "mother", "daughter", "sister", "grandmother", "aunt", "niece"].some((r) => relLower.includes(r))) {
      return "female"
    }
  }
  return ""
}

export const FamilyMemberDialog: React.FC<FamilyMemberDialogProps> = ({
  isOpen,
  onClose,
  initialMember,
  onAddFamilyMember,
  onUpdateFamilyMember,
}) => {
  const isEditMode = Boolean(initialMember)
  const [newFamily, setNewFamily] = useState({
    fullName: "",
    relationship: "Child",
    birthdate: "",
    sex: "",
    civilStatus: "Single",
    age: 0,
    occupation: "",
    monthlyIncome: 0,
    educationalAttainment: "",
    contactNumber: "",
    isLivingWithPatient: true,
  })

  const civilStatusOptions = React.useMemo(() => {
    if (
      newFamily.civilStatus &&
      !CIVIL_STATUS_OPTIONS.some((opt) => opt.toLowerCase() === newFamily.civilStatus.toLowerCase())
    ) {
      return [...CIVIL_STATUS_OPTIONS, newFamily.civilStatus]
    }
    return CIVIL_STATUS_OPTIONS
  }, [newFamily.civilStatus])

  useEffect(() => {
    if (isOpen) {
      if (initialMember) {
        const normalizedSex = inferSex(initialMember.sex, initialMember.relationship)
        const formattedBirthdate = formatToYmdDate(initialMember.birthdate, initialMember.age)

        // Normalize relationship against options case-insensitively
        const matchRel = RELATIONSHIP_OPTIONS.find(
          (opt) => opt.toLowerCase() === (initialMember.relationship ?? "").toLowerCase()
        )

        // Normalize civil status against options case-insensitively
        const matchCivil = CIVIL_STATUS_OPTIONS.find(
          (opt) => opt.toLowerCase() === (initialMember.civilStatus ?? "").toLowerCase()
        )

        // Normalize educational attainment against options case-insensitively
        const matchEdu = EDUCATIONAL_ATTAINMENT_OPTIONS.find(
          (opt) => opt.toLowerCase() === (initialMember.educationalAttainment ?? "").toLowerCase()
        )

        setNewFamily({
          fullName: initialMember.fullName ?? "",
          relationship: matchRel || initialMember.relationship || "Child",
          birthdate: formattedBirthdate,
          sex: normalizedSex,
          civilStatus: matchCivil || initialMember.civilStatus || "Single",
          age: initialMember.age || (formattedBirthdate ? computeAgeFromBirthdate(formattedBirthdate) ?? 0 : 0),
          occupation: initialMember.occupation ?? "",
          monthlyIncome: initialMember.monthlyIncome ?? 0,
          educationalAttainment: matchEdu || initialMember.educationalAttainment || "",
          contactNumber: initialMember.contactNumber ?? "",
          isLivingWithPatient: initialMember.isLivingWithPatient ?? true,
        })
      } else {
        setNewFamily({
          fullName: "",
          relationship: "Child",
          birthdate: "",
          sex: "",
          civilStatus: "Single",
          age: 0,
          occupation: "",
          monthlyIncome: 0,
          educationalAttainment: "",
          contactNumber: "",
          isLivingWithPatient: true,
        })
      }
    }
  }, [isOpen, initialMember])

  const handleBirthdateChange = (dateVal: string) => {
    const calculatedAge = computeAgeFromBirthdate(dateVal)
    setNewFamily((prev) => ({
      ...prev,
      birthdate: dateVal,
      age: calculatedAge !== null ? calculatedAge : prev.age,
    }))
  }

  const handleSave = () => {
    if (!newFamily.fullName.trim()) return
    if (isEditMode && initialMember && onUpdateFamilyMember) {
      onUpdateFamilyMember(initialMember.id, newFamily)
    } else {
      onAddFamilyMember(newFamily)
    }
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full max-w-2xl p-7 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-3 border-b border-border/40">
          <DialogTitle className="text-2xl font-extrabold flex items-center gap-2.5">
            <Users className="size-6 text-primary" /> {isEditMode ? "Edit Family Member" : "Add Family Member"}
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground mt-1">
            {isEditMode
              ? `Update details for ${initialMember?.fullName}.`
              : "Register household member details and socio-economic relationship."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Section 1: Personal Demographics */}
          <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 border-b border-border/40 pb-2">
              <User className="size-5 text-primary" />
              <h4 className="text-lg font-bold text-foreground">1. Personal Demographics</h4>
            </div>

            <div>
              <Label className="text-[17px] font-bold text-foreground mb-1.5 block">Full Name *</Label>
              <Input
                placeholder="e.g. Maria San Juan"
                value={newFamily.fullName}
                onChange={(e) => setNewFamily({ ...newFamily, fullName: e.target.value })}
                className="h-12 text-base font-medium px-4"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-[17px] font-bold text-foreground mb-1.5 block">Sex</Label>
                <Select
                  value={newFamily.sex}
                  onValueChange={(val) => setNewFamily({ ...newFamily, sex: val ?? "" })}
                >
                  <SelectTrigger className="h-12 text-base font-medium px-4">
                    <SelectValue placeholder="Select Sex" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male" className="text-base py-2.5 font-medium">
                      Male
                    </SelectItem>
                    <SelectItem value="female" className="text-base py-2.5 font-medium">
                      Female
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[17px] font-bold text-foreground mb-1.5 block">Civil Status</Label>
                <Select
                  value={newFamily.civilStatus}
                  onValueChange={(val) => setNewFamily({ ...newFamily, civilStatus: val ?? "" })}
                >
                  <SelectTrigger className="h-12 text-base font-medium px-4">
                    <SelectValue placeholder="Civil Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {civilStatusOptions.map((status) => (
                      <SelectItem key={status} value={status} className="text-base py-2.5 font-medium">
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[17px] font-bold text-foreground mb-1.5 block">Birthdate</Label>
                <Input
                  type="date"
                  value={newFamily.birthdate}
                  onChange={(e) => handleBirthdateChange(e.target.value)}
                  className="h-12 text-base font-medium px-4"
                />
              </div>

              <div>
                <Label className="text-[17px] font-bold text-foreground mb-1.5 block">Age (Years)</Label>
                <Input
                  type="number"
                  placeholder="Age"
                  value={newFamily.age !== undefined && newFamily.age !== null ? newFamily.age : ""}
                  onChange={(e) =>
                    setNewFamily({ ...newFamily, age: parseInt(e.target.value) || 0 })
                  }
                  className="h-12 text-base font-medium px-4"
                />
                {newFamily.birthdate && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                    ✓ Auto-calculated
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Household Relationship & Dependency */}
          <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 border-b border-border/40 pb-2">
              <Heart className="size-5 text-primary" />
              <h4 className="text-lg font-bold text-foreground">2. Household &amp; Contact</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-[17px] font-bold text-foreground mb-1.5 block">Relationship</Label>
                <Select
                  value={newFamily.relationship}
                  onValueChange={(val) => setNewFamily({ ...newFamily, relationship: val ?? newFamily.relationship })}
                >
                  <SelectTrigger className="h-12 text-base font-medium px-4">
                    <SelectValue placeholder="Relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIP_OPTIONS.map((rel) => (
                      <SelectItem key={rel} value={rel} className="text-base py-2.5 font-medium">
                        {rel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[17px] font-bold text-foreground mb-1.5 flex items-center gap-2">
                  <Phone className="size-4.5 text-muted-foreground" /> Contact Number
                </Label>
                <Input
                  placeholder="e.g. 09171234567"
                  value={newFamily.contactNumber}
                  onChange={(e) => setNewFamily({ ...newFamily, contactNumber: e.target.value })}
                  className="h-12 text-base font-medium px-4"
                />
              </div>

              <div>
                <Label className="text-[17px] font-bold text-foreground mb-1.5 block">Living With Patient</Label>
                <Select
                  value={newFamily.isLivingWithPatient ? "yes" : "no"}
                  onValueChange={(val) => setNewFamily({ ...newFamily, isLivingWithPatient: val === "yes" })}
                >
                  <SelectTrigger className="h-12 text-base font-medium px-4">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes" className="text-base py-2.5 font-medium">
                      Yes
                    </SelectItem>
                    <SelectItem value="no" className="text-base py-2.5 font-medium">
                      No
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Section 3: Socio-Economic & Education Profile */}
          <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 border-b border-border/40 pb-2">
              <Briefcase className="size-5 text-primary" />
              <h4 className="text-lg font-bold text-foreground">3. Socio-Economic &amp; Education</h4>
            </div>

            <div>
              <Label className="text-[17px] font-bold text-foreground mb-1.5 flex items-center gap-2">
                <GraduationCap className="size-4.5 text-muted-foreground" /> Educational Attainment
              </Label>
              <Select
                value={newFamily.educationalAttainment}
                onValueChange={(val) => setNewFamily({ ...newFamily, educationalAttainment: val ?? "" })}
              >
                <SelectTrigger className="h-12 text-base font-medium px-4">
                  <SelectValue placeholder="Select Educational Attainment" />
                </SelectTrigger>
                <SelectContent>
                  {EDUCATIONAL_ATTAINMENT_OPTIONS.map((edu) => (
                    <SelectItem key={edu} value={edu} className="text-base py-2.5 font-medium">
                      {edu}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-[17px] font-bold text-foreground mb-1.5 block">Occupation</Label>
                <Input
                  placeholder="e.g. Student / Vendor / None"
                  value={newFamily.occupation}
                  onChange={(e) =>
                    setNewFamily({ ...newFamily, occupation: e.target.value })
                  }
                  className="h-12 text-base font-medium px-4"
                />
              </div>

              <div>
                <Label className="text-[17px] font-bold text-foreground mb-1.5 block">Monthly Income (₱)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={newFamily.monthlyIncome || ""}
                  onChange={(e) =>
                    setNewFamily({
                      ...newFamily,
                      monthlyIncome: parseInt(e.target.value) || 0,
                    })
                  }
                  className="h-12 text-base font-mono font-bold px-4"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-border/40">
          <Button
            size="lg"
            className="h-12 text-lg font-bold px-8 shadow-sm cursor-pointer"
            disabled={!newFamily.fullName.trim()}
            onClick={handleSave}
          >
            {isEditMode ? "Update Family Member" : "Save Family Member"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
