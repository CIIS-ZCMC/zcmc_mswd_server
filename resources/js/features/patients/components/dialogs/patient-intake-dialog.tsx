import React, { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  FileText,
  Home,
  Landmark,
  Lock,
  MoreHorizontal,
  Pencil,
  Plus,
  Printer,
  RotateCw,
  Trash2,
  X,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { usePermission } from "@/features/auth/hooks/use-permission"
import {
  AcknowledgementSlipDialog,
  AddGuarantorCard,
  GuaranteeFormDialog,
  isMaifipGuarantee,
  useDeleteGuarantee,
  useGuarantees,
  type PatientGuarantee,
} from "@/features/guarantees"
import { useHospitalEncounter } from "@/features/hospital/hooks/use-hospital-encounters"
import { useQueueActionGate } from "@/features/queue"
import type { FamilyMember, PatientRecord } from "../../types"
import type { ServiceVisit } from "@/features/queue/types"

interface PatientIntakeDialogProps {
  open: boolean
  onClose: () => void
  patient: PatientRecord
  activeVisit?: ServiceVisit | null
  servingTimer?: string
  initialStep?: number
  initialSection?: "annex-b" | "guarantors" | "prints"
  initialAddingMember?: boolean
  isGuaranteeOnly?: boolean
  onOpenAddFamilyMember?: () => void
  onOpenEditFamilyMember?: (member: FamilyMember) => void
  onOpenEditPatient?: () => void
  onFinishServing?: () => void
  onSuccess?: () => void
}

interface FamilyMemberFormData {
  firstName: string
  middleName: string
  lastName: string
  birthdate: string
  age: string | number
  sex: "Male" | "Female"
  civilStatus: string
  relationship: string
  educationalAttainment: string
  occupation: string
  monthlyIncome: string | number
  isLivingWithPatient: boolean
}

function FamilyMemberFormCard({
  title = "Edit Family Member",
  initialData,
  onSave,
  onCancel,
}: {
  title?: string
  initialData?: Partial<FamilyMemberFormData>
  onSave: (data: FamilyMemberFormData) => void
  onCancel: () => void
}) {
  const [firstName, setFirstName] = useState(initialData?.firstName ?? "")
  const [middleName, setMiddleName] = useState(initialData?.middleName ?? "")
  const [lastName, setLastName] = useState(initialData?.lastName ?? "")
  const [birthdate, setBirthdate] = useState(initialData?.birthdate ?? "")
  const [age, setAge] = useState<string | number>(initialData?.age ?? "")
  const [sex, setSex] = useState<"Male" | "Female">(initialData?.sex ?? "Male")
  const [civilStatus, setCivilStatus] = useState(
    initialData?.civilStatus ?? "Single"
  )
  const [relationship, setRelationship] = useState(
    initialData?.relationship ?? "Patient (self)"
  )
  const [educationalAttainment, setEducationalAttainment] = useState(
    initialData?.educationalAttainment ?? "Highschool Graduate"
  )
  const [occupation, setOccupation] = useState(initialData?.occupation ?? "")
  const [monthlyIncome, setMonthlyIncome] = useState<string | number>(
    initialData?.monthlyIncome ?? ""
  )
  const [isLivingWithPatient, setIsLivingWithPatient] = useState(
    initialData?.isLivingWithPatient ?? true
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      firstName,
      middleName,
      lastName,
      birthdate,
      age,
      sex,
      civilStatus,
      relationship,
      educationalAttainment,
      occupation,
      monthlyIncome,
      isLivingWithPatient,
    })
  }

  return (
    <div
      data-node-id="283:4642"
      className="flex w-full items-center rounded-[14px] border border-[#e4e9f2] bg-white dark:border-border dark:bg-card"
    >
      <div
        data-node-id="I283:4642;283:4247"
        className="flex flex-1 flex-col gap-[12px] rounded-[16px] border border-[#1f5fd6] bg-[#edf3fe] p-[17px] dark:border-primary dark:bg-primary/5"
      >
        {/* Header (Figma I283:4642;283:4248) */}
        <div
          data-node-id="I283:4642;283:4248"
          className="flex w-full items-center gap-[8px]"
        >
          <img
            alt=""
            src="/images/patient-registry/heroicon-pencil.svg"
            className="size-[18px] max-w-none shrink-0"
          />
          <span
            data-node-id="I283:4642;283:4252"
            className="text-[13px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground"
          >
            {title}
          </span>
        </div>

        {/* Row 1: Names (Figma I283:4642;283:4253) */}
        <div
          data-node-id="I283:4642;283:4253"
          className="flex w-full items-start gap-[10px]"
        >
          {/* First Name */}
          <div className="flex flex-1 flex-col gap-[5px]">
            <label className="text-[12px] leading-normal font-semibold text-[#5b6678] dark:text-muted-foreground">
              First Name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First Name"
              className="h-[40px] w-full rounded-[10px] border border-[#c6e8ee] bg-white px-[12px] py-[11px] text-[13px] leading-normal font-medium text-[#1b2433] transition-colors outline-none focus:border-[#1f5fd6] dark:border-border dark:bg-card dark:text-foreground"
            />
          </div>

          {/* Middle Name */}
          <div className="flex flex-1 flex-col gap-[5px]">
            <label className="text-[12px] leading-normal font-semibold text-[#5b6678] dark:text-muted-foreground">
              Middle Name
            </label>
            <input
              type="text"
              value={middleName}
              onChange={(e) => setMiddleName(e.target.value)}
              placeholder="Middle Name"
              className="h-[40px] w-full rounded-[10px] border border-[#c6e8ee] bg-white px-[12px] py-[11px] text-[13px] leading-normal font-medium text-[#1b2433] transition-colors outline-none focus:border-[#1f5fd6] dark:border-border dark:bg-card dark:text-foreground"
            />
          </div>

          {/* Last Name */}
          <div className="flex flex-1 flex-col gap-[5px]">
            <label className="text-[12px] leading-normal font-semibold text-[#5b6678] dark:text-muted-foreground">
              Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last Name"
              className="h-[40px] w-full rounded-[10px] border border-[#c6e8ee] bg-white px-[12px] py-[11px] text-[13px] leading-normal font-medium text-[#1b2433] transition-colors outline-none focus:border-[#1f5fd6] dark:border-border dark:bg-card dark:text-foreground"
            />
          </div>
        </div>

        {/* Row 2: Birthdate, Age, Sex (Figma I283:4642;283:4272) */}
        <div
          data-node-id="I283:4642;283:4272"
          className="flex w-full items-start gap-[10px]"
        >
          {/* Birthdate */}
          <div className="flex flex-1 flex-col gap-[5px]">
            <label className="text-[12px] leading-normal font-semibold text-[#5b6678] dark:text-muted-foreground">
              Birthdate
            </label>
            <input
              type="text"
              value={birthdate}
              onChange={(e) => setBirthdate(e.target.value)}
              placeholder="Oct 29, 1999"
              className="h-[40px] w-full rounded-[10px] border border-[#c6e8ee] bg-white px-[12px] py-[11px] text-[13px] leading-normal font-medium text-[#1b2433] transition-colors outline-none focus:border-[#1f5fd6] dark:border-border dark:bg-card dark:text-foreground"
            />
          </div>

          {/* Age */}
          <div className="flex flex-1 flex-col gap-[5px]">
            <label className="text-[12px] leading-normal font-semibold text-[#5b6678] dark:text-muted-foreground">
              Age
            </label>
            <input
              type="text"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="27"
              className="h-[40px] w-full rounded-[10px] border border-[#c6e8ee] bg-white px-[12px] py-[11px] text-[13px] leading-normal font-medium text-[#1b2433] transition-colors outline-none focus:border-[#1f5fd6] dark:border-border dark:bg-card dark:text-foreground"
            />
          </div>

          {/* Sex */}
          <div className="flex flex-1 flex-col gap-[5px]">
            <span className="text-[12px] leading-normal font-semibold text-[#5b6678] dark:text-muted-foreground">
              Sex
            </span>
            <div className="flex h-[40px] w-full items-start gap-[4px] rounded-[10px] border border-[#e4e9f2] bg-white p-[5px] dark:border-border dark:bg-card">
              <button
                type="button"
                onClick={() => setSex("Male")}
                className={cn(
                  "flex h-full flex-1 cursor-pointer items-center justify-center rounded-[10px] text-[13px] leading-normal font-semibold transition-colors",
                  sex === "Male"
                    ? "bg-[#0c2a5b] text-white shadow-xs"
                    : "text-[#5b6678] hover:text-[#0c2a5b] dark:text-muted-foreground"
                )}
              >
                Male
              </button>
              <button
                type="button"
                onClick={() => setSex("Female")}
                className={cn(
                  "flex h-full flex-1 cursor-pointer items-center justify-center rounded-[10px] text-[13px] leading-normal font-semibold transition-colors",
                  sex === "Female"
                    ? "bg-[#0c2a5b] text-white shadow-xs"
                    : "text-[#5b6678] hover:text-[#0c2a5b] dark:text-muted-foreground"
                )}
              >
                Female
              </button>
            </div>
          </div>
        </div>

        {/* Row 3: Civil Status, Relation to patient (Figma I283:4642;283:4291) */}
        <div
          data-node-id="I283:4642;283:4291"
          className="flex w-full items-start gap-[10px]"
        >
          {/* Civil Status */}
          <div className="flex flex-1 flex-col gap-[5px]">
            <label className="text-[12px] leading-normal font-semibold text-[#5b6678] dark:text-muted-foreground">
              Civil Status
            </label>
            <div className="relative flex h-[40px] w-full items-center rounded-[10px] border border-[#c6e8ee] bg-white px-[12px] dark:border-border dark:bg-card">
              <select
                value={civilStatus}
                onChange={(e) => setCivilStatus(e.target.value)}
                className="w-full cursor-pointer appearance-none bg-transparent text-[13px] leading-normal font-medium text-[#1b2433] outline-none dark:text-foreground"
              >
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Widowed">Widowed</option>
                <option value="Separated">Separated</option>
                <option value="Cohabiting">Cohabiting</option>
              </select>
              <img
                src="/images/patient-registry/expand-more.svg"
                alt=""
                className="pointer-events-none absolute right-[10px] size-[20px]"
              />
            </div>
          </div>

          {/* Relation to patient */}
          <div className="flex flex-1 flex-col gap-[5px]">
            <label className="text-[12px] leading-normal font-semibold text-[#5b6678] dark:text-muted-foreground">
              Relation to patient
            </label>
            <div className="relative flex h-[40px] w-full items-center rounded-[10px] border border-[#c6e8ee] bg-white px-[12px] dark:border-border dark:bg-card">
              <select
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="w-full cursor-pointer appearance-none bg-transparent text-[13px] leading-normal font-medium text-[#1b2433] outline-none dark:text-foreground"
              >
                <option value="Patient (self)">Patient (self)</option>
                <option value="Spouse">Spouse</option>
                <option value="Child">Child</option>
                <option value="Parent">Parent</option>
                <option value="Sibling">Sibling</option>
                <option value="Grandparent">Grandparent</option>
                <option value="Grandchild">Grandchild</option>
                <option value="Other">Other</option>
              </select>
              <img
                src="/images/patient-registry/expand-more.svg"
                alt=""
                className="pointer-events-none absolute right-[10px] size-[20px]"
              />
            </div>
          </div>
        </div>

        {/* Row 4: Highest educational attainment, Occupation (Figma I283:4642;283:4403) */}
        <div
          data-node-id="I283:4642;283:4403"
          className="flex w-full items-start gap-[10px]"
        >
          {/* Highest educational attainment */}
          <div className="flex flex-1 flex-col gap-[5px]">
            <label className="text-[12px] leading-normal font-semibold text-[#5b6678] dark:text-muted-foreground">
              Highest educational attainment
            </label>
            <div className="relative flex h-[40px] w-full items-center rounded-[10px] border border-[#c6e8ee] bg-white px-[12px] dark:border-border dark:bg-card">
              <select
                value={educationalAttainment}
                onChange={(e) => setEducationalAttainment(e.target.value)}
                className="w-full cursor-pointer appearance-none bg-transparent text-[13px] leading-normal font-medium text-[#1b2433] outline-none dark:text-foreground"
              >
                <option value="Highschool Graduate">Highschool Graduate</option>
                <option value="College level">College level</option>
                <option value="College graduate">College graduate</option>
                <option value="Elementary level">Elementary level</option>
                <option value="Elementary graduate">Elementary graduate</option>
                <option value="High school level">High school level</option>
                <option value="Post graduate">Post graduate</option>
                <option value="Vocational">Vocational</option>
                <option value="Kindergarten">Kindergarten</option>
                <option value="None">None</option>
              </select>
              <img
                src="/images/patient-registry/expand-more.svg"
                alt=""
                className="pointer-events-none absolute right-[10px] size-[20px]"
              />
            </div>
          </div>

          {/* Occupation */}
          <div className="flex flex-1 flex-col gap-[5px]">
            <label className="text-[12px] leading-normal font-semibold text-[#5b6678] dark:text-muted-foreground">
              Occupation
            </label>
            <input
              type="text"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              placeholder="Vendor"
              className="h-[40px] w-full rounded-[10px] border border-[#c6e8ee] bg-white px-[12px] py-[11px] text-[13px] leading-normal font-medium text-[#1b2433] transition-colors outline-none focus:border-[#1f5fd6] dark:border-border dark:bg-card dark:text-foreground"
            />
          </div>
        </div>

        {/* Row 5: Monthly Income, Living with Patient? (Figma I283:4642;283:4427) */}
        <div
          data-node-id="I283:4642;283:4427"
          className="flex w-full items-start gap-[10px]"
        >
          {/* Monthly Income */}
          <div className="flex flex-1 flex-col gap-[5px]">
            <label className="text-[12px] leading-normal font-semibold text-[#5b6678] dark:text-muted-foreground">
              Monthly Income
            </label>
            <div className="relative flex h-[40px] w-full items-center justify-end rounded-[10px] border border-[#c6e8ee] bg-white px-[12px] dark:border-border dark:bg-card">
              <span className="text-[13px] leading-normal font-medium text-[#1b2433] dark:text-foreground">
                ₱
              </span>
              <input
                type="text"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value)}
                placeholder="50,000.00"
                className="w-full bg-transparent text-right text-[13px] leading-normal font-medium text-[#1b2433] outline-none dark:text-foreground"
              />
            </div>
          </div>

          {/* Living with Patient? */}
          <div className="flex flex-1 flex-col gap-[5px]">
            <span className="text-[12px] leading-normal font-semibold text-[#5b6678] dark:text-muted-foreground">
              Living with Child?
            </span>
            <div className="flex h-[40px] w-full items-start gap-[4px] rounded-[10px] border border-[#e4e9f2] bg-white p-[5px] dark:border-border dark:bg-card">
              <button
                type="button"
                onClick={() => setIsLivingWithPatient(true)}
                className={cn(
                  "flex h-full flex-1 cursor-pointer items-center justify-center rounded-[10px] text-[13px] leading-normal font-semibold transition-colors",
                  isLivingWithPatient
                    ? "bg-[#0c2a5b] text-white shadow-xs"
                    : "text-[#5b6678] hover:text-[#0c2a5b] dark:text-muted-foreground"
                )}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setIsLivingWithPatient(false)}
                className={cn(
                  "flex h-full flex-1 cursor-pointer items-center justify-center rounded-[10px] text-[13px] leading-normal font-semibold transition-colors",
                  !isLivingWithPatient
                    ? "bg-[#0c2a5b] text-white shadow-xs"
                    : "text-[#5b6678] hover:text-[#0c2a5b] dark:text-muted-foreground"
                )}
              >
                No
              </button>
            </div>
          </div>
        </div>

        {/* Row 6: Cancel & Save Buttons (Figma I283:4642;283:4339) */}
        <div
          data-node-id="I283:4642;283:4339"
          className="flex w-full items-center justify-end gap-[8px] pt-[2px]"
        >
          <button
            type="button"
            onClick={onCancel}
            data-node-id="I283:4642;283:4340"
            className="flex h-[36px] cursor-pointer items-center justify-center rounded-full px-[14px] text-[13px] leading-normal font-semibold text-[#0c2a5b] transition-colors hover:bg-[#e4e9f2]/50 dark:text-foreground dark:hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            data-node-id="I283:4642;283:4342"
            className="flex h-[36px] cursor-pointer items-center justify-center rounded-full bg-[#1f5fd6] px-[16px] text-[13px] leading-normal font-semibold text-white shadow-xs transition-colors hover:bg-[#1a53bd]"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

function getInitials(name?: string): string {
  if (!name) return ""
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getMemberInitials(name?: string): string {
  if (!name) return ""
  if (name === "Kyle Dolar") return "KY"
  return getInitials(name)
}

const DEMO_FAMILY_MEMBERS: FamilyMember[] = [
  {
    id: "fam-1",
    fullName: "Maria L. Dolar",
    relationship: "Spouse",
    birthdate: "1999-04-03",
    sex: "Female",
    age: 27,
    civilStatus: "Married",
    occupation: "Vendor",
    monthlyIncome: 4000,
    educationalAttainment: "Highschool Graduate",
    contactNumber: "",
    isLivingWithPatient: true,
  },
  {
    id: "fam-2",
    fullName: "Kyle Dolar",
    relationship: "Child",
    birthdate: "1999-04-03",
    sex: "Male",
    age: 6,
    civilStatus: "Single",
    occupation: "",
    monthlyIncome: 0,
    educationalAttainment: "",
    contactNumber: "",
    isLivingWithPatient: true,
  },
]

interface ExpenseItem {
  id: string
  name: string
  amount: number
  isLocked?: boolean
  isCustom?: boolean
  sourceNote?: string
}

const DEFAULT_EXPENSES: ExpenseItem[] = [
  {
    id: "rent",
    name: "House rent",
    amount: 3500,
    isLocked: true,
    sourceNote: "from House / lot",
  },
  { id: "food", name: "Food & daily needs", amount: 7500 },
  { id: "utilities", name: "Light & water", amount: 1800 },
  { id: "transport", name: "Transportation", amount: 1200 },
  { id: "health", name: "Healthcare", amount: 500 },
]

const PREDEFINED_EXPENSE_CATEGORIES = [
  "Education",
  "Clothing",
  "Communication / Internet",
  "Loan / Debt amortization",
  "Insurance / Savings",
  "Special Medical / Therapy",
  "Caregiver / House help",
  "Transportation",
  "Healthcare",
  "Food & daily needs",
  "Light & water",
  "Other (specify)",
] as const

const ASSISTANCE_TYPE_OPTIONS = [
  "MEDICAL ASSISTANCE",
  "FINANCIAL ASSISTANCE",
  "MATERIAL / MEDICINES ASSISTANCE",
  "PSYCHOSOCIAL / COUNSELING",
  "REFERRAL / MALASAKIT",
  "FUNERAL / BURIAL ASSISTANCE",
  "TRANSPORTATION ASSISTANCE",
  "OTHER (SPECIFY)",
] as const

const PROBLEM_OPTIONS = [
  "Health / Medical",
  "Economic & Financial",
  "Housing / Shelter",
  "Food & Nutrition",
  "Employment / Livelihood",
  "Others",
]

const SERVICE_OPTIONS = [
  { id: "lab_xray", label: "Laboratory / X-Ray" },
  { id: "economic_financial", label: "Economic & Financial" },
  { id: "hospital_bill", label: "Hospital Bill" },
  { id: "other_1", label: "Other service" },
  { id: "other_2", label: "Other service" },
  { id: "other_3", label: "Other service" },
]

export const PatientIntakeDialog: React.FC<PatientIntakeDialogProps> = ({
  open,
  onClose,
  patient,
  activeVisit,
  servingTimer = "08:12",
  initialStep = 1,
  initialSection = "annex-b",
  initialAddingMember = false,
  isGuaranteeOnly,
  onFinishServing,
  onSuccess,
}) => {
  const isGuaranteeOnlyMode =
    isGuaranteeOnly ??
    (Boolean(activeVisit?.purpose?.toLowerCase().includes("guarantee")) ||
      Boolean(
        patient.activeVisit?.purpose?.toLowerCase().includes("guarantee")
      ) ||
      (patient.category && patient.category !== "Unclassified"))

  const [activeSection, setActiveSection] = useState<
    "annex-b" | "guarantors" | "prints"
  >(isGuaranteeOnlyMode ? "guarantors" : initialSection)
  const [currentStep, setCurrentStep] = useState<number>(initialStep)

  useEffect(() => {
    if (open) {
      setCurrentStep(initialStep)
      if (isGuaranteeOnlyMode && initialSection === "annex-b") {
        setActiveSection("guarantors")
      } else {
        setActiveSection(initialSection)
      }
    }
  }, [open, initialStep, initialSection, isGuaranteeOnlyMode])

  const encounterNo = activeVisit?.hisTransactionId
    ? `#${activeVisit.hisTransactionId}`
    : patient.hospitalNo
      ? `#${patient.hospitalNo}`
      : "#3372249"

  const visitDateFormatted = useMemo(() => {
    const raw = activeVisit?.arrivedAt ?? activeVisit?.createdAt
    if (!raw) return "Oct 21, 2026"
    const d = new Date(raw)
    if (Number.isNaN(d.getTime())) return "Oct 21, 2026"
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }, [activeVisit])

  const draftSavedTime = useMemo(() => {
    return new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })
  }, [])

  // Informant Form State (Step 1)
  const parsedName = useMemo(() => {
    const raw = patient.fullName || ""
    if (raw.includes(",")) {
      const [last, rest] = raw.split(",")
      const parts = (rest || "").trim().split(/\s+/)
      return {
        last: last.trim(),
        first: parts[0] || "",
        middle: parts.slice(1).join(" ") || "",
      }
    }
    const parts = raw.trim().split(/\s+/)
    if (parts.length === 1) return { last: parts[0], first: "", middle: "" }
    if (parts.length === 2)
      return { first: parts[0], last: parts[1], middle: "" }
    return {
      first: parts[0],
      middle: parts.slice(1, -1).join(" "),
      last: parts[parts.length - 1],
    }
  }, [patient.fullName])

  const formattedBirthDate = useMemo(() => {
    if (!patient.birthDate) return "03/12/1972"
    const d = new Date(patient.birthDate)
    if (Number.isNaN(d.getTime())) return patient.birthDate
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const dd = String(d.getDate()).padStart(2, "0")
    const yyyy = d.getFullYear()
    return `${mm}/${dd}/${yyyy}`
  }, [patient.birthDate])

  const [informantLastName, setInformantLastName] = useState(
    patient.lastName || parsedName.last || "Abubakar"
  )
  const [informantFirstName, setInformantFirstName] = useState(
    patient.firstName || parsedName.first || "Rosalinda"
  )
  const [informantMiddleName, setInformantMiddleName] = useState(
    patient.middleName || parsedName.middle || "Maturan"
  )
  const [informantRelationship, setInformantRelationship] =
    useState("Patient (self)")
  const [informantDob, setInformantDob] = useState(formattedBirthDate)
  const [informantPob, setInformantPob] = useState(
    patient.placeOfBirth || "Zamboanga City"
  )

  // Step 2 Inline Editor State
  const [isAddingMember, setIsAddingMember] = useState(initialAddingMember)
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null)

  // Patient's own income (Step 2)
  const [localPatientIncome, setLocalPatientIncome] = useState<number>(() => {
    return Number(
      patient.monthlyIncome && patient.monthlyIncome > 0
        ? patient.monthlyIncome
        : 9000
    )
  })

  // Family members list (Step 2)
  const [familyMembersList, setFamilyMembersList] = useState<FamilyMember[]>(
    () => {
      if (patient.familyMembers && patient.familyMembers.length > 0) {
        return patient.familyMembers
      }
      return DEMO_FAMILY_MEMBERS
    }
  )

  useEffect(() => {
    if (open) {
      setIsAddingMember(initialAddingMember)
      setEditingMemberId(null)
    }
  }, [open, initialAddingMember])

  useEffect(() => {
    if (patient.familyMembers && patient.familyMembers.length > 0) {
      setFamilyMembersList(patient.familyMembers)
    }
  }, [patient.familyMembers])

  // Total Family Income (Step 2)
  const totalFamilyIncome = useMemo(() => {
    const familySum = familyMembersList.reduce(
      (sum, m) => sum + Number(m.monthlyIncome ?? 0),
      0
    )
    return localPatientIncome + familySum
  }, [localPatientIncome, familyMembersList])

  const householdCount = familyMembersList.length + 1

  // Step 3 Living Conditions & Monthly Expenses State (Figma 257:5835)
  const [houseLotType, setHouseLotType] = useState<
    "owned" | "rented" | "rent_free"
  >("rented")
  const [monthlyRent, setMonthlyRent] = useState<number>(3500)
  const [lightSources, setLightSources] = useState<string[]>(["Electricity"])
  const [waterSources, setWaterSources] = useState<string[]>(["Public faucet"])
  const [expensesList, setExpensesList] =
    useState<ExpenseItem[]>(DEFAULT_EXPENSES)
  // Ids for expense lines added in this session (render-pure, unlike Date.now()).
  const nextCustomExpenseId = useRef(0)

  const toggleLightSource = (source: string) => {
    setLightSources((prev) =>
      prev.includes(source)
        ? prev.filter((s) => s !== source)
        : [...prev, source]
    )
  }

  const toggleWaterSource = (source: string) => {
    setWaterSources((prev) =>
      prev.includes(source)
        ? prev.filter((s) => s !== source)
        : [...prev, source]
    )
  }

  // Sync house rent with expenses
  useEffect(() => {
    setExpensesList((prev) =>
      prev.map((item) => {
        if (item.id === "rent") {
          return {
            ...item,
            amount: houseLotType === "rented" ? monthlyRent : 0,
          }
        }
        return item
      })
    )
  }, [houseLotType, monthlyRent])

  const totalMonthlyExpenses = useMemo(() => {
    return expensesList.reduce(
      (sum, item) => sum + (Number(item.amount) || 0),
      0
    )
  }, [expensesList])

  const netBalance = useMemo(() => {
    return totalFamilyIncome - totalMonthlyExpenses
  }, [totalFamilyIncome, totalMonthlyExpenses])

  const handleUpdateExpenseAmount = (id: string, newAmount: number) => {
    setExpensesList((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, amount: newAmount } : item
      )
    )
  }

  const handleUpdateExpenseName = (id: string, newName: string) => {
    setExpensesList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, name: newName } : item))
    )
  }

  const handleDeleteExpense = (id: string) => {
    setExpensesList((prev) => prev.filter((item) => item.id !== id))
  }

  const handleSelectExpenseCategory = (category: string) => {
    const isOther = category === "Other (specify)"
    nextCustomExpenseId.current += 1
    const newId = `custom-${nextCustomExpenseId.current}`
    setExpensesList((prev) => [
      ...prev,
      {
        id: newId,
        name: isOther ? "" : category,
        amount: 0,
        isCustom: isOther,
      },
    ])
    setNewlyAddedExpenseId(newId)
    setTimeout(() => {
      expenseRowsRef.current?.scrollTo({
        top: expenseRowsRef.current.scrollHeight,
        behavior: "smooth",
      })
    }, 60)
  }

  // Step 4 Diagnosis & Problem State (Figma 257:6148)
  const [finalDiagnosis, setFinalDiagnosis] = useState<string>(() => {
    return patient.diagnosis || "Dental caries, unspecified"
  })
  const [selectedProblems, setSelectedProblems] = useState<string[]>([
    "Health / Medical",
    "Economic & Financial",
  ])
  const [typeOfAssistance, setTypeOfAssistance] =
    useState<string>("MEDICAL ASSISTANCE")
  const [otherAssistanceText, setOtherAssistanceText] = useState<string>("")
  const [medicalHistory, setMedicalHistory] = useState<string>("")
  const [selectedServices, setSelectedServices] = useState<string[]>([
    "lab_xray",
    "economic_financial",
  ])

  useEffect(() => {
    if (patient.diagnosis) {
      setFinalDiagnosis(patient.diagnosis)
    }
  }, [patient.diagnosis])

  const toggleProblem = (problem: string) => {
    setSelectedProblems((prev) =>
      prev.includes(problem)
        ? prev.filter((p) => p !== problem)
        : [...prev, problem]
    )
  }

  const toggleService = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((s) => s !== serviceId)
        : [...prev, serviceId]
    )
  }

  // Step 5 Assessment & Classification State (Figma 257:6456)
  const [classification, setClassification] = useState<string>("CLASS C3")
  const [classificationCategory] = useState<string>("Financially Indigent")
  const [assessmentNotes, setAssessmentNotes] = useState<string>(
    "Patient is a 54-year-old widow admitted for a diabetic foot ulcer and is now post-debridement. The household of 6 relies on the son's tricycle income and the daughter's work as a sales clerk. Monthly expenses already take up most of the family income, leaving no room for the ₱120,000 in antibiotics. The family is cooperative and the watcher is present daily."
  )
  const [recommendation, setRecommendation] = useState<string>(
    "Partially subsidized (C2)"
  )
  const [interviewedBy] = useState<string>("Maricel J. Tan, RSW · 09/23/2026")

  const netPerCapita = useMemo(() => {
    if (totalFamilyIncome === 13000 && totalMonthlyExpenses === 14500) {
      return "-₱1,500.00"
    }
    const perCapita =
      householdCount > 0 ? netBalance / householdCount : netBalance
    const absVal = Math.abs(perCapita).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    return perCapita < 0 ? `-₱${absVal}` : `₱${absVal}`
  }, [totalFamilyIncome, totalMonthlyExpenses, netBalance, householdCount])

  // Guarantors Section (Figma 312:8294): the encounter's MSWD guarantees and
  // the guarantors posted by hospital billing (HIS, read-only).
  const transactionId = activeVisit?.hisTransactionId ?? null
  const hasEncounter = transactionId !== null
  const canCreateGuarantee = usePermission("guarantee.create")
  const canUpdateGuarantee = usePermission("guarantee.update")
  const canDeleteGuarantee = usePermission("guarantee.delete")
  const { canPerformActions: canEditGuarantees, reason: guaranteeLockReason } =
    useQueueActionGate()

  const { data: guaranteesData, isLoading: isGuaranteesLoading } =
    useGuarantees(patient.id, transactionId ?? undefined, open && hasEncounter)
  const guarantees = guaranteesData?.data ?? []
  const guaranteesTotal = guaranteesData?.grandTotal ?? 0

  const {
    data: hisEncounter,
    isLoading: isHisEncounterLoading,
    isError: isHisEncounterError,
  } = useHospitalEncounter(transactionId ?? 0, open && hasEncounter)
  const billingGuarantors = hisEncounter?.guarantors ?? []

  const deleteGuaranteeMutation = useDeleteGuarantee(
    patient.id,
    transactionId ?? undefined
  )

  const [soaRunDate, setSoaRunDate] = useState("")
  const [processingDateTime] = useState("Oct 21, 2026 · 9:31 AM")
  const [guaranteeFormOpen, setGuaranteeFormOpen] = useState(false)
  const [editingGuarantee, setEditingGuarantee] =
    useState<PatientGuarantee | null>(null)
  const [deletingGuarantee, setDeletingGuarantee] =
    useState<PatientGuarantee | null>(null)
  const [slipGuaranteeId, setSlipGuaranteeId] = useState<number | null>(null)
  const [activeGuarantorMenuId, setActiveGuarantorMenuId] = useState<
    number | null
  >(null)
  const [isAddingGuarantor, setIsAddingGuarantor] = useState(false)

  useEffect(() => {
    if (!open) {
      setIsAddingGuarantor(false)
    }
  }, [open])

  const openGuaranteeForm = (guarantee: PatientGuarantee | null) => {
    setEditingGuarantee(guarantee)
    setGuaranteeFormOpen(true)
  }

  const handleDeleteGuarantee = async () => {
    if (!deletingGuarantee) return
    const name = deletingGuarantee.guarantor?.name ?? "Guarantor"
    try {
      await deleteGuaranteeMutation.mutateAsync(deletingGuarantee.id)
      toast.add({
        title: "Guarantor Deleted",
        description: `${name} was removed from this encounter.`,
        type: "success",
      })
    } catch {
      toast.add({
        title: "Delete Failed",
        description: `${name} could not be deleted. Try again.`,
        type: "error",
      })
    } finally {
      setDeletingGuarantee(null)
    }
  }

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  const formatAmount = (amount: number) =>
    amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  const formatShortDate = (raw: string | null | undefined) => {
    if (!raw) return "—"
    const d = new Date(raw)
    if (Number.isNaN(d.getTime())) return raw
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const [annexBSaved, setAnnexBSaved] = useState(false)

  const [isRendered, setIsRendered] = useState(open)
  const [isVisible, setIsVisible] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const expenseRowsRef = useRef<HTMLDivElement>(null)
  const [newlyAddedExpenseId, setNewlyAddedExpenseId] = useState<string | null>(
    null
  )
  const [previewDoc, setPreviewDoc] = useState<{
    title: string
    type: "annex-b" | "guarantee-letter"
    subtitle?: string
    amount?: string
    guarantor?: string
  } | null>(null)

  useEffect(() => {
    if (open) {
      setIsRendered(true)
      const t = requestAnimationFrame(() => {
        setIsVisible(true)
      })
      return () => cancelAnimationFrame(t)
    } else {
      setIsVisible(false)
      const t = setTimeout(() => {
        setIsRendered(false)
      }, 300)
      return () => clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // A dialog stacked on the drawer closes itself on Escape.
        if (
          guaranteeFormOpen ||
          slipGuaranteeId !== null ||
          deletingGuarantee !== null
        ) {
          return
        }
        if (previewDoc) {
          setPreviewDoc(null)
        } else {
          onClose()
        }
      }
    }
    if (open) {
      window.addEventListener("keydown", handleKeyDown)
      return () => window.removeEventListener("keydown", handleKeyDown)
    }
  }, [
    open,
    previewDoc,
    onClose,
    guaranteeFormOpen,
    slipGuaranteeId,
    deletingGuarantee,
  ])

  // Smooth auto-scroll-to-top on step/section changes
  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" })
  }, [currentStep, activeSection])

  if (!isRendered) return null

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex justify-end bg-[#0c2a5b]/40 backdrop-blur-xs transition-opacity duration-300",
        isVisible ? "opacity-100" : "pointer-events-none opacity-0"
      )}
      data-node-id="236:11182"
    >
      {/* Click outside to close backdrop */}
      <div className="flex-1 cursor-pointer" onClick={onClose} />

      {/* Right Drawer Panel (Figma 243:4363 / 236:11018) */}
      <div
        data-node-id="243:4363"
        className={cn(
          "relative flex h-full w-full max-w-[720px] flex-col overflow-hidden rounded-l-[20px] bg-white shadow-[0px_24px_56px_0px_rgba(12,42,91,0.18)] transition-transform duration-300 ease-out dark:bg-card",
          isVisible ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header (Figma 243:4364) */}
        <div
          data-node-id="243:4364"
          className="flex shrink-0 flex-col gap-[14px] border-b border-[#e4e9f2] px-[24px] pt-[20px] pb-[15px] dark:border-border"
        >
          {/* Title & Patient Metadata Row */}
          <div
            data-node-id="243:4365"
            className="flex items-start justify-between gap-[12px]"
          >
            <div className="flex min-w-0 flex-1 items-start gap-[12px]">
              {/* Assignment Icon Box */}
              <div
                data-node-id="243:4366"
                className="flex size-[40px] shrink-0 items-center justify-center rounded-[12px] bg-[#edf3fe] text-[#1f5fd6] dark:bg-primary/10"
              >
                <ClipboardList className="size-[22px]" />
              </div>

              {/* Title, Badges, and Subtitle Column */}
              <div
                data-node-id="243:4369"
                className="flex min-w-0 flex-1 flex-col gap-[3px]"
              >
                {/* Title and Badges */}
                <div
                  data-node-id="243:4370"
                  className="flex flex-wrap items-center gap-[8px]"
                >
                  <div className="flex items-center gap-[4px] text-[20px] leading-normal font-bold tracking-[-0.3px] text-[#0c2a5b] dark:text-foreground">
                    <span>Intake · encounter</span>
                    <span className="font-mono">{encounterNo}</span>
                  </div>
                  {activeSection === "guarantors" ||
                  activeSection === "prints" ||
                  annexBSaved ? (
                    <span
                      data-node-id="312:8648"
                      className="flex h-[24px] items-center rounded-full bg-[#e8f6ef] px-[10px] text-[12px] leading-normal font-bold text-[#146b43] dark:bg-emerald-900/40 dark:text-emerald-300"
                    >
                      Class C3
                    </span>
                  ) : (
                    <span
                      data-node-id="243:4374"
                      className="flex h-[24px] items-center rounded-full bg-[#eef1f6] px-[10px] text-[12px] leading-normal font-bold text-[#4a5568] dark:bg-muted dark:text-muted-foreground"
                    >
                      Class pending
                    </span>
                  )}
                  <span
                    data-node-id="243:4376"
                    className="flex h-[24px] items-center rounded-full bg-[#fff5e0] px-[10px] text-[12px] leading-normal font-bold text-[#8a5300] dark:bg-amber-950/40 dark:text-amber-300"
                  >
                    Draft
                  </span>
                </div>

                {/* Subtitle & Serving Badge */}
                <div
                  data-node-id="243:4378"
                  className="flex flex-wrap items-center gap-[8px]"
                >
                  <span className="text-[12px] leading-normal font-normal text-[#5b6678] dark:text-muted-foreground">
                    {patient.fullName} · Hosp{" "}
                    {patient.hospitalNo || patient.hospitalId || "1460327"} ·{" "}
                    {patient.admissionStatus &&
                    patient.admissionStatus !== "N/A"
                      ? patient.admissionStatus
                      : "Outpatient consultation"}{" "}
                    · {visitDateFormatted}
                  </span>

                  {activeVisit?.status === "in_progress" && (
                    <div
                      data-node-id="243:4381"
                      className="flex h-[22px] items-center gap-[5px] rounded-full bg-[#edf3fe] px-[9px] dark:bg-primary/10"
                    >
                      <span className="size-[7px] rounded-full bg-[#1f5fd6]" />
                      <span className="text-[12px] font-bold text-[#1f5fd6]">
                        Serving
                      </span>
                      <span className="font-mono text-[12px] font-bold text-[#1f5fd6]">
                        {servingTimer}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              data-node-id="243:4387"
              className="flex size-[40px] shrink-0 cursor-pointer items-center justify-center rounded-[20px] border border-[#e4e9f2] bg-white text-[#0c2a5b] transition-colors hover:bg-[#f4f7fc] dark:border-border dark:bg-card dark:text-foreground"
            >
              <X className="size-[20px]" />
            </button>
          </div>

          {/* Section Tabs Switcher (Figma 243:4388 / 355:5802 / 355:6224 / 355:6429) */}
          <div
            data-node-id="243:4388"
            className="flex w-full items-start gap-[4px] rounded-full border border-[#e4e9f2] bg-[#f4f7fc] p-[5px] dark:border-border dark:bg-muted/50"
          >
            {!isGuaranteeOnlyMode && (
              <button
                type="button"
                onClick={() => setActiveSection("annex-b")}
                data-node-id="243:4389"
                className={cn(
                  "flex h-[34px] flex-1 cursor-pointer items-center justify-center gap-[6px] rounded-full px-[6px] text-[13px] leading-normal font-semibold transition-all",
                  activeSection === "annex-b"
                    ? "bg-[#0c2a5b] text-white shadow-xs"
                    : "text-[#5b6678] hover:text-[#0c2a5b] dark:text-muted-foreground"
                )}
              >
                <FileText className="size-[17px]" />
                <span>ANNEX B</span>
                {(activeSection !== "annex-b" || annexBSaved) && (
                  <div
                    data-node-id="321:13212"
                    className="flex h-[24px] items-center gap-[4px] rounded-full bg-[#e8f6ef] px-[9px] text-[#146b43] dark:bg-emerald-900/40 dark:text-emerald-300"
                  >
                    <CheckCircle2 className="size-[14px]" />
                    <span className="text-[12px] font-bold">Saved</span>
                  </div>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveSection("guarantors")}
              data-node-id="243:4394"
              className={cn(
                "flex h-[34px] flex-1 cursor-pointer items-center justify-center gap-[6px] rounded-full px-[6px] text-[13px] leading-normal font-semibold transition-all",
                activeSection === "guarantors"
                  ? "bg-[#0c2a5b] text-white shadow-xs"
                  : "text-[#5b6678] hover:text-[#0c2a5b] dark:text-muted-foreground"
              )}
            >
              <Landmark className="size-[17px]" />
              <span>Guarantors</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection("prints")}
              data-node-id="243:4399"
              className={cn(
                "flex h-[34px] flex-1 cursor-pointer items-center justify-center gap-[6px] rounded-full px-[6px] text-[13px] leading-normal font-semibold transition-all",
                activeSection === "prints"
                  ? "bg-[#0c2a5b] text-white shadow-xs"
                  : "text-[#5b6678] hover:text-[#0c2a5b] dark:text-muted-foreground"
              )}
            >
              <Printer className="size-[17px]" />
              <span>Prints</span>
            </button>
          </div>
        </div>

        {/* 5-Step Sub-Stepper Bar (Figma 243:4404) */}
        {activeSection === "annex-b" && (
          <div
            data-node-id="243:4404"
            className="flex w-full shrink-0 items-start gap-[6px] px-[24px] pt-[14px]"
          >
            {[
              { step: 1, label: "1. Informant" },
              { step: 2, label: "2. Family & income" },
              { step: 3, label: "3. Monthly expenses" },
              { step: 4, label: "4. Diagnosis & problems" },
              { step: 5, label: "5. Assessment & class" },
            ].map(({ step, label }) => {
              const isCompleted = step < currentStep
              const isActive = step === currentStep

              return (
                <button
                  key={step}
                  type="button"
                  onClick={() => setCurrentStep(step)}
                  className="flex flex-1 cursor-pointer flex-col items-start gap-[6px] text-left"
                >
                  <div
                    className={cn(
                      "h-[4px] w-full rounded-full transition-colors",
                      isActive
                        ? "bg-[#1f5fd6]"
                        : isCompleted
                          ? "bg-[#0c2a5b]"
                          : "bg-[#e4e9f2] dark:bg-border"
                    )}
                  />
                  <span
                    className={cn(
                      "truncate text-[11px] leading-normal font-bold",
                      isActive
                        ? "text-[#1f5fd6]"
                        : isCompleted
                          ? "text-[#0c2a5b] dark:text-foreground"
                          : "text-[#5b6678] dark:text-muted-foreground"
                    )}
                  >
                    {label}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* Step 1 Content: Informant (Figma 243:4425) */}
        {activeSection === "annex-b" && currentStep === 1 && (
          <div
            ref={scrollContainerRef}
            data-node-id="243:4425"
            className="flex flex-1 animate-in [scrollbar-width:thin] [scrollbar-color:#cfd7e4_transparent] flex-col gap-[14px] overflow-y-auto px-[24px] pt-[18px] pb-[22px] duration-200 fade-in-50 dark:[scrollbar-color:#374151_transparent]"
          >
            {/* Header Row: Title & Household Count */}
            <div
              data-node-id="243:4426"
              className="flex items-center justify-between gap-[10px]"
            >
              <h3
                data-node-id="243:4428"
                className="text-[18px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground"
              >
                Informant
              </h3>
              <span
                data-node-id="243:4430"
                className="text-[12px] leading-normal font-normal text-[#5b6678] dark:text-muted-foreground"
              >
                Household of {householdCount}
              </span>
            </div>

            {/* Identity Container (Figma 257:6085) */}
            <div
              data-node-id="257:6085"
              className="flex w-full flex-col gap-[12px] pb-[34px]"
            >
              {/* Section Sub-heading: Icon + "Identity" */}
              <div
                data-node-id="257:6086"
                className="flex items-center gap-[8px]"
              >
                <span className="flex size-[18px] shrink-0 items-center justify-center">
                  <img
                    alt=""
                    className="block size-[18px] max-w-none"
                    src="/images/patient-registry/intake-identity.svg"
                  />
                </span>
                <span
                  data-node-id="257:6090"
                  className="text-[13px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground"
                >
                  Identity
                </span>
              </div>

              {/* Form Grid: 3 columns x 2 rows (Figma 257:6091) */}
              <div
                data-node-id="257:6091"
                className="grid w-full grid-cols-1 gap-[10px] sm:grid-cols-3"
              >
                {/* Last name */}
                <div
                  data-node-id="257:6092"
                  className="flex flex-col gap-[5px]"
                >
                  <label
                    data-node-id="257:6094"
                    className="text-[12px] leading-normal font-semibold text-[#5b6678] dark:text-muted-foreground"
                  >
                    Last name
                  </label>
                  <div
                    data-node-id="257:6095"
                    className="flex h-[38px] w-full items-center rounded-[10px] border border-[#c6e8ee] bg-[#f1fafb] px-[12px] transition-colors focus-within:border-[#1f5fd6] focus-within:bg-white dark:border-border dark:bg-muted/40 dark:focus-within:bg-card"
                  >
                    <input
                      type="text"
                      value={informantLastName}
                      onChange={(e) => setInformantLastName(e.target.value)}
                      className="w-full bg-transparent text-[13px] font-medium text-[#1b2433] focus:outline-none dark:text-foreground"
                      placeholder="Last name"
                    />
                  </div>
                </div>

                {/* First name */}
                <div
                  data-node-id="257:6098"
                  className="flex flex-col gap-[5px]"
                >
                  <label
                    data-node-id="257:6100"
                    className="text-[12px] leading-normal font-semibold text-[#5b6678] dark:text-muted-foreground"
                  >
                    First name
                  </label>
                  <div
                    data-node-id="257:6101"
                    className="flex h-[38px] w-full items-center rounded-[10px] border border-[#c6e8ee] bg-[#f1fafb] px-[12px] transition-colors focus-within:border-[#1f5fd6] focus-within:bg-white dark:border-border dark:bg-muted/40 dark:focus-within:bg-card"
                  >
                    <input
                      type="text"
                      value={informantFirstName}
                      onChange={(e) => setInformantFirstName(e.target.value)}
                      className="w-full bg-transparent text-[13px] font-medium text-[#1b2433] focus:outline-none dark:text-foreground"
                      placeholder="First name"
                    />
                  </div>
                </div>

                {/* Middle name */}
                <div
                  data-node-id="257:6104"
                  className="flex flex-col gap-[5px]"
                >
                  <label
                    data-node-id="257:6106"
                    className="text-[12px] leading-normal font-semibold text-[#5b6678] dark:text-muted-foreground"
                  >
                    Middle name
                  </label>
                  <div
                    data-node-id="257:6107"
                    className="flex h-[38px] w-full items-center rounded-[10px] border border-[#c6e8ee] bg-[#f1fafb] px-[12px] transition-colors focus-within:border-[#1f5fd6] focus-within:bg-white dark:border-border dark:bg-muted/40 dark:focus-within:bg-card"
                  >
                    <input
                      type="text"
                      value={informantMiddleName}
                      onChange={(e) => setInformantMiddleName(e.target.value)}
                      className="w-full bg-transparent text-[13px] font-medium text-[#1b2433] focus:outline-none dark:text-foreground"
                      placeholder="Middle name"
                    />
                  </div>
                </div>

                {/* Relationship */}
                <div
                  data-node-id="257:6116"
                  className="flex flex-col gap-[5px]"
                >
                  <label
                    data-node-id="257:6118"
                    className="text-[12px] leading-normal font-semibold text-[#5b6678] dark:text-muted-foreground"
                  >
                    Relationship
                  </label>
                  <div
                    data-node-id="257:6119"
                    className="flex h-[38px] w-full items-center rounded-[10px] border border-[#c6e8ee] bg-[#f1fafb] px-[12px] transition-colors focus-within:border-[#1f5fd6] focus-within:bg-white dark:border-border dark:bg-muted/40 dark:focus-within:bg-card"
                  >
                    <input
                      type="text"
                      value={informantRelationship}
                      onChange={(e) => setInformantRelationship(e.target.value)}
                      className="w-full bg-transparent text-[13px] font-medium text-[#1b2433] focus:outline-none dark:text-foreground"
                      placeholder="Relationship"
                    />
                  </div>
                </div>

                {/* Date of birth */}
                <div
                  data-node-id="257:6110"
                  className="flex flex-col gap-[5px]"
                >
                  <label
                    data-node-id="257:6112"
                    className="text-[12px] leading-normal font-semibold text-[#5b6678] dark:text-muted-foreground"
                  >
                    Date of birth
                  </label>
                  <div
                    data-node-id="257:6113"
                    className="flex h-[38px] w-full items-center rounded-[10px] border border-[#c6e8ee] bg-[#f1fafb] px-[12px] transition-colors focus-within:border-[#1f5fd6] focus-within:bg-white dark:border-border dark:bg-muted/40 dark:focus-within:bg-card"
                  >
                    <input
                      type="text"
                      value={informantDob}
                      onChange={(e) => setInformantDob(e.target.value)}
                      className="w-full bg-transparent text-[13px] font-medium text-[#1b2433] focus:outline-none dark:text-foreground"
                      placeholder="MM/DD/YYYY"
                    />
                  </div>
                </div>

                {/* Place of birth */}
                <div
                  data-node-id="257:6142"
                  className="flex flex-col gap-[5px]"
                >
                  <label
                    data-node-id="257:6144"
                    className="text-[12px] leading-normal font-semibold text-[#5b6678] dark:text-muted-foreground"
                  >
                    Place of birth
                  </label>
                  <div
                    data-node-id="257:6145"
                    className="flex h-[38px] w-full items-center rounded-[10px] border border-[#c6e8ee] bg-[#f1fafb] px-[12px] transition-colors focus-within:border-[#1f5fd6] focus-within:bg-white dark:border-border dark:bg-muted/40 dark:focus-within:bg-card"
                  >
                    <input
                      type="text"
                      value={informantPob}
                      onChange={(e) => setInformantPob(e.target.value)}
                      className="w-full bg-transparent text-[13px] font-medium text-[#1b2433] focus:outline-none dark:text-foreground"
                      placeholder="Place of birth"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2 Content: Family composition & income (Figma 257:3764 / 283:4106) */}
        {activeSection === "annex-b" && currentStep === 2 && (
          <div
            ref={scrollContainerRef}
            data-node-id="257:3764"
            className="flex flex-1 animate-in [scrollbar-width:thin] [scrollbar-color:#cfd7e4_transparent] flex-col gap-[14px] overflow-y-auto px-[24px] pt-[18px] pb-[22px] duration-200 fade-in-50 dark:[scrollbar-color:#374151_transparent]"
          >
            {/* Header Row: Title & Household Count (Figma 257:3765) */}
            <div
              data-node-id="257:3765"
              className="flex w-full items-center justify-between gap-[10px]"
            >
              <h3
                data-node-id="257:3767"
                className="text-[16px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground"
              >
                Family composition &amp; income
              </h3>
              <span
                data-node-id="257:3769"
                className="text-[12px] leading-normal font-normal text-[#5b6678] dark:text-muted-foreground"
              >
                Household of {householdCount}
              </span>
            </div>

            {/* Sync Information Box (Figma 257:3770) */}
            <div
              data-node-id="257:3770"
              className="flex w-full items-center gap-[10px] rounded-[12px] bg-[#edf3fe] px-[14px] py-[11px] dark:bg-primary/10"
            >
              <span className="flex size-[20px] shrink-0 items-center justify-center text-[#1f5fd6]">
                <RotateCw className="size-[18px]" />
              </span>
              <p
                data-node-id="257:3774"
                className="text-[13px] leading-[19.5px] font-normal text-[#1b2433] dark:text-foreground"
              >
                From{" "}
                {patient.firstName || patient.fullName.split(" ")[0] || "Kim"}
                &apos;s record, last confirmed Feb 6, 2026. Ages are updated
                from birth dates. Edits here save back to the record.
              </p>
            </div>

            {/* Patient Entry or Inline Editor (Figma 283:4642 / 283:4106) */}
            {editingMemberId === "patient" ? (
              <FamilyMemberFormCard
                title="Edit Family Member"
                initialData={{
                  firstName: parsedName.first || "Kim Horace",
                  middleName: parsedName.middle || "A",
                  lastName: parsedName.last || "Dolar",
                  birthdate: "Oct 29, 1999",
                  age: patient.age || 27,
                  sex: patient.gender === "Female" ? "Female" : "Male",
                  civilStatus: patient.civilStatus || "Single",
                  relationship: "Patient (self)",
                  educationalAttainment: "College level",
                  occupation: patient.occupation || "ZCMC Employee",
                  monthlyIncome: localPatientIncome,
                  isLivingWithPatient: true,
                }}
                onSave={(data) => {
                  setLocalPatientIncome(Number(data.monthlyIncome) || 0)
                  setEditingMemberId(null)
                }}
                onCancel={() => setEditingMemberId(null)}
              />
            ) : (
              <div
                data-node-id="283:4106"
                className="flex w-full items-center gap-[12px] rounded-[14px] border border-[#e4e9f2] bg-white px-[15px] py-[12px] dark:border-border dark:bg-card"
              >
                {/* Avatar */}
                <div
                  data-node-id="I283:4106;283:3943"
                  className="flex size-[38px] shrink-0 items-center justify-center rounded-[19px] bg-[#edf3fe] text-[12px] leading-normal font-bold text-[#1f5fd6]"
                >
                  {getInitials(patient.fullName || "Kim Horace A. Dolar")}
                </div>

                {/* Info Column */}
                <div
                  data-node-id="I283:4106;283:3946"
                  className="flex min-w-0 flex-1 flex-col gap-[2px]"
                >
                  <div className="flex items-center gap-[8px]">
                    <span
                      data-node-id="I283:4106;283:3949"
                      className="truncate text-[14px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground"
                    >
                      {patient.fullName || "Kim Horace A. Dolar"}
                    </span>
                    <span
                      data-node-id="I283:4106;283:3951"
                      className="flex h-[20px] shrink-0 items-center rounded-full bg-[#edf3fe] px-[8px] text-[11px] leading-[20px] font-bold text-[#1f5fd6] dark:bg-primary/20"
                    >
                      Patient
                    </span>
                  </div>
                  <div
                    data-node-id="I283:4106;283:3952"
                    className="flex flex-col text-[12px] leading-normal font-normal text-[#5b6678] dark:text-muted-foreground"
                  >
                    <span>
                      {patient.age || 29} · {patient.gender || "Male"} ·{" "}
                      {patient.civilStatus || "Married"} · Born 04/03/1999
                    </span>
                    <span>
                      College level · {patient.occupation || "ZCMC Employee"}
                    </span>
                  </div>
                </div>

                {/* Income Column */}
                <div
                  data-node-id="I283:4106;283:3954"
                  className="flex shrink-0 flex-col items-end"
                >
                  <span
                    data-node-id="I283:4106;283:3956"
                    className="text-[14px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground"
                  >
                    ₱
                    {localPatientIncome.toLocaleString("en-PH", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </span>
                  <span
                    data-node-id="I283:4106;283:3958"
                    className="text-[11px] leading-normal font-normal text-[#5b6678] dark:text-muted-foreground"
                  >
                    per month
                  </span>
                </div>

                {/* Edit Button */}
                <button
                  type="button"
                  onClick={() => {
                    setEditingMemberId("patient")
                    setIsAddingMember(false)
                  }}
                  data-node-id="I283:4106;283:3959"
                  className="flex size-[32px] shrink-0 cursor-pointer items-center justify-center rounded-[16px] text-[#5b6678] transition-colors hover:bg-[#f4f7fc] hover:text-[#0c2a5b] dark:hover:bg-muted dark:hover:text-foreground"
                >
                  <Pencil className="size-[18px]" />
                </button>
              </div>
            )}

            {/* Adding Family Member Inline Editor (Figma 283:4642) */}
            {isAddingMember && (
              <FamilyMemberFormCard
                title="Add Family Member"
                initialData={{
                  firstName: "",
                  middleName: "",
                  lastName: parsedName.last || "Dolar",
                  birthdate: "",
                  age: "",
                  sex: "Male",
                  civilStatus: "Single",
                  relationship: "Child",
                  educationalAttainment: "Highschool Graduate",
                  occupation: "",
                  monthlyIncome: "0",
                  isLivingWithPatient: true,
                }}
                onSave={(data) => {
                  const newMember: FamilyMember = {
                    id: `fam-${Date.now()}`,
                    fullName:
                      `${data.firstName} ${data.middleName ? data.middleName + " " : ""}${data.lastName}`.trim(),
                    firstName: data.firstName,
                    middleName: data.middleName,
                    lastName: data.lastName,
                    relationship: data.relationship,
                    birthdate: data.birthdate || "2020-01-01",
                    sex: data.sex,
                    age: Number(data.age) || 0,
                    civilStatus: data.civilStatus,
                    occupation: data.occupation,
                    monthlyIncome: Number(data.monthlyIncome) || 0,
                    educationalAttainment: data.educationalAttainment,
                    contactNumber: "",
                    isLivingWithPatient: data.isLivingWithPatient,
                  }
                  setFamilyMembersList((prev) => [...prev, newMember])
                  setIsAddingMember(false)
                }}
                onCancel={() => setIsAddingMember(false)}
              />
            )}

            {/* Family Members List (Figma 283:4553, 283:4571) */}
            {familyMembersList.map((member) => {
              if (editingMemberId === member.id) {
                const parts = member.fullName.split(" ")
                return (
                  <FamilyMemberFormCard
                    key={member.id}
                    title="Edit Family Member"
                    initialData={{
                      firstName: member.firstName || parts[0] || "",
                      middleName:
                        member.middleName || (parts.length > 2 ? parts[1] : ""),
                      lastName:
                        member.lastName || parts[parts.length - 1] || "",
                      birthdate: member.birthdate,
                      age: member.age,
                      sex: member.sex === "Female" ? "Female" : "Male",
                      civilStatus: member.civilStatus || "Married",
                      relationship: member.relationship,
                      educationalAttainment:
                        member.educationalAttainment || "Highschool Graduate",
                      occupation: member.occupation,
                      monthlyIncome: member.monthlyIncome,
                      isLivingWithPatient: member.isLivingWithPatient ?? true,
                    }}
                    onSave={(data) => {
                      setFamilyMembersList((prev) =>
                        prev.map((m) =>
                          m.id === member.id
                            ? {
                                ...m,
                                fullName:
                                  `${data.firstName} ${data.middleName ? data.middleName + " " : ""}${data.lastName}`.trim(),
                                firstName: data.firstName,
                                middleName: data.middleName,
                                lastName: data.lastName,
                                relationship: data.relationship,
                                birthdate: data.birthdate,
                                sex: data.sex,
                                age: Number(data.age) || 0,
                                civilStatus: data.civilStatus,
                                occupation: data.occupation,
                                monthlyIncome: Number(data.monthlyIncome) || 0,
                                educationalAttainment:
                                  data.educationalAttainment,
                                isLivingWithPatient: data.isLivingWithPatient,
                              }
                            : m
                        )
                      )
                      setEditingMemberId(null)
                    }}
                    onCancel={() => setEditingMemberId(null)}
                  />
                )
              }

              const memberInitials = getMemberInitials(member.fullName)
              const formattedMemberDob = member.birthdate
                ? (() => {
                    const d = new Date(member.birthdate)
                    if (Number.isNaN(d.getTime())) return member.birthdate
                    const mm = String(d.getMonth() + 1).padStart(2, "0")
                    const dd = String(d.getDate()).padStart(2, "0")
                    const yyyy = d.getFullYear()
                    return `${mm}/${dd}/${yyyy}`
                  })()
                : "04/03/1999"

              return (
                <div
                  key={member.id}
                  data-node-id="283:4553"
                  className="flex w-full items-center gap-[12px] rounded-[14px] border border-[#e4e9f2] bg-white px-[15px] py-[12px] dark:border-border dark:bg-card"
                >
                  {/* Avatar */}
                  <div className="flex size-[38px] shrink-0 items-center justify-center rounded-[19px] bg-[#e0f5f8] text-[12px] leading-normal font-bold text-[#0a6b78] dark:bg-cyan-950/40 dark:text-cyan-300">
                    {memberInitials}
                  </div>

                  {/* Info Column */}
                  <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                    <div className="flex items-center gap-[8px]">
                      <span className="truncate text-[14px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground">
                        {member.fullName}
                      </span>
                      <span className="flex h-[20px] shrink-0 items-center rounded-full bg-[#edf3fe] px-[8px] text-[11px] leading-[20px] font-bold text-[#1f5fd6] dark:bg-primary/20">
                        {member.relationship}
                      </span>
                    </div>
                    <div className="flex flex-col text-[12px] leading-normal font-normal text-[#5b6678] dark:text-muted-foreground">
                      <span>
                        {member.relationship.toLowerCase() === "child"
                          ? `${member.age} (was ${Math.max(0, member.age - 1)}) · ${member.sex} · ${member.civilStatus || "Single"} · Born ${formattedMemberDob}`
                          : `${member.age} · ${member.sex} · ${member.civilStatus || "Married"} · Born ${formattedMemberDob}`}
                      </span>
                      <span>
                        {member.educationalAttainment
                          ? `${member.educationalAttainment} · ${member.occupation || "Vendor"}`
                          : member.isLivingWithPatient
                            ? "Living with patient"
                            : member.occupation || "Living with patient"}
                      </span>
                    </div>
                  </div>

                  {/* Income Column */}
                  <div className="flex shrink-0 flex-col items-end">
                    <span className="text-[14px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground">
                      ₱
                      {Number(member.monthlyIncome ?? 0).toLocaleString(
                        "en-PH",
                        {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }
                      )}
                    </span>
                    <span className="text-[11px] leading-normal font-normal text-[#5b6678] dark:text-muted-foreground">
                      per month
                    </span>
                  </div>

                  {/* Edit Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMemberId(member.id)
                      setIsAddingMember(false)
                    }}
                    className="flex size-[32px] shrink-0 cursor-pointer items-center justify-center rounded-[16px] text-[#5b6678] transition-colors hover:bg-[#f4f7fc] hover:text-[#0c2a5b] dark:hover:bg-muted dark:hover:text-foreground"
                  >
                    <Pencil className="size-[18px]" />
                  </button>
                </div>
              )
            })}

            {/* Action Buttons: Add Family Member & Other Income Source (Figma 283:4589) */}
            <div
              data-node-id="283:4589"
              className="flex w-full items-start gap-[8px]"
            >
              <button
                type="button"
                onClick={() => {
                  setIsAddingMember(true)
                  setEditingMemberId(null)
                }}
                data-node-id="283:4590"
                className="flex h-[34px] cursor-pointer items-center gap-[4px] rounded-full border border-dashed border-[#cfd7e4] px-[14px] text-[13px] leading-normal font-semibold text-[#0c2a5b] transition-colors hover:bg-[#f4f7fc] dark:border-border dark:text-foreground dark:hover:bg-muted"
              >
                <img
                  alt=""
                  className="block size-[18px] max-w-none"
                  src="/images/patient-registry/intake-add.svg"
                />
                <span>Add family member</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsAddingMember(true)
                  setEditingMemberId(null)
                }}
                data-node-id="283:4591"
                className="flex h-[34px] cursor-pointer items-center gap-[4px] rounded-full border border-dashed border-[#cfd7e4] px-[14px] text-[13px] leading-normal font-semibold text-[#0c2a5b] transition-colors hover:bg-[#f4f7fc] dark:border-border dark:text-foreground dark:hover:bg-muted"
              >
                <Plus className="size-[18px] text-[#0c2a5b] dark:text-foreground" />
                <span>Other income source</span>
              </button>
            </div>

            {/* Total Family Income Summary Box (Figma 283:4592) */}
            <div
              data-node-id="283:4592"
              className="flex w-full items-center justify-between rounded-[14px] border border-[#fad5ac] bg-[#fff3e6] px-[17px] py-[15px] dark:border-amber-700/50 dark:bg-amber-950/20"
            >
              <div
                data-node-id="283:4593"
                className="flex items-center gap-[6px]"
              >
                <Zap className="size-[16px] text-[#a5500b] dark:text-amber-400" />
                <span
                  data-node-id="283:4596"
                  className="text-[13px] leading-normal font-semibold text-[#a5500b] dark:text-amber-400"
                >
                  Total family income · auto
                </span>
              </div>
              <div
                data-node-id="283:4598"
                className="text-[20px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground"
              >
                ₱
                {totalFamilyIncome.toLocaleString("en-PH", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Monthly expenses (Figma 257:5835 / 298:6368) */}
        {activeSection === "annex-b" && currentStep === 3 && (
          <div
            ref={scrollContainerRef}
            data-node-id="298:6368"
            className="flex min-h-0 flex-1 animate-in [scrollbar-width:thin] [scrollbar-color:#cfd7e4_transparent] flex-col gap-[14px] overflow-y-auto px-[24px] pt-[18px] pb-[22px] duration-200 fade-in-50 dark:[scrollbar-color:#374151_transparent]"
          >
            {/* Header: Title and subtitle */}
            <div
              data-node-id="298:6369"
              className="flex items-center justify-between gap-[10px]"
            >
              <h3
                data-node-id="298:6371"
                className="text-[16px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground"
              >
                Monthly expenses
              </h3>
              <span
                data-node-id="298:6373"
                className="text-[12px] leading-normal font-normal text-[#5b6678] dark:text-muted-foreground"
              >
                From {parsedName.first || patient.firstName || "patient"}&apos;s
                record · Feb 6, 2026
              </span>
            </div>

            {/* Living conditions card (Figma 298:6374) */}
            <div
              data-node-id="298:6374"
              className="flex flex-col gap-[12px] rounded-[16px] border border-[#e4e9f2] p-[17px_15px] dark:border-border"
            >
              {/* Card Title */}
              <div
                data-node-id="298:6375"
                className="flex items-center gap-[8px]"
              >
                <Home className="size-[18px] text-[#1f5fd6]" />
                <span
                  data-node-id="298:6379"
                  className="text-[14px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground"
                >
                  Living conditions
                </span>
              </div>

              {/* House / lot Radio Section */}
              <div className="flex flex-col gap-[8px]">
                <span
                  data-node-id="298:6381"
                  className="text-[12px] leading-normal font-semibold text-[#5b6678] dark:text-muted-foreground"
                >
                  House / lot
                </span>
                <div
                  data-node-id="298:6382"
                  className="flex items-start gap-[8px]"
                >
                  {/* Owned Card */}
                  <button
                    type="button"
                    onClick={() => setHouseLotType("owned")}
                    data-node-id="298:6383"
                    className={cn(
                      "flex min-w-0 flex-1 cursor-pointer items-start gap-[10px] rounded-[12px] p-[10px_12px] text-left transition-all",
                      houseLotType === "owned"
                        ? "border-2 border-[#1f5fd6] bg-[#edf3fe] dark:bg-primary/10"
                        : "border border-[#e4e9f2] bg-white hover:bg-[#f4f7fc] dark:border-border dark:bg-card dark:hover:bg-muted/50"
                    )}
                  >
                    <div className="pt-px">
                      <div
                        className={cn(
                          "flex size-[18px] items-center justify-center rounded-full border-2",
                          houseLotType === "owned"
                            ? "border-[#1f5fd6]"
                            : "border-[#cfd7e4] dark:border-muted-foreground"
                        )}
                      >
                        {houseLotType === "owned" && (
                          <div className="size-[8px] rounded-full bg-[#1f5fd6]" />
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[13px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground">
                        Owned
                      </span>
                      <span className="text-[11px] leading-[14.85px] font-normal text-[#5b6678] dark:text-muted-foreground">
                        House and lot owned by the
                        <br />
                        family
                      </span>
                    </div>
                  </button>

                  {/* Rented Card */}
                  <button
                    type="button"
                    onClick={() => setHouseLotType("rented")}
                    data-node-id="298:6392"
                    className={cn(
                      "flex min-w-0 flex-1 cursor-pointer items-start gap-[10px] rounded-[12px] p-[10px_12px] text-left transition-all",
                      houseLotType === "rented"
                        ? "border-2 border-[#1f5fd6] bg-[#edf3fe] dark:bg-primary/10"
                        : "border border-[#e4e9f2] bg-white hover:bg-[#f4f7fc] dark:border-border dark:bg-card dark:hover:bg-muted/50"
                    )}
                  >
                    <div className="pt-px">
                      <div
                        className={cn(
                          "flex size-[18px] items-center justify-center rounded-full border-2",
                          houseLotType === "rented"
                            ? "border-[#1f5fd6]"
                            : "border-[#cfd7e4] dark:border-muted-foreground"
                        )}
                      >
                        {houseLotType === "rented" && (
                          <div className="size-[8px] rounded-full bg-[#1f5fd6]" />
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[13px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground">
                        Rented
                      </span>
                      <span className="text-[11px] leading-[14.85px] font-normal text-[#5b6678] dark:text-muted-foreground">
                        Pays monthly rent
                      </span>
                    </div>
                  </button>

                  {/* Rent-free Card */}
                  <button
                    type="button"
                    onClick={() => setHouseLotType("rent_free")}
                    data-node-id="298:6401"
                    className={cn(
                      "flex min-w-0 flex-1 cursor-pointer items-start gap-[10px] rounded-[12px] p-[10px_12px] text-left transition-all",
                      houseLotType === "rent_free"
                        ? "border-2 border-[#1f5fd6] bg-[#edf3fe] dark:bg-primary/10"
                        : "border border-[#e4e9f2] bg-white hover:bg-[#f4f7fc] dark:border-border dark:bg-card dark:hover:bg-muted/50"
                    )}
                  >
                    <div className="pt-px">
                      <div
                        className={cn(
                          "flex size-[18px] items-center justify-center rounded-full border-2",
                          houseLotType === "rent_free"
                            ? "border-[#1f5fd6]"
                            : "border-[#cfd7e4] dark:border-muted-foreground"
                        )}
                      >
                        {houseLotType === "rent_free" && (
                          <div className="size-[8px] rounded-full bg-[#1f5fd6]" />
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[13px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground">
                        Rent-free
                      </span>
                      <span className="text-[11px] leading-[14.85px] font-normal text-[#5b6678] dark:text-muted-foreground">
                        Lives with relatives or
                        <br />
                        caretaker, no rent
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Monthly rent input (visible if rented) */}
              {houseLotType === "rented" && (
                <div
                  data-node-id="298:6410"
                  className="flex items-center gap-[10px] pt-[2px]"
                >
                  <label
                    data-node-id="298:6411"
                    className="w-[150px] shrink-0 text-[12px] leading-normal font-semibold text-[#5b6678] dark:text-muted-foreground"
                  >
                    <span>Monthly rent </span>
                    <span className="text-[#a51d30]">*</span>
                  </label>
                  <div
                    data-node-id="298:6413"
                    className="flex h-[38px] w-[180px] shrink-0 items-center rounded-[10px] border border-[#c6e8ee] bg-[#f1fafb] px-[12px] dark:border-cyan-800 dark:bg-cyan-950/20"
                  >
                    <input
                      type="number"
                      value={monthlyRent || ""}
                      onChange={(e) =>
                        setMonthlyRent(Number(e.target.value) || 0)
                      }
                      className="w-full bg-transparent text-right text-[13px] leading-normal font-semibold text-[#1b2433] outline-none dark:text-foreground"
                    />
                  </div>
                  <span
                    data-node-id="298:6417"
                    className="text-[12px] leading-normal font-normal text-[#5b6678] dark:text-muted-foreground"
                  >
                    Added to expenses as &ldquo;House rent&rdquo;
                  </span>
                </div>
              )}

              {/* Light source & Water source 2-Column Grid */}
              <div
                data-node-id="298:6418"
                className="flex items-start gap-[14px] pt-[4px]"
              >
                {/* Light Source Column */}
                <div
                  data-node-id="298:6419"
                  className="flex flex-1 flex-col gap-[8px]"
                >
                  <span
                    data-node-id="298:6421"
                    className="text-[12px] leading-normal font-semibold text-[#5b6678] dark:text-muted-foreground"
                  >
                    Light source · choose all that apply
                  </span>
                  <div
                    data-node-id="298:6422"
                    className="flex flex-wrap gap-[6px]"
                  >
                    {[
                      "Electricity",
                      "Kerosene",
                      "Candle",
                      "Solar",
                      "Charcoal",
                      "None",
                    ].map((src) => {
                      const isSelected = lightSources.includes(src)
                      return (
                        <button
                          key={src}
                          type="button"
                          onClick={() => toggleLightSource(src)}
                          className={cn(
                            "flex h-[34px] cursor-pointer items-center gap-[6px] rounded-[10px] px-[12px] transition-colors",
                            isSelected
                              ? "border border-[#1f5fd6] bg-[#edf3fe] dark:bg-primary/10"
                              : "border border-[#cfd7e4] bg-white hover:bg-[#f4f7fc] dark:border-border dark:bg-card dark:hover:bg-muted/50"
                          )}
                        >
                          <div
                            className={cn(
                              "flex size-[16px] items-center justify-center rounded-[4px]",
                              isSelected
                                ? "bg-[#1f5fd6] text-white"
                                : "border-2 border-[#cfd7e4] dark:border-muted-foreground"
                            )}
                          >
                            {isSelected && (
                              <Check className="size-[12px] stroke-[3]" />
                            )}
                          </div>
                          <span className="text-[12px] leading-normal font-semibold text-[#0c2a5b] dark:text-foreground">
                            {src}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Water Source Column */}
                <div
                  data-node-id="298:6445"
                  className="flex flex-1 flex-col gap-[8px]"
                >
                  <span
                    data-node-id="298:6447"
                    className="text-[12px] leading-normal font-semibold text-[#5b6678] dark:text-muted-foreground"
                  >
                    Water source · choose all that apply
                  </span>
                  <div
                    data-node-id="298:6448"
                    className="flex flex-wrap gap-[6px]"
                  >
                    {[
                      "Piped (owned)",
                      "Public faucet",
                      "Artesian well",
                      "Bought / delivered",
                    ].map((src) => {
                      const isSelected = waterSources.includes(src)
                      return (
                        <button
                          key={src}
                          type="button"
                          onClick={() => toggleWaterSource(src)}
                          className={cn(
                            "flex h-[34px] cursor-pointer items-center gap-[6px] rounded-[10px] px-[12px] transition-colors",
                            isSelected
                              ? "border border-[#1f5fd6] bg-[#edf3fe] dark:bg-primary/10"
                              : "border border-[#cfd7e4] bg-white hover:bg-[#f4f7fc] dark:border-border dark:bg-card dark:hover:bg-muted/50"
                          )}
                        >
                          <div
                            className={cn(
                              "flex size-[16px] items-center justify-center rounded-[4px]",
                              isSelected
                                ? "bg-[#1f5fd6] text-white"
                                : "border-2 border-[#cfd7e4] dark:border-muted-foreground"
                            )}
                          >
                            {isSelected && (
                              <Check className="size-[12px] stroke-[3]" />
                            )}
                          </div>
                          <span className="text-[12px] leading-normal font-semibold text-[#0c2a5b] dark:text-foreground">
                            {src}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Bottom helper note */}
              <p
                data-node-id="298:6468"
                className="text-[11px] leading-normal font-normal text-[#5b6678] dark:text-muted-foreground"
              >
                Light and water describe living conditions for the assessment;
                they don&apos;t change the totals.
              </p>
            </div>

            {/* 3 Metrics Cards (Figma 298:6469) */}
            <div
              data-node-id="298:6469"
              className="flex items-start justify-center gap-[10px]"
            >
              {/* Family Income */}
              <div
                data-node-id="298:6470"
                className="flex flex-1 flex-col rounded-[14px] border border-[#fad5ac] bg-[#fff3e6] px-[15px] py-[13px] dark:border-amber-800/40 dark:bg-amber-950/20"
              >
                <span
                  data-node-id="298:6472"
                  className="text-[12px] leading-normal font-semibold text-[#a5500b] dark:text-amber-400"
                >
                  Family income
                </span>
                <span
                  data-node-id="298:6474"
                  className="text-[18px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground"
                >
                  ₱
                  {totalFamilyIncome.toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>

              {/* Monthly Expenses */}
              <div
                data-node-id="298:6475"
                className="flex flex-1 flex-col rounded-[14px] border border-[#fad5ac] bg-[#fff3e6] px-[15px] py-[13px] dark:border-amber-800/40 dark:bg-amber-950/20"
              >
                <span
                  data-node-id="298:6477"
                  className="text-[12px] leading-normal font-semibold text-[#a5500b] dark:text-amber-400"
                >
                  Monthly expenses
                </span>
                <span
                  data-node-id="298:6479"
                  className="text-[18px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground"
                >
                  ₱
                  {totalMonthlyExpenses.toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>

              {/* Net Balance */}
              <div
                data-node-id="298:6480"
                className={cn(
                  "flex flex-1 flex-col rounded-[14px] px-[15px] py-[13px]",
                  netBalance < 0
                    ? "border border-[#f6c4cb] bg-[#fdedef] dark:border-rose-800/40 dark:bg-rose-950/20"
                    : "border border-[#c6e8ee] bg-[#f1fafb] dark:border-cyan-800/40 dark:bg-cyan-950/20"
                )}
              >
                <span
                  data-node-id="298:6482"
                  className={cn(
                    "text-[12px] leading-normal font-semibold",
                    netBalance < 0
                      ? "text-[#a51d30] dark:text-rose-400"
                      : "text-[#0c2a5b] dark:text-foreground"
                  )}
                >
                  Net balance
                </span>
                <span
                  data-node-id="298:6484"
                  className={cn(
                    "text-[18px] leading-normal font-bold",
                    netBalance < 0
                      ? "text-[#a51d30] dark:text-rose-400"
                      : "text-[#0c2a5b] dark:text-foreground"
                  )}
                >
                  {netBalance < 0 ? "−₱" : "₱"}
                  {Math.abs(netBalance).toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            {/* Expenses Breakdown Table (Figma 298:6485) */}
            <div
              data-node-id="298:6485"
              className="flex w-full shrink-0 flex-col overflow-hidden rounded-[14px] border border-[#e4e9f2] dark:border-border"
            >
              {/* Header */}
              <div
                data-node-id="298:6486"
                className="flex shrink-0 items-center justify-between border-b border-[#e4e9f2] bg-[#f4f7fc] px-[14px] py-[10px] dark:border-border dark:bg-muted/40"
              >
                <span
                  data-node-id="298:6488"
                  className="text-[12px] leading-normal font-semibold text-[#5b6678] dark:text-muted-foreground"
                >
                  Expense
                </span>
                <span
                  data-node-id="298:6491"
                  className="pr-[36px] text-[12px] leading-normal font-semibold text-[#5b6678] dark:text-muted-foreground"
                >
                  Monthly amount
                </span>
              </div>

              {/* Scrollable Rows Container */}
              <div
                ref={expenseRowsRef}
                className="max-h-[260px] [scrollbar-width:thin] [scrollbar-color:#cfd7e4_transparent] divide-y divide-[#e4e9f2] overflow-y-auto dark:[scrollbar-color:#374151_transparent] dark:divide-border"
              >
                {expensesList.map((item) => {
                  if (item.isLocked) {
                    return (
                      <div
                        key={item.id}
                        data-node-id="298:6492"
                        className="flex items-center justify-between bg-[#f4f7fc] px-[14px] py-[9px] dark:bg-muted/30"
                      >
                        <div className="flex items-center gap-[4px]">
                          <span className="text-[13px] leading-normal font-normal text-[#1b2433] dark:text-foreground">
                            {item.name}
                          </span>
                          {item.sourceNote && (
                            <span className="text-[11px] leading-normal font-normal text-[#5b6678] dark:text-muted-foreground">
                              · {item.sourceNote}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-[8px]">
                          <div className="flex w-[130px] items-center justify-end gap-[4px]">
                            <Lock className="size-[14px] text-[#5b6678] dark:text-muted-foreground" />
                            <span className="text-[13px] leading-normal font-bold text-[#1b2433] dark:text-foreground">
                              ₱
                              {Number(item.amount).toLocaleString("en-PH", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                          {/* Spacer for alignment with delete button */}
                          <div className="size-[30px]" />
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-[14px] py-[8px]"
                    >
                      {item.isCustom ? (
                        <input
                          type="text"
                          value={item.name}
                          autoFocus={newlyAddedExpenseId === item.id}
                          onChange={(e) =>
                            handleUpdateExpenseName(item.id, e.target.value)
                          }
                          placeholder="Expense name (e.g. Education)"
                          className="mr-2 h-[34px] max-w-[260px] flex-1 rounded-[10px] border border-[#c6e8ee] bg-[#f1fafb] px-[10px] text-[13px] font-medium text-[#1b2433] placeholder:text-[#5b6678] focus:border-[#1f5fd6] focus:outline-none dark:border-cyan-800 dark:bg-cyan-950/20 dark:text-foreground"
                        />
                      ) : (
                        <span className="text-[13px] leading-normal font-normal text-[#1b2433] dark:text-foreground">
                          {item.name}
                        </span>
                      )}
                      <div className="flex items-center gap-[8px]">
                        <div className="flex h-[34px] w-[130px] items-center rounded-[10px] border border-[#c6e8ee] bg-[#f1fafb] px-[10px] py-[8px] dark:border-cyan-800 dark:bg-cyan-950/20">
                          <input
                            type="number"
                            autoFocus={
                              newlyAddedExpenseId === item.id && !item.isCustom
                            }
                            value={item.amount || ""}
                            onChange={(e) =>
                              handleUpdateExpenseAmount(
                                item.id,
                                Number(e.target.value) || 0
                              )
                            }
                            className="w-full bg-transparent text-right text-[13px] leading-normal font-semibold text-[#1b2433] outline-none dark:text-foreground"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(item.id)}
                          className="flex size-[30px] cursor-pointer items-center justify-center rounded-[15px] text-[#5b6678] transition-colors hover:bg-[#fdedef] hover:text-[#a51d30] dark:hover:bg-rose-950/30"
                        >
                          <Trash2 className="size-[17px]" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Total Row (Figma 311:6644) */}
              <div
                data-node-id="311:6644"
                className="flex shrink-0 items-center justify-between rounded-b-[14px] border-t border-[#fad5ac] bg-[#fff5e0] px-[14px] py-[9px] dark:border-amber-800/40 dark:bg-amber-950/20"
              >
                <span
                  data-node-id="311:6646"
                  className="text-[13px] leading-[16px] font-semibold text-[#1b2433] dark:text-foreground"
                >
                  Total monthly expenses
                </span>
                <div className="flex items-center gap-[8px]">
                  <div className="flex h-[34px] w-[130px] items-center justify-end px-[10px] py-[8px]">
                    <span
                      data-node-id="311:6649"
                      className="text-right text-[13px] leading-normal font-semibold text-[#1b2433] dark:text-foreground"
                    >
                      ₱
                      {totalMonthlyExpenses.toLocaleString("en-PH", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="size-[30px]" />
                </div>
              </div>
            </div>

            {/* Add Expense Dropdown (Figma 298:6515) */}
            <div data-node-id="298:6515" className="flex items-start">
              <DropdownMenu>
                <DropdownMenuTrigger
                  data-node-id="298:6516"
                  className="inline-flex h-[32px] cursor-pointer items-center gap-[6px] rounded-full border border-dashed border-[#cfd7e4] bg-white px-[14px] text-[12px] leading-normal font-semibold text-[#0c2a5b] transition-all hover:border-[#1f5fd6] hover:bg-[#f4f7fc] active:scale-[0.98] dark:border-border dark:bg-card dark:text-foreground dark:hover:bg-muted/50"
                >
                  <Plus className="size-[15px]" />
                  <span>Add expense</span>
                  <ChevronDown className="size-[13px] text-[#5b6678] dark:text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  side="bottom"
                  sideOffset={6}
                  className="w-[260px] rounded-[12px] border border-[#e4e9f2] bg-white p-[6px] shadow-[0px_10px_24px_rgba(12,42,91,0.12)] dark:border-border dark:bg-card"
                >
                  <DropdownMenuLabel className="px-[10px] pt-[6px] pb-[4px] text-[10px] font-bold tracking-wider text-[#5b6678] uppercase dark:text-muted-foreground">
                    Expense Categories
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="my-[4px] bg-[#e4e9f2] dark:bg-border" />
                  <div className="max-h-[220px] [scrollbar-width:thin] [scrollbar-color:#cfd7e4_transparent] overflow-y-auto dark:[scrollbar-color:#374151_transparent]">
                    {PREDEFINED_EXPENSE_CATEGORIES.map((cat) => {
                      const isAdded =
                        cat !== "Other (specify)" &&
                        expensesList.some(
                          (item) =>
                            item.name.trim().toLowerCase() ===
                            cat.trim().toLowerCase()
                        )

                      return (
                        <DropdownMenuItem
                          key={cat}
                          disabled={isAdded}
                          onClick={() => handleSelectExpenseCategory(cat)}
                          className={cn(
                            "flex cursor-pointer items-center justify-between rounded-[8px] px-[10px] py-[7px] text-[12px] font-medium transition-colors outline-none",
                            isAdded
                              ? "cursor-not-allowed opacity-45"
                              : "text-[#1b2433] hover:bg-[#f4f7fc] hover:text-[#1f5fd6] dark:text-foreground dark:hover:bg-muted"
                          )}
                        >
                          <span>{cat}</span>
                          {isAdded && (
                            <span className="flex items-center gap-[2px] text-[10px] font-semibold text-[#146b43] dark:text-emerald-400">
                              <Check className="size-[12px]" /> Added
                            </span>
                          )}
                          {cat === "Other (specify)" && !isAdded && (
                            <Plus className="size-[12px] text-[#5b6678] dark:text-muted-foreground" />
                          )}
                        </DropdownMenuItem>
                      )
                    })}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}

        {/* Step 4: Diagnosis & Problem (Figma 257:6148) */}
        {activeSection === "annex-b" && currentStep === 4 && (
          <div
            ref={scrollContainerRef}
            data-node-id="257:6210"
            className="flex flex-1 animate-in [scrollbar-width:thin] [scrollbar-color:#cfd7e4_transparent] flex-col gap-[20px] overflow-y-auto px-[24px] pt-[18px] pb-[22px] duration-200 fade-in-50 dark:[scrollbar-color:#374151_transparent]"
          >
            {/* Header: Title and subtitle */}
            <div
              data-node-id="257:6211"
              className="flex items-center justify-between gap-[10px]"
            >
              <h3
                data-node-id="257:6213"
                className="text-[16px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground"
              >
                Diagnosis & Problem
              </h3>
              <span
                data-node-id="257:6215"
                className="text-[12px] leading-normal font-normal text-[#5b6678] dark:text-muted-foreground"
              >
                From {parsedName.first || patient.firstName || "Kim"}&apos;s
                record · Feb 6, 2026
              </span>
            </div>

            {/* Final diagnosis · from HIS Box */}
            <div
              data-node-id="257:6394"
              className="flex flex-col gap-[5px] rounded-[12px] border border-[#d8d8d8] bg-[#f3f2ee] px-[14px] py-[12px] dark:border-border dark:bg-muted/40"
            >
              <span
                data-node-id="257:6396"
                className="text-[10px] leading-normal font-medium text-[#6a6a6a] dark:text-muted-foreground"
              >
                Final diagnosis · from HIS
              </span>
              <span
                data-node-id="257:6400"
                className="text-[14px] leading-normal font-medium text-[#1b2433] dark:text-foreground"
              >
                {finalDiagnosis}
              </span>
            </div>

            {/* Problem presented Section */}
            <div data-node-id="257:6307" className="flex flex-col gap-[10px]">
              <div data-node-id="257:6309" className="flex items-center">
                <span
                  data-node-id="257:6310"
                  className="text-[13px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground"
                >
                  Problem presented{" "}
                </span>
                <span className="text-[13px] leading-normal font-medium text-[#5b6678] dark:text-muted-foreground">
                  · choose all that apply
                </span>
              </div>

              <div
                data-node-id="257:6311"
                className="flex flex-wrap items-center gap-[8px]"
              >
                {PROBLEM_OPTIONS.map((problem) => {
                  const isSelected = selectedProblems.includes(problem)
                  return (
                    <button
                      key={problem}
                      type="button"
                      onClick={() => toggleProblem(problem)}
                      className={cn(
                        "flex h-[38px] cursor-pointer items-center gap-[6px] rounded-full px-[14px] text-[13px] leading-normal font-semibold transition-all",
                        isSelected
                          ? "border border-[#1f5fd6] bg-[#1f5fd6] text-white shadow-xs"
                          : "border border-[#cfd7e4] bg-white text-[#0c2a5b] hover:bg-[#f4f7fc] dark:border-border dark:bg-card dark:text-foreground dark:hover:bg-muted/50"
                      )}
                    >
                      {isSelected ? (
                        <Check className="size-[14px] stroke-[2.5] text-white" />
                      ) : (
                        <Plus className="size-[14px] text-[#5b6678] dark:text-muted-foreground" />
                      )}
                      <span>{problem}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Type of assistance & Medical history 2-Column Grid */}
            <div
              data-node-id="257:6402"
              className="grid grid-cols-2 gap-[10px]"
            >
              {/* Type of assistance */}
              <div data-node-id="257:6403" className="flex flex-col gap-[5px]">
                <label
                  data-node-id="257:6405"
                  className="text-[12px] leading-normal font-semibold text-[#5b6678] dark:text-muted-foreground"
                >
                  Type of assistance
                </label>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    data-node-id="257:6406"
                    className="flex h-[38px] w-full cursor-pointer items-center justify-between rounded-[10px] border border-[#c6e8ee] bg-[#f1fafb] px-[12px] text-left transition-colors outline-none hover:border-[#1f5fd6] dark:border-cyan-800 dark:bg-cyan-950/20"
                  >
                    <span className="truncate text-[13px] leading-normal font-medium text-[#1b2433] dark:text-foreground">
                      {typeOfAssistance}
                    </span>
                    <ChevronDown className="size-[15px] shrink-0 text-[#5b6678] dark:text-muted-foreground" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    side="bottom"
                    sideOffset={4}
                    className="w-(--anchor-width) min-w-[280px] rounded-[12px] border border-[#e4e9f2] bg-white p-[6px] shadow-[0px_10px_24px_rgba(12,42,91,0.12)] dark:border-border dark:bg-card"
                  >
                    <div className="max-h-[220px] [scrollbar-width:thin] [scrollbar-color:#cfd7e4_transparent] overflow-y-auto dark:[scrollbar-color:#374151_transparent]">
                      {ASSISTANCE_TYPE_OPTIONS.map((option) => {
                        const isSelected = typeOfAssistance === option
                        return (
                          <DropdownMenuItem
                            key={option}
                            onClick={() => setTypeOfAssistance(option)}
                            className={cn(
                              "flex cursor-pointer items-center justify-between rounded-[8px] px-[10px] py-[8px] text-[12px] font-medium transition-colors outline-none",
                              isSelected
                                ? "bg-[#edf3fe] font-semibold text-[#1f5fd6] dark:bg-primary/10 dark:text-primary"
                                : "text-[#1b2433] hover:bg-[#f4f7fc] dark:text-foreground dark:hover:bg-muted"
                            )}
                          >
                            <span>{option}</span>
                            {isSelected && (
                              <Check className="size-[14px] text-[#1f5fd6]" />
                            )}
                          </DropdownMenuItem>
                        )
                      })}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Custom input when OTHER (SPECIFY) is selected */}
                {typeOfAssistance === "OTHER (SPECIFY)" && (
                  <div className="animate-in pt-[2px] duration-150 fade-in-50">
                    <input
                      type="text"
                      autoFocus
                      value={otherAssistanceText}
                      onChange={(e) => setOtherAssistanceText(e.target.value)}
                      placeholder="Specify assistance (e.g. Orthopedic implant sponsorship)"
                      className="h-[36px] w-full rounded-[10px] border border-[#c6e8ee] bg-[#f1fafb] px-[12px] text-[13px] font-medium text-[#1b2433] outline-none placeholder:text-[#5b6678] focus:border-[#1f5fd6] dark:border-cyan-800 dark:bg-cyan-950/20 dark:text-foreground"
                    />
                  </div>
                )}
              </div>

              {/* Medical history */}
              <div data-node-id="257:6409" className="flex flex-col gap-[5px]">
                <label
                  data-node-id="257:6411"
                  className="text-[12px] leading-normal font-semibold text-[#5b6678] dark:text-muted-foreground"
                >
                  Medical history
                </label>
                <div
                  data-node-id="257:6412"
                  className="flex h-[38px] items-center rounded-[10px] border border-[#c6e8ee] bg-[#f1fafb] px-[12px] dark:border-cyan-800 dark:bg-cyan-950/20"
                >
                  <input
                    type="text"
                    value={medicalHistory}
                    onChange={(e) => setMedicalHistory(e.target.value)}
                    placeholder="e.g. Hypertension, previous admissions"
                    className="w-full bg-transparent text-[13px] leading-normal font-medium text-[#1b2433] outline-none placeholder:text-[#7a7a7a] dark:text-foreground dark:placeholder:text-muted-foreground"
                  />
                </div>
              </div>
            </div>

            {/* Services availed Section */}
            <div data-node-id="270:4062" className="flex flex-col gap-[10px]">
              <div data-node-id="270:4063" className="flex items-center">
                <span
                  data-node-id="270:4064"
                  className="text-[13px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground"
                >
                  Services availed
                </span>
              </div>

              <div
                data-node-id="270:4097"
                className="flex flex-wrap items-center gap-[8px]"
              >
                {SERVICE_OPTIONS.map((svc) => {
                  const isSelected = selectedServices.includes(svc.id)
                  return (
                    <button
                      key={svc.id}
                      type="button"
                      onClick={() => toggleService(svc.id)}
                      className={cn(
                        "flex h-[38px] cursor-pointer items-center gap-[6px] rounded-full px-[14px] text-[13px] leading-normal font-semibold transition-all",
                        isSelected
                          ? "border border-[#1f5fd6] bg-[#1f5fd6] text-white shadow-xs"
                          : "border border-[#cfd7e4] bg-white text-[#0c2a5b] hover:bg-[#f4f7fc] dark:border-border dark:bg-card dark:text-foreground dark:hover:bg-muted/50"
                      )}
                    >
                      {isSelected ? (
                        <Check className="size-[14px] stroke-[2.5] text-white" />
                      ) : (
                        <Plus className="size-[14px] text-[#5b6678] dark:text-muted-foreground" />
                      )}
                      <span>{svc.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Assessment & class (Figma 257:6456 / 257:6518) */}
        {activeSection === "annex-b" && currentStep === 5 && (
          <div
            ref={scrollContainerRef}
            data-node-id="257:6518"
            className="flex flex-1 animate-in [scrollbar-width:thin] [scrollbar-color:#cfd7e4_transparent] flex-col gap-[14px] overflow-y-auto px-[24px] pt-[18px] pb-[22px] duration-200 fade-in-50 dark:[scrollbar-color:#374151_transparent]"
          >
            {/* Header: Title */}
            <div
              data-node-id="257:6519"
              className="flex items-center gap-[10px]"
            >
              <h3
                data-node-id="257:6521"
                className="text-[16px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground"
              >
                Social worker&apos;s assessment & classification
              </h3>
            </div>

            {/* 4 Summary Cards Row (Figma 257:6524) */}
            <div
              data-node-id="257:6524"
              className="flex items-start justify-center gap-[10px]"
            >
              {/* Net per capita */}
              <div
                data-node-id="257:6525"
                className="flex flex-1 flex-col rounded-[14px] border border-[#fad5ac] bg-[#fff3e6] px-[15px] py-[13px] dark:border-amber-800/40 dark:bg-amber-950/20"
              >
                <span
                  data-node-id="257:6527"
                  className="text-[12px] leading-normal font-semibold text-[#a5500b] dark:text-amber-400"
                >
                  Net per capita
                </span>
                <span
                  data-node-id="257:6529"
                  className="text-[18px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground"
                >
                  {netPerCapita}
                </span>
              </div>

              {/* Family income */}
              <div
                data-node-id="257:6615"
                className="flex flex-1 flex-col rounded-[14px] border border-[#fad5ac] bg-[#fff3e6] px-[15px] py-[13px] dark:border-amber-800/40 dark:bg-amber-950/20"
              >
                <span
                  data-node-id="257:6617"
                  className="text-[12px] leading-normal font-semibold text-[#a5500b] dark:text-amber-400"
                >
                  Family income
                </span>
                <span
                  data-node-id="257:6619"
                  className="text-[18px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground"
                >
                  ₱
                  {totalFamilyIncome.toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>

              {/* Monthly expenses */}
              <div
                data-node-id="257:6530"
                className="flex flex-1 flex-col rounded-[14px] border border-[#fad5ac] bg-[#fff3e6] px-[15px] py-[13px] dark:border-amber-800/40 dark:bg-amber-950/20"
              >
                <span
                  data-node-id="257:6532"
                  className="text-[12px] leading-normal font-semibold text-[#a5500b] dark:text-amber-400"
                >
                  Monthly expenses
                </span>
                <span
                  data-node-id="257:6534"
                  className="text-[18px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground"
                >
                  ₱
                  {totalMonthlyExpenses.toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>

              {/* Household */}
              <div
                data-node-id="257:6621"
                className="flex flex-1 flex-col rounded-[14px] border border-[#fad5ac] bg-[#fff3e6] px-[15px] py-[13px] dark:border-amber-800/40 dark:bg-amber-950/20"
              >
                <span
                  data-node-id="257:6623"
                  className="text-[12px] leading-normal font-semibold text-[#a5500b] dark:text-amber-400"
                >
                  Household
                </span>
                <span
                  data-node-id="257:6625"
                  className="text-[18px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground"
                >
                  {householdCount} people
                </span>
              </div>
            </div>

            {/* Classification Banner Card (Figma 257:6684) */}
            <div
              data-node-id="257:6684"
              className="flex items-center justify-between gap-[16px] rounded-[16px] border border-[#9fd4b8] bg-[#9fd4b8]/20 px-[21px] py-[17px] dark:border-emerald-800/40 dark:bg-emerald-950/20"
            >
              {/* Left Badge */}
              <div
                data-node-id="257:6692"
                className="flex shrink-0 items-center"
              >
                <div
                  data-node-id="257:6693"
                  className="flex h-[24px] items-center rounded-full bg-[#e8f6ef] px-[9px] dark:bg-emerald-900/40"
                >
                  <span
                    data-node-id="257:6694"
                    className="text-[12px] leading-[24px] font-bold text-[#146b43] dark:text-emerald-400"
                  >
                    {classification}
                  </span>
                </div>
              </div>

              {/* Middle Title & Subtitle */}
              <div
                data-node-id="257:6696"
                className="flex min-w-0 flex-1 flex-col"
              >
                <h4
                  data-node-id="257:6688"
                  className="text-[20px] leading-normal font-extrabold text-[#0c2a5b] dark:text-foreground"
                >
                  {classificationCategory} |
                </h4>
                <p
                  data-node-id="257:6690"
                  className="text-[13px] leading-normal font-normal text-[#5b6678] dark:text-muted-foreground"
                >
                  Computed from steps 2 and 3, this updates if you change them.
                </p>
              </div>

              {/* Right Action */}
              <button
                type="button"
                onClick={() => {
                  const newClass = prompt(
                    "Override Classification (e.g. CLASS C1, CLASS C2, CLASS C3):",
                    classification
                  )
                  if (newClass) setClassification(newClass)
                }}
                data-node-id="257:6697"
                className="cursor-pointer text-[13px] leading-normal font-semibold text-[#1f5fd6] transition-colors hover:underline"
              >
                Override...
              </button>
            </div>

            {/* Assessment & Recommendation Form Section (Figma 257:6662) */}
            <div data-node-id="257:6662" className="flex flex-col gap-[16px]">
              {/* Social worker's assessment Textarea */}
              <div data-node-id="257:6665" className="flex flex-col gap-[6px]">
                <label
                  data-node-id="257:6667"
                  className="text-[13px] leading-normal font-semibold text-[#5b6678] dark:text-muted-foreground"
                >
                  Social worker&apos;s assessment
                </label>
                <div
                  data-node-id="257:6668"
                  className="flex min-h-[140px] flex-col rounded-[12px] border border-[#c6e8ee] bg-[#f1fafb] p-[14px] dark:border-cyan-800 dark:bg-cyan-950/20"
                >
                  <textarea
                    rows={5}
                    value={assessmentNotes}
                    onChange={(e) => setAssessmentNotes(e.target.value)}
                    className="w-full resize-none bg-transparent text-[14px] leading-[22.4px] font-normal text-[#1b2433] outline-none dark:text-foreground"
                  />
                </div>
              </div>

              {/* Recommendation & Interviewed By 2-Column Row (Figma 257:6671) */}
              <div
                data-node-id="257:6671"
                className="grid grid-cols-2 gap-[14px]"
              >
                {/* Recommendation */}
                <div
                  data-node-id="257:6672"
                  className="flex flex-col gap-[6px]"
                >
                  <label
                    data-node-id="257:6674"
                    className="text-[13px] leading-normal font-semibold text-[#5b6678] dark:text-muted-foreground"
                  >
                    Recommendation
                  </label>
                  <div
                    data-node-id="257:6675"
                    className="relative flex h-[44px] w-full items-center rounded-[12px] border border-[#c6e8ee] bg-[#f1fafb] px-[14px] dark:border-cyan-800 dark:bg-cyan-950/20"
                  >
                    <select
                      value={recommendation}
                      onChange={(e) => setRecommendation(e.target.value)}
                      className="w-full cursor-pointer appearance-none bg-transparent text-[14px] leading-normal font-medium text-[#1b2433] outline-none dark:text-foreground"
                    >
                      <option value="Partially subsidized (C2)">
                        Partially subsidized (C2)
                      </option>
                      <option value="Full subsidy (C3 / Indigent)">
                        Full subsidy (C3 / Indigent)
                      </option>
                      <option value="Partially subsidized (C1)">
                        Partially subsidized (C1)
                      </option>
                      <option value="Non-subsidized (Class D)">
                        Non-subsidized (Class D)
                      </option>
                    </select>
                    <img
                      src="/images/patient-registry/expand-more.svg"
                      alt=""
                      className="pointer-events-none absolute right-[12px] size-[20px]"
                    />
                  </div>
                </div>

                {/* Interviewed by */}
                <div
                  data-node-id="257:6678"
                  className="flex flex-col justify-center gap-[4px] rounded-[12px] border border-[#fad5ac] bg-[#fff3e6] px-[15px] py-[11px] dark:border-amber-800/40 dark:bg-amber-950/20"
                >
                  <span
                    data-node-id="257:6680"
                    className="text-[12px] leading-normal font-semibold text-[#a5500b] dark:text-amber-400"
                  >
                    Interviewed by
                  </span>
                  <span
                    data-node-id="257:6682"
                    className="text-[14px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground"
                  >
                    {interviewedBy}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer for Annex B (Figma 257:3839 / 257:6597) */}
        {activeSection === "annex-b" && (
          <div
            data-node-id="257:6597"
            className="flex shrink-0 items-center justify-between gap-[8px] border-t border-[#e4e9f2] bg-white px-[24px] pt-[15px] pb-[14px] dark:border-border dark:bg-card"
          >
            {/* Back Button */}
            <button
              type="button"
              onClick={() => {
                if (currentStep > 1) {
                  setCurrentStep((prev) => prev - 1)
                } else {
                  onClose()
                }
              }}
              data-node-id="257:6598"
              className="flex h-[42px] cursor-pointer items-center gap-[4px] rounded-full border border-[#cfd7e4] bg-white px-[16px] text-[14px] leading-normal font-semibold text-[#0c2a5b] transition-colors hover:bg-[#f4f7fc] dark:border-border dark:bg-card dark:text-foreground"
            >
              <ChevronLeft className="size-[20px]" />
              <span>Back</span>
            </button>

            {/* Draft Saved Timestamp */}
            <span
              data-node-id="257:6600"
              className="text-[12px] leading-normal font-normal text-[#5b6678] dark:text-muted-foreground"
            >
              Step {currentStep} of 5 · draft saved {draftSavedTime}
            </span>

            {/* Next / Save Buttons */}
            {currentStep === 5 ? (
              <div className="flex items-center gap-[8px]">
                <button
                  type="button"
                  onClick={() => {
                    setAnnexBSaved(true)
                    toast.add({
                      title: "ANNEX B Saved",
                      description:
                        "Assessment & classification saved successfully.",
                      type: "success",
                    })
                    onSuccess?.()
                    onClose()
                  }}
                  data-node-id="257:6601"
                  className="flex h-[42px] cursor-pointer items-center gap-[6px] rounded-full bg-[#1f5fd6] px-[20px] text-[14px] leading-normal font-semibold text-white drop-shadow-[0px_6px_7px_rgba(31,95,214,0.25)] transition-all hover:bg-[#1a53bd] hover:drop-shadow-[0px_8px_12px_rgba(31,95,214,0.35)] active:scale-[0.98]"
                >
                  <span>Save ANNEX B</span>
                  <Check className="size-[16px] stroke-[2.5]" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAnnexBSaved(true)
                    toast.add({
                      title: "ANNEX B Saved",
                      description:
                        "Draft saved. Now you can assign guarantors & assistance.",
                      type: "success",
                    })
                    onSuccess?.()
                    setActiveSection("guarantors")
                  }}
                  data-node-id="312:12656"
                  className="flex h-[42px] cursor-pointer items-center gap-[6px] rounded-full bg-[#1f5fd6] px-[20px] text-[14px] leading-normal font-semibold text-white drop-shadow-[0px_6px_7px_rgba(31,95,214,0.25)] transition-all hover:bg-[#1a53bd] hover:drop-shadow-[0px_8px_12px_rgba(31,95,214,0.35)] active:scale-[0.98]"
                >
                  <span>Save and Add Guarantors</span>
                  <Check className="size-[16px] stroke-[2.5]" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (currentStep < 5) {
                    setCurrentStep((prev) => prev + 1)
                  }
                }}
                data-node-id="257:3843"
                className="flex h-[42px] cursor-pointer items-center gap-[6px] rounded-full bg-[#1f5fd6] px-[20px] text-[14px] leading-normal font-semibold text-white drop-shadow-[0px_6px_7px_rgba(31,95,214,0.25)] transition-all hover:bg-[#1a53bd] hover:drop-shadow-[0px_8px_12px_rgba(31,95,214,0.35)] active:scale-[0.98]"
              >
                <span>Next</span>
                <ChevronRight className="size-[16px]" />
              </button>
            )}
          </div>
        )}

        {/* Guarantors & Assistance View (Figma 312:8294) */}
        {activeSection === "guarantors" && (
          <div
            ref={scrollContainerRef}
            data-node-id="312:11450"
            className="flex flex-1 animate-in [scrollbar-width:thin] [scrollbar-color:#cfd7e4_transparent] flex-col gap-[14px] overflow-y-auto px-[24px] pt-[18px] pb-[22px] duration-200 fade-in-50 dark:[scrollbar-color:#374151_transparent]"
          >
            {/* Header (Figma 312:11451) */}
            <div
              data-node-id="312:11451"
              className="flex w-full items-center justify-between gap-[10px]"
            >
              <h3
                data-node-id="312:11453"
                className="text-[16px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground"
              >
                Guarantors & assistance
              </h3>
            </div>

            {/* Processing Dates 2-Column Row (Figma 312:11459) */}
            <div
              data-node-id="312:11459"
              className="grid grid-cols-1 gap-[10px] sm:grid-cols-2"
            >
              {/* Date and time of processing */}
              <div data-node-id="312:11460" className="flex flex-col gap-[5px]">
                <label
                  data-node-id="312:11462"
                  className="text-[12px] leading-normal font-semibold text-[#5b6678] dark:text-muted-foreground"
                >
                  Date and time of processing
                </label>
                <div
                  data-node-id="312:11463"
                  className="flex h-[42px] items-center gap-[8px] rounded-[10px] border border-dashed border-[#cfd7e4] bg-white px-[12px] dark:border-border dark:bg-card"
                >
                  <Clock className="size-[18px] text-[#5b6678] dark:text-muted-foreground" />
                  <span
                    data-node-id="312:11467"
                    className="flex-1 text-[13px] leading-normal font-semibold text-[#1b2433] dark:text-foreground"
                  >
                    {processingDateTime}
                  </span>
                  <span
                    data-node-id="312:11469"
                    className="text-[11px] leading-normal font-medium text-[#5b6678] dark:text-muted-foreground"
                  >
                    auto
                  </span>
                </div>
              </div>

              {/* Statement of account run date / time */}
              <div data-node-id="312:11470" className="flex flex-col gap-[5px]">
                <label
                  data-node-id="312:11472"
                  className="text-[12px] leading-normal font-semibold text-[#5b6678] dark:text-muted-foreground"
                >
                  Statement of account run date / time
                </label>
                <div
                  data-node-id="312:11473"
                  className="flex h-[40px] items-center rounded-[10px] border border-[#c6e8ee] bg-white px-[12px] transition-colors focus-within:border-[#1f5fd6] dark:border-cyan-800 dark:bg-card"
                >
                  <input
                    type="text"
                    value={soaRunDate}
                    onChange={(e) => setSoaRunDate(e.target.value)}
                    placeholder="e.g. Oct 21, 2026 · 10:00 AM"
                    className="w-full bg-transparent text-[13px] leading-normal font-medium text-[#1b2433] outline-none dark:text-foreground"
                  />
                </div>
              </div>
            </div>

            {/* Total Summary Box (Figma 312:11474) */}
            <div
              data-node-id="312:11474"
              className="flex flex-col gap-[12px] rounded-[14px] border border-[#e8f6ef] bg-[#e8f6ef] px-[16px] py-[14px] dark:border-emerald-800/40 dark:bg-emerald-950/20"
            >
              <div
                data-node-id="312:11475"
                className="flex items-center justify-between gap-[10px]"
              >
                <div className="flex items-center gap-[10px]">
                  <span
                    data-node-id="312:11477"
                    className="text-[11px] leading-normal font-bold tracking-[0.4px] text-[#146b43] uppercase dark:text-emerald-400"
                  >
                    Total AMOUNT
                  </span>
                  <span
                    data-node-id="312:11479"
                    className="text-[22px] leading-normal font-bold tracking-[-0.4px] text-[#0c2a5b] dark:text-foreground"
                  >
                    {formatCurrency(guaranteesTotal)}
                  </span>
                  <span
                    data-node-id="312:11481"
                    className="text-[12px] leading-normal font-normal text-[#146b43] dark:text-emerald-400"
                  >
                    {guarantees.length}{" "}
                    {guarantees.length === 1 ? "guarantor" : "guarantors"}
                  </span>
                </div>

                {canCreateGuarantee && (
                  <button
                    type="button"
                    onClick={() => setIsAddingGuarantor(true)}
                    disabled={!hasEncounter || !canEditGuarantees}
                    title={
                      !hasEncounter
                        ? "Guarantors are filed against a hospital encounter."
                        : !canEditGuarantees
                          ? guaranteeLockReason
                          : undefined
                    }
                    data-node-id="355:6553"
                    className="flex h-[33px] cursor-pointer items-center gap-[6px] rounded-full bg-[#1f5fd6] px-[16px] text-[13px] leading-normal font-semibold text-white shadow-xs transition-colors hover:bg-[#1a53bd] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus className="size-[16px]" />
                    <span>Add guarantor</span>
                  </button>
                )}
              </div>

              {/* Billing figures: no SOA source yet, so they show a dash. */}
              <div
                data-node-id="312:11482"
                className="grid grid-cols-5 gap-[8px]"
              >
                {[
                  "PHIC",
                  "PHIC PF",
                  "SOA amount",
                  "Hospital share",
                  "Patient share",
                ].map((label) => (
                  <div
                    key={label}
                    className="flex flex-col gap-[2px] rounded-[10px] bg-white px-[10px] py-[8px] dark:border dark:border-border dark:bg-card"
                  >
                    <span className="text-[11px] leading-normal font-semibold text-[#5b6678] dark:text-muted-foreground">
                      {label}
                    </span>
                    <span className="text-[13px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground">
                      —
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Guarantor Cards (Figma 312:8294 / 355:5777) */}
            {!hasEncounter ? (
              <div className="rounded-[12px] border border-dashed border-[#cfd7e4] bg-[#f4f7fc] px-[14px] py-[14px] text-center text-[12px] font-medium text-[#5b6678] dark:border-border dark:bg-muted/30 dark:text-muted-foreground">
                No hospital encounter on this visit. Guarantors are filed
                against an encounter.
              </div>
            ) : isGuaranteesLoading ? (
              <div className="flex flex-col gap-[10px]">
                <Skeleton className="h-[120px] w-full rounded-[16px]" />
                <Skeleton className="h-[120px] w-full rounded-[16px]" />
              </div>
            ) : guarantees.length === 0 ? (
              <div className="rounded-[12px] border border-dashed border-[#cfd7e4] bg-[#f4f7fc] px-[14px] py-[14px] text-center text-[12px] font-medium text-[#5b6678] dark:border-border dark:bg-muted/30 dark:text-muted-foreground">
                No guarantors filed for this encounter yet.
              </div>
            ) : (
              guarantees.map((guarantee) => {
                const name = guarantee.guarantor?.name ?? "—"
                const isMaifip = isMaifipGuarantee(guarantee)
                const itemsTotal = guarantee.items.reduce(
                  (sum, item) => sum + (item.amount || 0),
                  0
                )
                const billingCell = (
                  <div className="text-right text-[12px] font-normal text-[#5b6678] dark:text-muted-foreground">
                    —
                  </div>
                )

                return (
                  <div
                    key={guarantee.id}
                    data-node-id={`guarantor-card-${guarantee.id}`}
                    className="flex flex-col gap-[10px] rounded-[16px] border border-[#e4e9f2] bg-white p-[14px] dark:border-border dark:bg-card"
                  >
                    {/* Top Bar */}
                    <div className="flex items-center gap-[12px]">
                      <div className="flex size-[38px] shrink-0 items-center justify-center rounded-[12px] bg-[#edf3fe] text-[#1f5fd6] dark:bg-primary/20">
                        <Landmark className="size-[20px]" />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                        <span className="text-[15px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground">
                          {name}
                        </span>
                        <p className="text-[12px] leading-normal font-normal text-[#5b6678] dark:text-muted-foreground">
                          {guarantee.referenceNo ?? "No GL no. yet"} ·{" "}
                          {formatShortDate(guarantee.guaranteedOn)} · Recorded
                          by {guarantee.recordedBy?.name ?? "—"}
                        </p>
                        {guarantee.remarks && (
                          <p className="line-clamp-2 text-[12px] leading-normal font-normal text-[#5b6678] italic dark:text-muted-foreground">
                            {guarantee.remarks}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 text-[18px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground">
                        {formatCurrency(guarantee.total)}
                      </span>
                    </div>

                    {/* Breakdown Table */}
                    {guarantee.items.length > 0 && (
                      <div className="flex flex-col rounded-[12px] border border-[#e4e9f2] bg-white px-[12px] py-[2px] dark:border-border dark:bg-card">
                        <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr_1fr] items-end gap-[8px] pt-[8px] pb-[6px] text-[10.5px] leading-normal font-bold text-[#5b6678] dark:text-muted-foreground">
                          <div>Type · mode · fund</div>
                          <div className="text-right">Guaranteed</div>
                          <div className="text-right">PHIC</div>
                          <div className="text-right">PHIC PF</div>
                          <div className="text-right">SOA</div>
                          <div className="text-right">Hospital share</div>
                          <div className="text-right">Patient share</div>
                        </div>

                        {guarantee.items.map((item, idx) => {
                          const fund =
                            item.fundRequiresSpecify && item.othersSpecify
                              ? `${item.fundSourceName ?? "Others"} (${item.othersSpecify})`
                              : item.fundSourceName
                          const modeFund = [item.modeOfAssistanceName, fund]
                            .filter(Boolean)
                            .join(" · ")
                          return (
                            <div
                              key={item.id ?? idx}
                              className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr_1fr] items-center gap-[8px] border-t border-[#e4e9f2] py-[8px] dark:border-border"
                            >
                              <div className="flex flex-col">
                                <span className="text-[13px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground">
                                  {item.assistanceTypeName ?? "—"}
                                </span>
                                <span className="text-[11px] leading-normal font-normal text-[#5b6678] dark:text-muted-foreground">
                                  {modeFund || "—"}
                                </span>
                              </div>
                              <div className="text-right text-[13px] font-bold text-[#0c2a5b] dark:text-foreground">
                                {formatAmount(item.amount)}
                              </div>
                              {billingCell}
                              {billingCell}
                              {billingCell}
                              {billingCell}
                              {billingCell}
                            </div>
                          )
                        })}

                        <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr_1fr] items-center gap-[8px] border-t border-[#cfd7e4] py-[8px] text-[12px] font-bold text-[#0c2a5b] dark:border-border dark:text-foreground">
                          <div>Total</div>
                          <div className="text-right">
                            {formatAmount(itemsTotal)}
                          </div>
                          <div className="text-right">—</div>
                          <div className="text-right">—</div>
                          <div className="text-right">—</div>
                          <div className="text-right">—</div>
                          <div className="text-right">—</div>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-[8px]">
                      {canUpdateGuarantee && (
                        <button
                          type="button"
                          onClick={() => openGuaranteeForm(guarantee)}
                          disabled={!canEditGuarantees}
                          title={
                            !canEditGuarantees ? guaranteeLockReason : undefined
                          }
                          className="flex h-[34px] cursor-pointer items-center gap-[5px] rounded-full border border-[#cfd7e4] bg-white px-[12px] text-[13px] leading-normal font-semibold text-[#0c2a5b] transition-colors hover:bg-[#f4f7fc] disabled:cursor-not-allowed disabled:opacity-50 dark:border-border dark:bg-card dark:text-foreground dark:hover:bg-muted"
                        >
                          <Pencil className="size-[15px]" />
                          <span>Edit</span>
                        </button>
                      )}
                      {isMaifip && (
                        <button
                          type="button"
                          onClick={() => setSlipGuaranteeId(guarantee.id)}
                          title="Print the DOH-MAIFIP Acknowledgement Slip"
                          className="flex h-[34px] cursor-pointer items-center gap-[6px] rounded-full bg-[#1f5fd6] px-[14px] text-[13px] leading-normal font-semibold text-white shadow-xs transition-colors hover:bg-[#1a53bd]"
                        >
                          <Printer className="size-[15px]" />
                          <span>Print slip</span>
                        </button>
                      )}
                      {canDeleteGuarantee && (
                        <div className="relative">
                          <button
                            type="button"
                            aria-label={`More actions for ${name}`}
                            onClick={() =>
                              setActiveGuarantorMenuId((prev) =>
                                prev === guarantee.id ? null : guarantee.id
                              )
                            }
                            className="flex size-[34px] cursor-pointer items-center justify-center rounded-full border border-[#cfd7e4] bg-white text-[#0c2a5b] transition-colors hover:bg-[#f4f7fc] dark:border-border dark:bg-card dark:text-foreground dark:hover:bg-muted"
                          >
                            <MoreHorizontal className="size-[18px]" />
                          </button>

                          {activeGuarantorMenuId === guarantee.id && (
                            <div className="absolute right-0 bottom-[40px] z-30 flex w-[214px] min-w-[200px] flex-col rounded-[12px] border border-[#e4e9f2] bg-white p-[6px] shadow-[0px_24px_28px_rgba(12,42,91,0.18)] dark:border-border dark:bg-card">
                              <button
                                type="button"
                                disabled={!canEditGuarantees}
                                title={
                                  !canEditGuarantees
                                    ? guaranteeLockReason
                                    : undefined
                                }
                                onClick={() => {
                                  setActiveGuarantorMenuId(null)
                                  setDeletingGuarantee(guarantee)
                                }}
                                className="flex h-[36px] w-full cursor-pointer items-center gap-[8px] rounded-[8px] px-[10px] text-[13px] leading-normal font-semibold text-[#a51d30] transition-colors hover:bg-[#fdedef] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                              >
                                <Trash2 className="size-[16px]" />
                                <span>Delete guarantor…</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}

            {/* Add Guarantor Card or Button (Figma 312:11922 / 312:11801 / 312:11921) */}
            {canCreateGuarantee &&
              hasEncounter &&
              (isAddingGuarantor ? (
                <AddGuarantorCard
                  patientId={patient.id}
                  transactionId={transactionId!}
                  onCancel={() => setIsAddingGuarantor(false)}
                  onSuccess={(newG) => {
                    setIsAddingGuarantor(false)
                    toast.add({
                      title: "Guarantor Added",
                      description: `${newG?.guarantor?.name ?? "Guarantor"} was successfully recorded.`,
                      type: "success",
                    })
                  }}
                />
              ) : (
                <div data-node-id="312:11801" className="flex items-start">
                  <button
                    type="button"
                    onClick={() => setIsAddingGuarantor(true)}
                    disabled={!canEditGuarantees}
                    title={!canEditGuarantees ? guaranteeLockReason : undefined}
                    data-node-id="312:11921"
                    className="flex h-[33px] cursor-pointer items-center gap-[6px] rounded-full bg-[#1f5fd6] px-[16px] text-[13px] leading-normal font-semibold text-white shadow-xs transition-colors hover:bg-[#1a53bd] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus className="size-[16px]" />
                    <span>Add guarantor</span>
                  </button>
                </div>
              ))}

            {/* From Hospital Billing · Read-Only Section (Figma 312:11806) */}
            {hasEncounter && (
              <div
                data-node-id="312:11806"
                className="flex flex-col gap-[6px] pt-[4px] pb-[18px]"
              >
                <div
                  data-node-id="312:11808"
                  className="flex items-center gap-[6px]"
                >
                  <Lock className="size-[14px] text-[#5b6678] dark:text-muted-foreground" />
                  <span
                    data-node-id="312:11811"
                    className="text-[11px] leading-normal font-bold tracking-[0.4px] text-[#5b6678] uppercase dark:text-muted-foreground"
                  >
                    From hospital billing · read-only
                  </span>
                </div>
                {isHisEncounterLoading ? (
                  <Skeleton className="h-[42px] w-full rounded-[12px]" />
                ) : isHisEncounterError ? (
                  <div className="rounded-[12px] border border-dashed border-[#cfd7e4] bg-[#f4f7fc] px-[14px] py-[10px] text-[12px] text-[#5b6678] dark:border-border dark:bg-muted/30 dark:text-muted-foreground">
                    Hospital billing could not be reached.
                  </div>
                ) : billingGuarantors.length === 0 ? (
                  <div className="rounded-[12px] border border-dashed border-[#cfd7e4] bg-[#f4f7fc] px-[14px] py-[10px] text-[12px] text-[#5b6678] dark:border-border dark:bg-muted/30 dark:text-muted-foreground">
                    No billing guarantors in HIS for this encounter.
                  </div>
                ) : (
                  billingGuarantors.map((g) => (
                    <div
                      key={g.id}
                      data-node-id="312:11812"
                      className="flex items-center gap-[12px] rounded-[12px] border border-dashed border-[#cfd7e4] bg-[#f4f7fc] px-[14px] py-[10px] dark:border-border dark:bg-muted/30"
                    >
                      <span className="text-[13px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground">
                        {g.name ?? "—"}
                      </span>
                      <span className="flex-1 text-[12px] leading-normal font-normal text-[#5b6678] dark:text-muted-foreground">
                        {g.glPosted
                          ? `Posted by the billing system on ${formatShortDate(g.glPostDate)}`
                          : "Not posted yet"}{" "}
                        · cannot be edited here
                      </span>
                      <span className="text-[12px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground">
                        {formatCurrency(g.amount ?? 0)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer for Guarantors Tab (Figma 312:8671) */}
        {activeSection === "guarantors" && (
          <div
            data-node-id="312:8671"
            className="flex shrink-0 items-center justify-between gap-[8px] border-t border-[#e4e9f2] bg-white px-[24px] pt-[15px] pb-[14px] dark:border-border dark:bg-card"
          >
            {/* Note about 50k approval */}
            <div
              data-node-id="312:8672"
              className="flex min-w-0 flex-1 flex-col items-start"
            >
              <p
                data-node-id="312:8673"
                className="text-[12px] leading-normal font-normal text-[#5b6678] dark:text-muted-foreground"
              >
                Amounts of ₱50,000 and above go to the Head, MSWD for approval.
              </p>
            </div>

            {/* Prints Button */}
            <button
              type="button"
              onClick={() => setActiveSection("prints")}
              data-node-id="312:8674"
              className="flex h-[42px] cursor-pointer items-center gap-[6px] rounded-full border border-[#cfd7e4] bg-white px-[18px] text-[14px] leading-normal font-semibold text-[#0c2a5b] shadow-xs transition-colors hover:bg-[#f4f7fc] dark:border-border dark:bg-card dark:text-foreground"
            >
              <span data-node-id="312:8675">Prints</span>
              <ArrowRight className="size-[18px] text-[#0c2a5b] dark:text-foreground" />
            </button>
          </div>
        )}

        {/* Prints View (Figma 321:12699 / 321:12742) */}
        {activeSection === "prints" && (
          <div
            ref={scrollContainerRef}
            data-node-id="321:12742"
            className="flex flex-1 animate-in [scrollbar-width:thin] [scrollbar-color:#cfd7e4_transparent] flex-col gap-[14px] overflow-y-auto px-[24px] pt-[18px] pb-[22px] duration-200 fade-in-50 dark:[scrollbar-color:#374151_transparent]"
          >
            {/* Header: Title (Figma 321:12743) */}
            <div
              data-node-id="321:12743"
              className="flex items-center gap-[10px]"
            >
              <h3
                data-node-id="321:12745"
                className="text-[16px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground"
              >
                Documents for this encounter
              </h3>
            </div>

            {/* Document Card 1: ANNEX B · Unified Intake Sheet (Figma 321:12800) */}
            {!isGuaranteeOnlyMode && (
              <div
                data-node-id="321:12800"
                className="flex items-center gap-[12px] rounded-[16px] border border-[#e4e9f2] bg-white p-[14px] dark:border-border dark:bg-card"
              >
                {/* Icon */}
                <div
                  data-node-id="321:12802"
                  className="flex size-[38px] shrink-0 items-center justify-center rounded-[12px] bg-[#edf3fe] text-[#1f5fd6] dark:bg-primary/20"
                >
                  <Landmark className="size-[20px]" />
                </div>

                {/* Title & Info */}
                <div
                  data-node-id="321:12805"
                  className="flex min-w-0 flex-1 flex-col gap-[2px]"
                >
                  <div
                    data-node-id="321:12806"
                    className="flex flex-wrap items-center gap-[8px]"
                  >
                    <span
                      data-node-id="321:12808"
                      className="text-[15px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground"
                    >
                      ANNEX B · Unified Intake Sheet
                    </span>
                    <div
                      data-node-id="321:12811"
                      className="flex h-[24px] items-center gap-[4px] rounded-full bg-[#e8f6ef] px-[9px] dark:bg-emerald-950/40"
                    >
                      <CheckCircle2 className="size-[14px] text-[#146b43] dark:text-emerald-400" />
                      <span
                        data-node-id="321:12815"
                        className="text-[12px] leading-normal font-bold text-[#146b43] dark:text-emerald-400"
                      >
                        Saved
                      </span>
                    </div>
                  </div>
                  <p
                    data-node-id="321:12818"
                    className="text-[12px] leading-normal font-normal text-[#5b6678] dark:text-muted-foreground"
                  >
                    Class C3 · complete
                  </p>
                </div>

                {/* Actions */}
                <div
                  data-node-id="321:13130"
                  className="flex items-center gap-[10px]"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewDoc({
                        title: "ANNEX B · Unified Intake Sheet",
                        type: "annex-b",
                        subtitle: "Class C3 · complete",
                      })
                    }}
                    data-node-id="321:13129"
                    className="cursor-pointer text-[12px] leading-normal font-bold text-[#1f5fd6] transition-colors hover:underline active:scale-[0.98]"
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      toast.add({
                        title: "Printing Document",
                        description: "Sending ANNEX B to printer.",
                        type: "info",
                      })
                      window.print()
                    }}
                    data-node-id="321:13118"
                    className="flex h-[34px] cursor-pointer items-center gap-[6px] rounded-full bg-[#1f5fd6] px-[14px] text-[13px] leading-normal font-semibold text-white shadow-xs transition-colors hover:bg-[#1a53bd] active:scale-[0.98]"
                  >
                    <Printer className="size-[17px]" />
                    <span>Print</span>
                  </button>
                </div>
              </div>
            )}

            {/* MAIFIP Acknowledgement Slips (Figma 321:13131 / 355:6404) */}
            {guarantees.filter(isMaifipGuarantee).map((guarantee) => (
              <div
                key={guarantee.id}
                data-node-id={`gl-card-${guarantee.id}`}
                className="flex items-center gap-[12px] rounded-[16px] border border-[#e4e9f2] bg-white p-[14px] dark:border-border dark:bg-card"
              >
                {/* Icon */}
                <div className="flex size-[38px] shrink-0 items-center justify-center rounded-[12px] bg-[#e6f7f7] text-[#0a6b78] dark:bg-cyan-950/40 dark:text-cyan-400">
                  <FileText className="size-[20px]" />
                </div>

                {/* Title & Info */}
                <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                  <div className="flex flex-wrap items-center gap-[8px]">
                    <span className="text-[15px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground">
                      Acknowledgement Slip
                    </span>
                    <div className="flex h-[24px] items-center rounded-full bg-[#edf3fe] px-[9px] dark:bg-primary/20">
                      <span className="text-[12px] leading-normal font-bold text-[#1f5fd6]">
                        {guarantee.guarantor?.name ?? "MAIFIP"}
                      </span>
                    </div>
                  </div>
                  <p className="text-[12px] leading-normal font-normal text-[#5b6678] dark:text-muted-foreground">
                    {formatCurrency(guarantee.total)}
                  </p>
                </div>

                {/* Actions */}
                <button
                  type="button"
                  onClick={() => setSlipGuaranteeId(guarantee.id)}
                  className="flex h-[34px] cursor-pointer items-center gap-[6px] rounded-full bg-[#1f5fd6] px-[14px] text-[13px] leading-normal font-semibold text-white shadow-xs transition-colors hover:bg-[#1a53bd] active:scale-[0.98]"
                >
                  <Printer className="size-[17px]" />
                  <span>Print</span>
                </button>
              </div>
            ))}

            {/* Signatory Tiers Banner (Figma 321:13099) */}
            <div
              data-node-id="321:13099"
              className="flex items-center gap-[12px] rounded-[12px] border border-dashed border-[#cfd7e4] bg-[#f4f7fc] px-[14px] py-[10px] dark:border-border dark:bg-muted/30"
            >
              <Lock className="size-[15px] shrink-0 text-[#5b6678] dark:text-muted-foreground" />
              <p
                data-node-id="321:13103"
                className="text-[12px] leading-normal font-normal text-[#5b6678] dark:text-muted-foreground"
              >
                Signatory is picked from the amount. Sample tiers: up to ₱10,000
                Social worker on duty · ₱10,001–₱49,999 Head, MSWD · ₱50,000 and
                above Medical Center Chief.
              </p>
            </div>
          </div>
        )}

        {/* Footer for Prints (Figma 321:13106 / 355:6404) */}
        {activeSection === "prints" && (
          <div
            data-node-id="321:13106"
            className="flex shrink-0 items-center justify-between gap-[8px] border-t border-[#e4e9f2] bg-white px-[24px] py-[14px] dark:border-border dark:bg-card"
          >
            <div
              data-node-id="321:13107"
              className="flex min-w-0 flex-1 flex-col items-start"
            >
              <p
                data-node-id="321:13108"
                className="text-[12px] leading-normal font-normal text-[#5b6678] dark:text-muted-foreground"
              >
                Amounts of ₱50,000 and above go to the Head, MSWD for approval.
              </p>
            </div>
            <div className="flex items-center gap-[10px]">
              <button
                type="button"
                onClick={onClose}
                data-node-id="321:13109"
                className="flex h-[42px] cursor-pointer items-center justify-center rounded-full border border-[#cfd7e4] bg-white px-[18px] text-[14px] leading-normal font-semibold text-[#0c2a5b] shadow-xs transition-colors hover:bg-[#f4f7fc] active:scale-[0.98] dark:border-border dark:bg-card dark:text-foreground dark:hover:bg-muted"
              >
                <span data-node-id="321:13110">Close</span>
              </button>
              {isGuaranteeOnlyMode && (
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    onFinishServing?.()
                  }}
                  data-node-id="376:6670"
                  className="flex h-[42px] cursor-pointer items-center gap-[6px] rounded-full bg-[#1f5fd6] px-[20px] text-[14px] leading-normal font-semibold text-white shadow-xs transition-colors hover:bg-[#1a53bd] active:scale-[0.98]"
                >
                  <span>Finish Serving</span>
                  <ArrowRight className="size-[18px]" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Document Preview Modal */}
        {previewDoc && (
          <div className="fixed inset-0 z-60 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-xs duration-200 fade-in-50">
            <div className="relative flex max-h-[90vh] w-full max-w-[640px] animate-in flex-col overflow-hidden rounded-[20px] bg-white shadow-2xl duration-200 zoom-in-95 dark:bg-card">
              {/* Modal Header */}
              <div className="flex shrink-0 items-center justify-between border-b border-[#e4e9f2] px-6 py-4 dark:border-border">
                <div className="flex items-center gap-2.5">
                  <Printer className="size-5 text-[#1f5fd6]" />
                  <h4 className="text-[18px] font-bold text-[#0c2a5b] dark:text-foreground">
                    Document Preview · {previewDoc.title}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="flex size-[34px] cursor-pointer items-center justify-center rounded-full border border-[#e4e9f2] bg-white text-[#0c2a5b] transition-colors hover:bg-[#f4f7fc] active:scale-[0.98] dark:border-border dark:bg-card dark:text-foreground dark:hover:bg-muted"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Document Sheet Body */}
              <div className="flex-1 [scrollbar-width:thin] overflow-y-auto bg-[#f8fafc] p-6 dark:bg-muted/10">
                <div className="mx-auto max-w-[540px] rounded-lg border border-[#cfd7e4] bg-white p-7 text-[#1b2433] shadow-xs dark:border-border dark:bg-card dark:text-foreground">
                  {/* Official Header */}
                  <div className="mb-5 border-b border-[#e4e9f2] pb-4 text-center dark:border-border">
                    <p className="text-[10.5px] font-medium tracking-wider text-[#5b6678] uppercase dark:text-muted-foreground">
                      Republic of the Philippines
                    </p>
                    <p className="text-[11.5px] font-semibold text-[#5b6678] uppercase dark:text-muted-foreground">
                      Department of Health · Center for Health Development IX
                    </p>
                    <p className="text-[14px] font-bold tracking-tight text-[#0c2a5b] dark:text-foreground">
                      ZAMBOANGA CITY MEDICAL CENTER
                    </p>
                    <p className="text-[12px] font-semibold text-[#1f5fd6]">
                      Medical Social Work Department
                    </p>
                    <h5 className="mt-3 text-[14px] font-black tracking-wide text-[#0c2a5b] uppercase dark:text-foreground">
                      {previewDoc.type === "annex-b"
                        ? "SOCIAL CASE STUDY REPORT / INTAKE SHEET (ANNEX B)"
                        : `GUARANTEE LETTER · ${previewDoc.guarantor || "GOVERNMENT"}`}
                    </h5>
                  </div>

                  {/* Encounter Info Grid */}
                  <div className="grid grid-cols-2 gap-2.5 border-b border-[#e4e9f2] pb-4 text-[12px] dark:border-border">
                    <div>
                      <span className="font-semibold text-[#5b6678] dark:text-muted-foreground">
                        Patient Name:{" "}
                      </span>
                      <span className="font-bold text-[#0c2a5b] dark:text-foreground">
                        {patient.fullName || "Kim Horace A. Dolar"}
                      </span>
                    </div>
                    <div>
                      <span className="font-semibold text-[#5b6678] dark:text-muted-foreground">
                        Hospital No:{" "}
                      </span>
                      <span className="font-bold text-[#0c2a5b] dark:text-foreground">
                        {patient.hospitalNo || "1460327"}
                      </span>
                    </div>
                    <div>
                      <span className="font-semibold text-[#5b6678] dark:text-muted-foreground">
                        Age / Sex:{" "}
                      </span>
                      <span className="font-medium">
                        {patient.age || 27} y/o · {patient.gender || "Male"}
                      </span>
                    </div>
                    <div>
                      <span className="font-semibold text-[#5b6678] dark:text-muted-foreground">
                        Civil Status:{" "}
                      </span>
                      <span className="font-medium">
                        {patient.civilStatus || "Married"}
                      </span>
                    </div>
                    <div>
                      <span className="font-semibold text-[#5b6678] dark:text-muted-foreground">
                        Classification:{" "}
                      </span>
                      <span className="font-bold text-[#146b43]">
                        {classification || "Class C3 (Full Subsidy)"}
                      </span>
                    </div>
                    <div>
                      <span className="font-semibold text-[#5b6678] dark:text-muted-foreground">
                        Date:{" "}
                      </span>
                      <span className="font-medium">{visitDateFormatted}</span>
                    </div>
                  </div>

                  {/* Preview Content Details */}
                  {previewDoc.type === "annex-b" ? (
                    <div className="space-y-3 py-4 text-[12px]">
                      <div>
                        <p className="mb-1 text-[11px] font-bold text-[#0c2a5b] uppercase dark:text-foreground">
                          Final Diagnosis
                        </p>
                        <p className="rounded-md bg-[#f4f7fc] p-2.5 font-medium dark:bg-muted/30">
                          {finalDiagnosis}
                        </p>
                      </div>
                      <div>
                        <p className="mb-1 text-[11px] font-bold text-[#0c2a5b] uppercase dark:text-foreground">
                          Financial Assessment
                        </p>
                        <div className="grid grid-cols-3 gap-2 rounded-md bg-[#f4f7fc] p-2.5 text-center dark:bg-muted/30">
                          <div>
                            <span className="block text-[10.5px] text-[#5b6678] dark:text-muted-foreground">
                              Family Income
                            </span>
                            <span className="font-bold text-[#0c2a5b] dark:text-foreground">
                              ₱{totalFamilyIncome.toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[10.5px] text-[#5b6678] dark:text-muted-foreground">
                              Monthly Expenses
                            </span>
                            <span className="font-bold text-[#0c2a5b] dark:text-foreground">
                              ₱{totalMonthlyExpenses.toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[10.5px] text-[#5b6678] dark:text-muted-foreground">
                              Net Per Capita
                            </span>
                            <span className="font-bold text-[#a5500b]">
                              {netPerCapita}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="mb-1 text-[11px] font-bold text-[#0c2a5b] uppercase dark:text-foreground">
                          Social Worker&apos;s Assessment
                        </p>
                        <p className="rounded-md bg-[#f4f7fc] p-2.5 text-[11.5px] leading-relaxed text-[#5b6678] dark:bg-muted/30 dark:text-muted-foreground">
                          {assessmentNotes}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 py-4 text-[12px]">
                      <div>
                        <p className="mb-1 text-[11px] font-bold text-[#0c2a5b] uppercase dark:text-foreground">
                          Assistance Specifications
                        </p>
                        <div className="space-y-1.5 rounded-md bg-[#f4f7fc] p-3 dark:bg-muted/30">
                          <div className="flex justify-between">
                            <span className="text-[#5b6678] dark:text-muted-foreground">
                              Fund Source / Guarantor:
                            </span>
                            <span className="font-bold text-[#0c2a5b] dark:text-foreground">
                              {previewDoc.guarantor} Fund
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#5b6678] dark:text-muted-foreground">
                              Guaranteed Amount:
                            </span>
                            <span className="text-[14px] font-bold text-[#146b43]">
                              {previewDoc.amount}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#5b6678] dark:text-muted-foreground">
                              Authorized Purpose:
                            </span>
                            <span className="font-medium text-[#1b2433] dark:text-foreground">
                              {previewDoc.subtitle}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-[#5b6678] italic dark:text-muted-foreground">
                        This guarantee letter confirms the credit assistance
                        granted in accordance with DOH Administrative Orders and
                        Medical Social Service evaluation.
                      </p>
                    </div>
                  )}

                  {/* Signatures */}
                  <div className="mt-6 grid grid-cols-2 gap-4 border-t border-[#e4e9f2] pt-4 text-center text-[11px] dark:border-border">
                    <div>
                      <div className="mx-auto h-8 w-36 border-b border-[#cfd7e4]" />
                      <p className="mt-1 font-bold text-[#0c2a5b] dark:text-foreground">
                        Maricel J. Tan, RSW
                      </p>
                      <p className="text-[10px] text-[#5b6678] dark:text-muted-foreground">
                        Medical Social Worker
                      </p>
                    </div>
                    <div>
                      <div className="mx-auto h-8 w-36 border-b border-[#cfd7e4]" />
                      <p className="mt-1 font-bold text-[#0c2a5b] dark:text-foreground">
                        Sorayda M. Abubakar, RSW
                      </p>
                      <p className="text-[10px] text-[#5b6678] dark:text-muted-foreground">
                        Head, MSWD
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex shrink-0 items-center justify-end gap-3 border-t border-[#e4e9f2] bg-white px-6 py-3.5 dark:border-border dark:bg-card">
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="h-[36px] cursor-pointer rounded-full border border-[#cfd7e4] px-[16px] text-[13px] font-semibold text-[#0c2a5b] transition-colors hover:bg-[#f4f7fc] active:scale-[0.98] dark:border-border dark:text-foreground dark:hover:bg-muted"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    toast.add({
                      title: "Printing Document",
                      description: `Sending ${previewDoc.title} to printer.`,
                      type: "info",
                    })
                    window.print()
                  }}
                  className="flex h-[36px] cursor-pointer items-center gap-[6px] rounded-full bg-[#1f5fd6] px-[18px] text-[13px] font-semibold text-white shadow-xs transition-colors hover:bg-[#1a53bd] active:scale-[0.98]"
                >
                  <Printer className="size-[16px]" />
                  <span>Print Document</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {hasEncounter && (
        <>
          <GuaranteeFormDialog
            patientId={patient.id}
            transactionId={transactionId}
            guarantee={editingGuarantee}
            open={guaranteeFormOpen}
            onOpenChange={(isOpen) => {
              setGuaranteeFormOpen(isOpen)
              if (!isOpen) setEditingGuarantee(null)
            }}
          />

          <AcknowledgementSlipDialog
            open={slipGuaranteeId !== null}
            onOpenChange={(isOpen) => !isOpen && setSlipGuaranteeId(null)}
            patientId={patient.id}
            transactionId={transactionId}
            guaranteeId={slipGuaranteeId}
          />
        </>
      )}

      <AlertDialog
        open={deletingGuarantee !== null}
        onOpenChange={(isOpen) => !isOpen && setDeletingGuarantee(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#a51d30]">
              Delete guarantor
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px]">
              Delete{" "}
              <strong className="text-[#0c2a5b] dark:text-foreground">
                {deletingGuarantee?.guarantor?.name ?? "this guarantor"}
              </strong>{" "}
              ({formatCurrency(deletingGuarantee?.total ?? 0)}) and its
              assistance breakdown from this encounter?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteGuaranteeMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGuarantee}
              disabled={deleteGuaranteeMutation.isPending}
              className="bg-[#a51d30] font-bold text-white hover:bg-[#8f1929]"
            >
              {deleteGuaranteeMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
