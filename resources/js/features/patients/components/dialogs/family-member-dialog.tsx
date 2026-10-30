import React, { useEffect, useMemo, useState } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Heart,
  Phone,
  Plus,
  Trash2,
  User,
  UserRound,
  Users,
} from "lucide-react"
import type { FamilyMember } from "../../types"

type MemberForm = Omit<FamilyMember, "id"> & { civilStatus: string }

interface FamilyMemberDialogProps {
  isOpen: boolean
  onClose: () => void
  initialMember?: FamilyMember | null
  /** Drives the add flow: a married patient gets a Spouse step first. */
  patientCivilStatus?: string
  /** Spouse/Mother/Father already on file are shown, not asked again. */
  existingMembers?: FamilyMember[]
  onAddFamilyMember: (member: Omit<FamilyMember, "id">) => void
  onUpdateFamilyMember?: (
    memberId: string,
    member: Omit<FamilyMember, "id">
  ) => void
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

// Spouse, Mother and Father have their own steps in the add flow.
const OTHER_RELATIONSHIP_OPTIONS = RELATIONSHIP_OPTIONS.filter(
  (rel) => !["Spouse", "Mother", "Father"].includes(rel)
)

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

type StepKey = "spouse" | "mother" | "father" | "others"

const STEP_META: Record<
  StepKey,
  { label: string; relationship: string; description: string }
> = {
  spouse: {
    label: "Spouse",
    relationship: "Spouse",
    description: "The patient is married. Record the spouse's details first.",
  },
  mother: {
    label: "Mother",
    relationship: "Mother",
    description: "The patient's mother, living or not with the patient.",
  },
  father: {
    label: "Father",
    relationship: "Father",
    description: "The patient's father, living or not with the patient.",
  },
  others: {
    label: "Others",
    relationship: "Child",
    description: "Children, siblings and any other household members.",
  },
}

// A relationship already on file counts for its step (e.g. "Wife" → Spouse).
const STEP_ALIASES: Record<Exclude<StepKey, "others">, string[]> = {
  spouse: ["spouse", "husband", "wife"],
  mother: ["mother"],
  father: ["father"],
}

function isMarried(civilStatus?: string): boolean {
  const lower = (civilStatus ?? "").trim().toLowerCase()
  return lower === "married" || lower === "m"
}

function computeAgeFromBirthdate(birthdateString: string): number | null {
  if (!birthdateString) return null
  const birthDate = new Date(birthdateString)
  if (isNaN(birthDate.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
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
    if (
      [
        "husband",
        "father",
        "son",
        "brother",
        "grandfather",
        "uncle",
        "nephew",
      ].some((r) => relLower.includes(r))
    ) {
      return "male"
    }
    if (
      [
        "wife",
        "mother",
        "daughter",
        "sister",
        "grandmother",
        "aunt",
        "niece",
      ].some((r) => relLower.includes(r))
    ) {
      return "female"
    }
  }
  return ""
}

function emptyMember(relationship: string): MemberForm {
  return {
    fullName: "",
    relationship,
    birthdate: "",
    sex: inferSex(null, relationship),
    civilStatus: relationship === "Spouse" ? "Married" : "Single",
    age: 0,
    occupation: "",
    monthlyIncome: 0,
    educationalAttainment: "",
    contactNumber: "",
    isLivingWithPatient: true,
  }
}

function memberFromInitial(initialMember: FamilyMember): MemberForm {
  const formattedBirthdate = formatToYmdDate(
    initialMember.birthdate,
    initialMember.age
  )
  const match = (options: string[], value?: string) =>
    options.find((opt) => opt.toLowerCase() === (value ?? "").toLowerCase())

  return {
    fullName: initialMember.fullName ?? "",
    relationship:
      match(RELATIONSHIP_OPTIONS, initialMember.relationship) ||
      initialMember.relationship ||
      "Child",
    birthdate: formattedBirthdate,
    sex: inferSex(initialMember.sex, initialMember.relationship),
    civilStatus:
      match(CIVIL_STATUS_OPTIONS, initialMember.civilStatus) ||
      initialMember.civilStatus ||
      "Single",
    age:
      initialMember.age ||
      (formattedBirthdate
        ? (computeAgeFromBirthdate(formattedBirthdate) ?? 0)
        : 0),
    occupation: initialMember.occupation ?? "",
    monthlyIncome: initialMember.monthlyIncome ?? 0,
    educationalAttainment:
      match(
        EDUCATIONAL_ATTAINMENT_OPTIONS,
        initialMember.educationalAttainment
      ) ||
      initialMember.educationalAttainment ||
      "",
    contactNumber: initialMember.contactNumber ?? "",
    isLivingWithPatient: initialMember.isLivingWithPatient ?? true,
  }
}

const isFilled = (member: MemberForm) => member.fullName.trim() !== ""

const labelClass = "mb-1.5 block text-sm font-bold text-foreground"
const controlClass = "h-11 px-3 text-base font-medium"

interface MemberFieldsProps {
  value: MemberForm
  onChange: (next: MemberForm) => void
  /** Options for the relationship select; omit to lock the relationship. */
  relationshipOptions?: string[]
}

const MemberFields: React.FC<MemberFieldsProps> = ({
  value,
  onChange,
  relationshipOptions,
}) => {
  const set = <K extends keyof MemberForm>(key: K, val: MemberForm[K]) =>
    onChange({ ...value, [key]: val })

  const civilStatusOptions = useMemo(() => {
    if (
      value.civilStatus &&
      !CIVIL_STATUS_OPTIONS.some(
        (opt) => opt.toLowerCase() === value.civilStatus.toLowerCase()
      )
    ) {
      return [...CIVIL_STATUS_OPTIONS, value.civilStatus]
    }
    return CIVIL_STATUS_OPTIONS
  }, [value.civilStatus])

  const handleBirthdateChange = (dateVal: string) => {
    const calculatedAge = computeAgeFromBirthdate(dateVal)
    onChange({
      ...value,
      birthdate: dateVal,
      age: calculatedAge !== null ? calculatedAge : value.age,
    })
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div
          className={relationshipOptions ? "sm:col-span-2" : "sm:col-span-3"}
        >
          <Label className={labelClass}>Full Name *</Label>
          <Input
            placeholder="e.g. Maria San Juan"
            value={value.fullName}
            onChange={(e) => set("fullName", e.target.value)}
            className={controlClass}
          />
        </div>
        {relationshipOptions && (
          <div>
            <Label className={labelClass}>Relationship</Label>
            <Select
              value={value.relationship}
              onValueChange={(val) =>
                onChange({
                  ...value,
                  relationship: val ?? value.relationship,
                  sex: value.sex || inferSex(null, val),
                })
              }
            >
              <SelectTrigger className={cn(controlClass, "w-full")}>
                <SelectValue placeholder="Relationship" />
              </SelectTrigger>
              <SelectContent>
                {relationshipOptions.map((rel) => (
                  <SelectItem key={rel} value={rel} className="py-2 text-base">
                    {rel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div>
          <Label className={labelClass}>Sex</Label>
          <Select
            value={value.sex}
            onValueChange={(val) => set("sex", val ?? "")}
          >
            <SelectTrigger className={cn(controlClass, "w-full")}>
              <SelectValue placeholder="Select">
                {(val: string) =>
                  val ? val.charAt(0).toUpperCase() + val.slice(1) : "Select"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male" className="py-2 text-base">
                Male
              </SelectItem>
              <SelectItem value="female" className="py-2 text-base">
                Female
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className={labelClass}>Civil Status</Label>
          <Select
            value={value.civilStatus}
            onValueChange={(val) => set("civilStatus", val ?? "")}
          >
            <SelectTrigger className={cn(controlClass, "w-full")}>
              <SelectValue placeholder="Civil Status" />
            </SelectTrigger>
            <SelectContent>
              {civilStatusOptions.map((status) => (
                <SelectItem
                  key={status}
                  value={status}
                  className="py-2 text-base"
                >
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className={labelClass}>Birthdate</Label>
          <Input
            type="date"
            value={value.birthdate}
            onChange={(e) => handleBirthdateChange(e.target.value)}
            className={controlClass}
          />
        </div>
        <div>
          <Label className={labelClass}>Age (Years)</Label>
          <Input
            type="number"
            placeholder="Age"
            value={value.age ?? ""}
            onChange={(e) => set("age", parseInt(e.target.value) || 0)}
            className={controlClass}
          />
          {value.birthdate && (
            <p className="mt-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              ✓ From birthdate
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label className={cn(labelClass, "flex items-center gap-1.5")}>
            <Phone className="size-3.5 text-muted-foreground" /> Contact Number
          </Label>
          <Input
            placeholder="e.g. 09171234567"
            value={value.contactNumber}
            onChange={(e) => set("contactNumber", e.target.value)}
            className={controlClass}
          />
        </div>
        <div>
          <Label className={labelClass}>Living With Patient</Label>
          <div className="grid h-11 grid-cols-2 gap-1 rounded-lg border border-input p-1">
            {[
              { val: true, text: "Yes" },
              { val: false, text: "No" },
            ].map((opt) => (
              <button
                key={opt.text}
                type="button"
                onClick={() => set("isLivingWithPatient", opt.val)}
                className={cn(
                  "cursor-pointer rounded-md text-sm font-bold transition-colors",
                  value.isLivingWithPatient === opt.val
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {opt.text}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <Label className={labelClass}>Educational Attainment</Label>
          <Select
            value={value.educationalAttainment}
            onValueChange={(val) => set("educationalAttainment", val ?? "")}
          >
            <SelectTrigger className={cn(controlClass, "w-full")}>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {EDUCATIONAL_ATTAINMENT_OPTIONS.map((edu) => (
                <SelectItem key={edu} value={edu} className="py-2 text-base">
                  {edu}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className={labelClass}>Occupation</Label>
          <Input
            placeholder="e.g. Vendor / None"
            value={value.occupation}
            onChange={(e) => set("occupation", e.target.value)}
            className={controlClass}
          />
        </div>
        <div>
          <Label className={labelClass}>Monthly Income (₱)</Label>
          <Input
            type="number"
            placeholder="0.00"
            value={value.monthlyIncome || ""}
            onChange={(e) =>
              set("monthlyIncome", parseInt(e.target.value) || 0)
            }
            className={cn(controlClass, "font-mono font-bold")}
          />
        </div>
      </div>
    </div>
  )
}

export const FamilyMemberDialog: React.FC<FamilyMemberDialogProps> = ({
  isOpen,
  onClose,
  initialMember,
  patientCivilStatus,
  existingMembers = [],
  onAddFamilyMember,
  onUpdateFamilyMember,
}) => {
  const isEditMode = Boolean(initialMember)
  const [editForm, setEditForm] = useState<MemberForm>(() =>
    emptyMember("Child")
  )
  const [spouse, setSpouse] = useState<MemberForm>(() => emptyMember("Spouse"))
  const [mother, setMother] = useState<MemberForm>(() => emptyMember("Mother"))
  const [father, setFather] = useState<MemberForm>(() => emptyMember("Father"))
  const [others, setOthers] = useState<MemberForm[]>(() => [
    emptyMember("Child"),
  ])
  const [stepIndex, setStepIndex] = useState(0)

  const steps = useMemo<StepKey[]>(
    () =>
      isMarried(patientCivilStatus)
        ? ["spouse", "mother", "father", "others"]
        : ["mother", "father", "others"],
    [patientCivilStatus]
  )

  const onFile = (step: Exclude<StepKey, "others">) =>
    existingMembers.find((m) =>
      STEP_ALIASES[step].includes((m.relationship ?? "").trim().toLowerCase())
    )

  useEffect(() => {
    if (!isOpen) return
    if (initialMember) {
      setEditForm(memberFromInitial(initialMember))
      return
    }
    setSpouse(emptyMember("Spouse"))
    setMother(emptyMember("Mother"))
    setFather(emptyMember("Father"))
    setOthers([emptyMember("Child")])
    setStepIndex(0)
  }, [isOpen, initialMember])

  const single: Record<
    Exclude<StepKey, "others">,
    [MemberForm, (m: MemberForm) => void]
  > = {
    spouse: [spouse, setSpouse],
    mother: [mother, setMother],
    father: [father, setFather],
  }

  const stepCount = (step: StepKey) =>
    step === "others"
      ? others.filter(isFilled).length
      : isFilled(single[step][0])
        ? 1
        : 0

  const toSave = [
    ...steps.flatMap((step) =>
      step === "others" || onFile(step) ? [] : [single[step][0]]
    ),
    ...others,
  ].filter(isFilled)

  const handleSave = () => {
    if (isEditMode) {
      if (!isFilled(editForm) || !initialMember || !onUpdateFamilyMember) return
      onUpdateFamilyMember(initialMember.id, editForm)
    } else {
      if (toSave.length === 0) return
      toSave.forEach((member) => onAddFamilyMember(member))
    }
    onClose()
  }

  const currentStep = steps[stepIndex] ?? "others"
  const isLastStep = stepIndex === steps.length - 1

  const renderStep = (step: StepKey) => {
    if (step === "others") {
      return (
        <div className="space-y-4">
          {others.map((member, index) => (
            <div
              key={index}
              className="space-y-4 rounded-xl border border-border/60 bg-card p-4 shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-muted-foreground">
                  Member {index + 1}
                  {member.fullName.trim() && (
                    <span className="text-foreground">
                      {" "}
                      · {member.fullName}
                    </span>
                  )}
                </span>
                {others.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 cursor-pointer gap-1.5 text-destructive hover:bg-destructive/10"
                    onClick={() =>
                      setOthers((prev) => prev.filter((_, i) => i !== index))
                    }
                  >
                    <Trash2 className="size-4" /> Remove
                  </Button>
                )}
              </div>
              <MemberFields
                value={member}
                relationshipOptions={OTHER_RELATIONSHIP_OPTIONS}
                onChange={(next) =>
                  setOthers((prev) =>
                    prev.map((m, i) => (i === index ? next : m))
                  )
                }
              />
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full cursor-pointer gap-2 border-dashed font-bold"
            onClick={() => setOthers((prev) => [...prev, emptyMember("Child")])}
          >
            <Plus className="size-4" /> Add another member
          </Button>
        </div>
      )
    }

    const existing = onFile(step)
    if (existing) {
      return (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="font-bold text-foreground">
              {existing.fullName} is already on file as{" "}
              {existing.relationship.toLowerCase()}.
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Edit them from the family table. Continue to the next step.
            </p>
          </div>
        </div>
      )
    }

    const [value, setValue] = single[step]
    return <MemberFields value={value} onChange={setValue} />
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="border-b border-border/40 px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2.5 text-xl font-extrabold">
            <Users className="size-5 text-primary" />
            {isEditMode ? "Edit Family Member" : "Add Family Members"}
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted-foreground">
            {isEditMode
              ? `Update details for ${initialMember?.fullName}.`
              : isMarried(patientCivilStatus)
                ? "Record the spouse, then the mother and father, then other household members. Leave a step blank to skip it."
                : "Record the mother and father, then other household members. Leave a step blank to skip it."}
          </DialogDescription>
        </DialogHeader>

        {isEditMode ? (
          <div className="overflow-y-auto px-6 py-5">
            <MemberFields
              value={editForm}
              onChange={setEditForm}
              relationshipOptions={RELATIONSHIP_OPTIONS}
            />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col md:flex-row">
            <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-border/40 bg-muted/30 p-3 md:w-52 md:flex-col md:border-r md:border-b-0">
              {steps.map((step, index) => {
                const count = stepCount(step)
                const done =
                  step !== "others" && (Boolean(onFile(step)) || count > 0)
                const active = index === stepIndex
                return (
                  <button
                    key={step}
                    type="button"
                    onClick={() => setStepIndex(index)}
                    className={cn(
                      "flex shrink-0 cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors",
                      active
                        ? "bg-background text-foreground shadow-xs ring-1 ring-border"
                        : "text-muted-foreground hover:bg-background/60"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        done
                          ? "bg-emerald-600 text-white"
                          : active
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted-foreground/15"
                      )}
                    >
                      {done ? <CheckCircle2 className="size-4" /> : index + 1}
                    </span>
                    <span className="flex-1">{STEP_META[step].label}</span>
                    {step === "others" && count > 0 && (
                      <span className="rounded-full bg-primary/10 px-2 text-xs font-bold text-primary">
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <div className="mb-4 flex items-center gap-2.5">
                {currentStep === "spouse" ? (
                  <Heart className="size-5 text-primary" />
                ) : currentStep === "others" ? (
                  <Users className="size-5 text-primary" />
                ) : currentStep === "mother" ? (
                  <UserRound className="size-5 text-primary" />
                ) : (
                  <User className="size-5 text-primary" />
                )}
                <div>
                  <h4 className="text-lg font-bold text-foreground">
                    {currentStep === "others"
                      ? "Other Household Members"
                      : `${STEP_META[currentStep].label}'s Information`}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {STEP_META[currentStep].description}
                  </p>
                </div>
              </div>
              {renderStep(currentStep)}
            </div>
          </div>
        )}

        <DialogFooter className="m-0 flex-row items-center gap-2 border-t border-border/40 px-6 py-4 sm:justify-between">
          {isEditMode ? (
            <Button
              size="lg"
              className="ml-auto h-11 cursor-pointer px-6 font-bold"
              disabled={!isFilled(editForm)}
              onClick={handleSave}
            >
              Update Family Member
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                className="h-11 cursor-pointer gap-1.5 font-bold"
                disabled={stepIndex === 0}
                onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              >
                <ArrowLeft className="size-4" /> Back
              </Button>
              <div className="flex items-center gap-2">
                {!isLastStep && (
                  <Button
                    variant="outline"
                    className="h-11 cursor-pointer gap-1.5 font-bold"
                    onClick={() => setStepIndex((i) => i + 1)}
                  >
                    {currentStep !== "others" &&
                    !onFile(currentStep) &&
                    stepCount(currentStep) === 0
                      ? "Skip"
                      : "Next"}
                    <ArrowRight className="size-4" />
                  </Button>
                )}
                <Button
                  className="h-11 cursor-pointer px-6 font-bold"
                  disabled={toSave.length === 0}
                  onClick={handleSave}
                >
                  {toSave.length > 1
                    ? `Save ${toSave.length} Members`
                    : "Save Family Member"}
                </Button>
              </div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
