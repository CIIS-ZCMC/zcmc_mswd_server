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
import { useAuth } from "@/features/auth/hooks/use-auth"
import { ApiError } from "@/lib/api-client"
import { useQueryClient } from "@tanstack/react-query"
import { openPdfInNewTab } from "@/lib/open-pdf"
import { printUisDirectly } from "@/features/cases/api/uis-print-api"
import {
  patientUisKeys,
  usePatientUis,
} from "@/features/cases/hooks/use-uis-prints"
import { CityMayorSlipDialog } from "@/features/hospital/components/dialogs/city-mayor-slip-dialog"
import { IndigencyCertificateDialog } from "@/features/hospital/components/dialogs/indigency-certificate-dialog"
import {
  useCreateAssessmentExpense,
  useCreateIntakeAssessment,
  useDeleteAssessmentExpense,
  useMswdClassificationMatrix,
  useUpdateAssessment,
  useUpdateAssessmentExpense,
} from "@/features/cases/hooks/use-assessment"
import { useSocioeconomic } from "@/features/socioeconomic/hooks/use-socioeconomic"
import {
  useAssistanceTypeOptions,
  useModeOfAssistanceOptions,
} from "@/features/library/hooks/use-lookup-options"
import { PsgcAddressFields } from "@/features/reference/components/psgc-address-fields"
import { EMPTY_PSGC_ADDRESS } from "@/features/reference/types/psgc.types"
import {
  useAddFamilyMember,
  useUpdateFamilyMember,
  useUpdatePatientBackground,
} from "../../hooks/use-patient-writes"
import {
  LIGHT_OPTIONS,
  PROBLEM_OPTIONS,
  RENT_EXPENSE_ID,
  WATER_OPTIONS,
  billableExpenses,
  bracketFor,
  buildAnnexBCreatePayload,
  buildAnnexBUpdatePayload,
  defaultExpenseLines,
  expenseLinesOf,
  netPerCapitaIncome,
  type AnnexBState,
  type ExpenseLine,
  type HouseTenure,
} from "../../lib/annex-b"
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

type FamilyMemberFormShape = FamilyMemberFormData

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

// Names the UIS section III slots recognise, so each amount prints in its place.
const PREDEFINED_EXPENSE_CATEGORIES = [
  "Education",
  "Clothing",
  "Insurance",
  "House help",
  "Medical",
  "Transportation",
  "Food",
  "Communication / Internet",
  "Loan / Debt amortization",
  "Light & water",
  "Other (specify)",
] as const

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
      : "—"

  const visitDateFormatted = useMemo(() => {
    const raw = activeVisit?.arrivedAt ?? activeVisit?.createdAt
    if (!raw) return "—"
    const d = new Date(raw)
    if (Number.isNaN(d.getTime())) return "—"
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }, [activeVisit])

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

  const [informantLastName, setInformantLastName] = useState(
    patient.lastName || parsedName.last || ""
  )
  const [informantFirstName, setInformantFirstName] = useState(
    patient.firstName || parsedName.first || ""
  )
  const [informantMiddleName, setInformantMiddleName] = useState(
    patient.middleName || parsedName.middle || ""
  )
  const [informantRelationship, setInformantRelationship] =
    useState("Patient (self)")
  const [informantContact, setInformantContact] = useState(
    patient.contactNo && patient.contactNo !== "N/A" ? patient.contactNo : ""
  )
  const [informantAddress, setInformantAddress] = useState(
    patient.presentAddressPsgc ?? EMPTY_PSGC_ADDRESS
  )
  // Only an address the worker touched, or one the intake already holds as PSGC, is sent.
  const [informantAddressTouched, setInformantAddressTouched] = useState(false)

  // Step 2 Inline Editor State
  const [isAddingMember, setIsAddingMember] = useState(initialAddingMember)
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null)

  // Patient's own income (Step 2): the patient's record, saved back on edit.
  const [localPatientIncome, setLocalPatientIncome] = useState<number>(() =>
    Number(patient.monthlyIncome ?? 0)
  )

  // Family members list (Step 2): the patient's record, saved back on edit.
  const [familyMembersList, setFamilyMembersList] = useState<FamilyMember[]>(
    () => patient.familyMembers ?? []
  )

  useEffect(() => {
    if (open) {
      setIsAddingMember(initialAddingMember)
      setEditingMemberId(null)
    }
  }, [open, initialAddingMember])

  useEffect(() => {
    setFamilyMembersList(patient.familyMembers ?? [])
  }, [patient.familyMembers])

  useEffect(() => {
    setLocalPatientIncome(Number(patient.monthlyIncome ?? 0))
  }, [patient.monthlyIncome])

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
  const [houseLotType, setHouseLotType] = useState<HouseTenure>("owned")
  const [monthlyRent, setMonthlyRent] = useState<number>(0)
  const [lightSources, setLightSources] = useState<string[]>([])
  const [waterSources, setWaterSources] = useState<string[]>([])
  const [expensesList, setExpensesList] = useState<ExpenseLine[]>(() =>
    defaultExpenseLines(null)
  )
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
        if (item.id === RENT_EXPENSE_ID) {
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
  // The encounter's diagnosis comes from the HIS; see `finalDiagnosis` below.
  const [selectedProblems, setSelectedProblems] = useState<string[]>([])
  const [typeOfAssistance, setTypeOfAssistance] = useState<string>("")
  const [otherAssistanceText, setOtherAssistanceText] = useState<string>("")
  const [medicalHistory, setMedicalHistory] = useState<string>("")

  const toggleProblem = (problem: string) => {
    setSelectedProblems((prev) =>
      prev.includes(problem)
        ? prev.filter((p) => p !== problem)
        : [...prev, problem]
    )
  }

  // Step 5 Assessment & Classification State (Figma 257:6456)
  const [assessmentNotes, setAssessmentNotes] = useState<string>("")
  // The recommendation is a Library mode of assistance, saved by its code.
  const [recommendationMode, setRecommendationMode] = useState<string>("")
  const [classOverride, setClassOverride] = useState<{
    code: string
    reason: string
  } | null>(null)
  const [isOverriding, setIsOverriding] = useState(false)
  const [overrideCode, setOverrideCode] = useState("")
  const [overrideReason, setOverrideReason] = useState("")

  const { user } = useAuth()
  const { data: matrix } = useMswdClassificationMatrix()

  // Net per capita and the class it falls in, as the server will work them out.
  const netPerCapitaValue = useMemo(
    () => netPerCapitaIncome(totalFamilyIncome, totalMonthlyExpenses, householdCount),
    [totalFamilyIncome, totalMonthlyExpenses, householdCount]
  )
  const netPerCapita = `₱${netPerCapitaValue.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
  const computedBracket = useMemo(
    () => bracketFor(matrix, netPerCapitaValue),
    [matrix, netPerCapitaValue]
  )
  const effectiveBracket = classOverride
    ? (matrix?.find((tier) => tier.code === classOverride.code) ?? null)
    : computedBracket
  const classification = effectiveBracket
    ? `Class ${effectiveBracket.code}`
    : "Class pending"
  const classificationCategory = effectiveBracket?.name ?? "Not classified yet"

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

  // The final diagnosis is the HIS encounter's, falling back to the patient's.
  const finalDiagnosis =
    hisEncounter?.finalDiagnosis ||
    hisEncounter?.impression ||
    hisEncounter?.dischargeDiagnosis ||
    (patient.diagnosis && patient.diagnosis !== "N/A"
      ? patient.diagnosis
      : "Not recorded")

  const deleteGuaranteeMutation = useDeleteGuarantee(
    patient.id,
    transactionId ?? undefined
  )

  const [soaRunDate, setSoaRunDate] = useState("")
  const processingDateTime = useMemo(() => {
    const raw = activeVisit?.startedAt ?? activeVisit?.arrivedAt
    if (!raw) return "—"
    const d = new Date(raw)
    if (Number.isNaN(d.getTime())) return "—"
    return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
  }, [activeVisit?.startedAt, activeVisit?.arrivedAt])
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

  // ---- The encounter's intake (at most one), and the patient's records it draws on.
  const { data: uisRows = [], isLoading: isUisLoading } = usePatientUis(
    patient.id
  )
  const uisRow = useMemo(
    () =>
      transactionId == null
        ? null
        : (uisRows.find(
            (r) =>
              r.encounter.transactionId != null &&
              Number(r.encounter.transactionId) === Number(transactionId)
          ) ?? null),
    [uisRows, transactionId]
  )
  const existing = uisRow?.uis.assessment ?? null
  const canTakeIntake = usePermission("intake.create")
  const canEditIntake = usePermission("intake.update")
  const canSaveAnnexB = existing ? canEditIntake : canTakeIntake

  const socioQuery = useSocioeconomic(patient.id)
  const socioCurrent = socioQuery.data?.current ?? null
  const { data: assistanceTypeOptions = [] } = useAssistanceTypeOptions(true)
  const { data: modeOptions = [] } = useModeOfAssistanceOptions(true)

  const intakeCaseId = existing?.caseId ?? 0
  const intakeId = existing?.id ?? 0
  const createIntake = useCreateIntakeAssessment(patient.id, transactionId)
  const updateIntake = useUpdateAssessment(intakeCaseId, intakeId)
  const createExpense = useCreateAssessmentExpense(intakeCaseId, intakeId)
  const updateExpense = useUpdateAssessmentExpense(intakeCaseId, intakeId)
  const deleteExpense = useDeleteAssessmentExpense(intakeCaseId, intakeId)
  const addFamilyMember = useAddFamilyMember(patient.id)
  const updateFamilyMember = useUpdateFamilyMember(patient.id)
  const updateBackground = useUpdatePatientBackground(patient.id)

  const [justSaved, setJustSaved] = useState(false)
  const [isSavingAnnexB, setIsSavingAnnexB] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const annexBSaved = Boolean(existing) || justSaved

  // Fill the wizard once per intake: from the saved one, else from the
  // patient's newest Socio-economic record.
  const hydratedKey = useRef<string | null>(null)
  const socioSettled = socioQuery.isFetched || socioQuery.fetchStatus === "idle"
  useEffect(() => {
    if (!open) {
      hydratedKey.current = null
      return
    }
    if (isUisLoading) return
    const key = existing ? `intake-${existing.id}` : "new"
    if (hydratedKey.current === key) return
    if (!existing && !socioSettled) return
    hydratedKey.current = key

    if (existing) {
      setInformantLastName(existing.informantLastName ?? "")
      setInformantFirstName(existing.informantFirstName ?? "")
      setInformantMiddleName(existing.informantMiddleName ?? "")
      setInformantRelationship(existing.informantRelationship ?? "")
      setInformantContact(existing.informantContact ?? "")
      if (existing.informantAddressPsgc) {
        setInformantAddress(existing.informantAddressPsgc)
      }
      setHouseLotType(existing.houseTenure === "rented" ? "rented" : "owned")
      setLightSources(existing.lightSource ?? [])
      setWaterSources(existing.waterSource ?? [])
      const lines = expenseLinesOf(existing)
      setExpensesList(lines)
      setMonthlyRent(lines.find((l) => l.id === RENT_EXPENSE_ID)?.amount ?? 0)
      setSelectedProblems(existing.problemCategories ?? [])
      const specify = existing.problemSpecify ?? ""
      if (specify.startsWith("Others")) {
        setTypeOfAssistance("Others")
        setOtherAssistanceText(specify.replace(/^Others:?\s*/, ""))
      } else {
        setTypeOfAssistance(specify)
      }
      setMedicalHistory(existing.medicalHistory ?? "")
      setAssessmentNotes(existing.assessmentNotes ?? "")
      setRecommendationMode(existing.recommendationMode ?? "")
      if (existing.hasOverride && existing.classification) {
        setClassOverride({
          code: existing.classification,
          reason: existing.classificationOverrideReason ?? "",
        })
      }
      return
    }

    if (socioCurrent) {
      const tenure = socioCurrent.house.tenure === "rented" ? "rented" : "owned"
      setHouseLotType(tenure)
      setMonthlyRent(Number(socioCurrent.house.rentAmount) || 0)
      setLightSources(
        socioCurrent.lightSource.filter((c) =>
          LIGHT_OPTIONS.some((o) => o.code === c)
        )
      )
      setWaterSources(
        socioCurrent.waterSource.filter((c) =>
          WATER_OPTIONS.some((o) => o.code === c)
        )
      )
      setExpensesList(defaultExpenseLines(socioCurrent))
    }
  }, [open, isUisLoading, existing, socioSettled, socioCurrent])

  // The wizard's state in the shape the intake API takes.
  const buildState = (): AnnexBState => ({
    informant: {
      lastName: informantLastName,
      firstName: informantFirstName,
      middleName: informantMiddleName,
      relationship: informantRelationship,
      contactNumber: informantContact,
      address: informantAddress,
      sendAddress:
        informantAddressTouched ||
        Boolean(existing?.informantAddressPsgc?.cityCode),
    },
    totalFamilyIncome,
    houseTenure: houseLotType,
    lightSources,
    waterSources,
    expenses: expensesList,
    presentingProblem: existing?.presentingProblem ?? finalDiagnosis,
    problemCategories: selectedProblems,
    assistanceType: typeOfAssistance,
    otherAssistance: otherAssistanceText,
    medicalHistory,
    assessmentNotes,
    recommendation:
      modeOptions.find((m) => m.value === recommendationMode)?.label ?? "",
    recommendationMode: recommendationMode || null,
    classificationOverride: classOverride,
  })

  // Brings the saved expense lines in line with the wizard's: delete the gone,
  // change the different, add the new. Matched by name.
  const syncExpenses = async (saved: NonNullable<typeof existing>["expenses"]) => {
    const wanted = billableExpenses(expensesList)
    const byName = new Map(saved.map((e) => [e.expenseType.trim().toLowerCase(), e]))
    const keep = new Set<number>()

    for (const want of wanted) {
      const match = byName.get(want.expense_type.toLowerCase())
      if (match) {
        keep.add(match.id)
        if (Number(match.amount) !== want.amount) {
          await updateExpense.mutateAsync({
            expenseId: match.id,
            payload: { amount: want.amount },
          })
        }
      } else {
        await createExpense.mutateAsync(want)
      }
    }
    for (const gone of saved) {
      if (!keep.has(gone.id)) await deleteExpense.mutateAsync(gone.id)
    }
  }

  /** Saves ANNEX B (creating the encounter's intake, or editing it). Returns whether it worked. */
  const saveAnnexB = async (): Promise<boolean> => {
    if (transactionId == null) {
      setSaveError("This visit has no hospital encounter to take an intake for.")
      return false
    }
    setSaveError(null)
    setIsSavingAnnexB(true)
    try {
      const state = buildState()
      if (existing) {
        // Expense lines first, so the class the server works out sees them.
        await syncExpenses(existing.expenses)
        await updateIntake.mutateAsync(buildAnnexBUpdatePayload(state))
      } else {
        await createIntake.mutateAsync(buildAnnexBCreatePayload(state))
      }
      setJustSaved(true)
      return true
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.firstValidationMessage || err.message
          : err instanceof Error
            ? err.message
            : "ANNEX B could not be saved."
      setSaveError(message)
      toast.add({ title: "ANNEX B not saved", description: message, type: "error" })
      return false
    } finally {
      setIsSavingAnnexB(false)
    }
  }

  const familyPayload = (data: FamilyMemberFormShape) => ({
    name: `${data.firstName} ${data.middleName ? data.middleName + " " : ""}${data.lastName}`.trim(),
    first_name: data.firstName || undefined,
    middle_name: data.middleName || null,
    last_name: data.lastName || undefined,
    relationship: data.relationship,
    birthdate: data.birthdate || undefined,
    sex: data.sex,
    civil_status: data.civilStatus || undefined,
    age: Number(data.age) || undefined,
    occupation: data.occupation,
    monthly_income: Number(data.monthlyIncome) || 0,
    educational_attainment: data.educationalAttainment || undefined,
    is_living_with_patient: data.isLivingWithPatient,
  })

  const [isRendered, setIsRendered] = useState(open)
  const [isVisible, setIsVisible] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const expenseRowsRef = useRef<HTMLDivElement>(null)
  const [newlyAddedExpenseId, setNewlyAddedExpenseId] = useState<string | null>(
    null
  )
  const queryClient = useQueryClient()
  const [cityMayorOpen, setCityMayorOpen] = useState(false)
  const [indigencyOpen, setIndigencyOpen] = useState(false)
  const [isPrintingAnnexB, setIsPrintingAnnexB] = useState(false)
  // A print is logged by the server; refresh what counts the printed letters.
  const refreshPrintCounts = () =>
    queryClient.invalidateQueries({ queryKey: patientUisKeys.all })

  const previewAnnexB = async () => {
    if (!existing) return
    try {
      // `preview` is not logged as a print.
      await openPdfInNewTab(`/assessments/${existing.id}/uis/pdf`, { preview: 1 })
    } catch (err) {
      toast.add({
        title: "Preview failed",
        description: err instanceof ApiError ? err.message : "Could not open the sheet.",
        type: "error",
      })
    }
  }

  const printAnnexB = async () => {
    if (!existing) return
    setIsPrintingAnnexB(true)
    try {
      await printUisDirectly({ assessmentId: existing.id })
      refreshPrintCounts()
    } catch (err) {
      toast.add({
        title: "Print failed",
        description: err instanceof ApiError ? err.message : "Could not print the sheet.",
        type: "error",
      })
    } finally {
      setIsPrintingAnnexB(false)
    }
  }

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
        if (cityMayorOpen || indigencyOpen) return
        onClose()
      }
    }
    if (open) {
      window.addEventListener("keydown", handleKeyDown)
      return () => window.removeEventListener("keydown", handleKeyDown)
    }
  }, [
    open,
    cityMayorOpen,
    indigencyOpen,
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
                      {classification}
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

                {/* Contact number */}
                <div className="flex flex-col gap-[5px]">
                  <label className="text-[12px] leading-normal font-semibold text-[#5b6678] dark:text-muted-foreground">
                    Contact number
                  </label>
                  <div className="flex h-[38px] w-full items-center rounded-[10px] border border-[#c6e8ee] bg-[#f1fafb] px-[12px] transition-colors focus-within:border-[#1f5fd6] focus-within:bg-white dark:border-border dark:bg-muted/40 dark:focus-within:bg-card">
                    <input
                      type="text"
                      value={informantContact}
                      onChange={(e) => setInformantContact(e.target.value)}
                      className="w-full bg-transparent text-[13px] font-medium text-[#1b2433] focus:outline-none dark:text-foreground"
                      placeholder="09XX XXX XXXX"
                    />
                  </div>
                </div>
              </div>

              {/* Informant address, picked from PSGC */}
              <PsgcAddressFields
                value={informantAddress}
                onChange={(next) => {
                  setInformantAddress(next)
                  setInformantAddressTouched(true)
                }}
                label="Informant address"
                legacyText={existing?.informantAddress ?? null}
              />
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
                {patient.firstName || patient.fullName.split(" ")[0] || "the patient"}
                &apos;s record. Ages are updated from birth dates. Edits here
                save back to the record.
              </p>
            </div>

            {/* Patient Entry or Inline Editor (Figma 283:4642 / 283:4106) */}
            {editingMemberId === "patient" ? (
              <FamilyMemberFormCard
                title="Edit Family Member"
                initialData={{
                  firstName: parsedName.first || "",
                  middleName: parsedName.middle || "",
                  lastName: parsedName.last || "",
                  birthdate: patient.birthDate ?? "",
                  age: patient.age ?? "",
                  sex: patient.gender === "Female" ? "Female" : "Male",
                  civilStatus: patient.civilStatus || "Single",
                  relationship: "Patient (self)",
                  educationalAttainment: patient.educationalAttainment ?? "",
                  occupation: patient.occupation ?? "",
                  monthlyIncome: localPatientIncome,
                  isLivingWithPatient: true,
                }}
                onSave={(data) => {
                  const income = Number(data.monthlyIncome) || 0
                  setLocalPatientIncome(income)
                  updateBackground.mutate({
                    monthly_income: income,
                    occupation: data.occupation,
                    educational_attainment: data.educationalAttainment,
                    civil_status: data.civilStatus,
                  })
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
                  {getInitials(patient.fullName)}
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
                      {patient.fullName}
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
                      {patient.age ?? "—"} · {patient.gender || "—"} ·{" "}
                      {patient.civilStatus || "—"} · Born{" "}
                      {patient.birthDate
                        ? new Date(patient.birthDate).toLocaleDateString(
                            "en-US"
                          )
                        : "—"}
                    </span>
                    <span>
                      {patient.educationalAttainment || "Education not recorded"}{" "}
                      · {patient.occupation || "Occupation not recorded"}
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
                  lastName: parsedName.last || "",
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
                  addFamilyMember.mutate(familyPayload(data), {
                    onSuccess: () => setIsAddingMember(false),
                    onError: (err) =>
                      toast.add({
                        title: "Family member not saved",
                        description:
                          err instanceof ApiError
                            ? err.firstValidationMessage || err.message
                            : "Could not add the family member.",
                        type: "error",
                      }),
                  })
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
                      updateFamilyMember.mutate(
                        { memberId: member.id, payload: familyPayload(data) },
                        {
                          onSuccess: () => setEditingMemberId(null),
                          onError: (err) =>
                            toast.add({
                              title: "Family member not saved",
                              description:
                                err instanceof ApiError
                                  ? err.firstValidationMessage || err.message
                                  : "Could not update the family member.",
                              type: "error",
                            }),
                        }
                      )
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
                : "—"

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
                From {parsedName.first || patient.firstName || "the patient"}&apos;s
                record
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
                    {LIGHT_OPTIONS.map(({ code: src, label }) => {
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
                            {label}
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
                    {WATER_OPTIONS.map(({ code: src, label }) => {
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
                            {label}
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
                From the hospital encounter and the patient&apos;s record
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
                {PROBLEM_OPTIONS.map(({ code: problem, label }) => {
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
                      <span>{label}</span>
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
                      {typeOfAssistance || "Select the type of assistance"}
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
                      {[
                        ...assistanceTypeOptions.map((o) => o.label),
                        "Others",
                      ].map((option) => {
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
                {typeOfAssistance === "Others" && (
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
                  setIsOverriding((open) => !open)
                  setOverrideCode(classOverride?.code ?? computedBracket?.code ?? "")
                  setOverrideReason(classOverride?.reason ?? "")
                }}
                data-node-id="257:6697"
                className="cursor-pointer text-[13px] leading-normal font-semibold text-[#1f5fd6] transition-colors hover:underline"
              >
                {classOverride ? "Change override" : "Override..."}
              </button>
            </div>

            {isOverriding && (
              <div className="flex flex-col gap-[10px] rounded-[14px] border border-[#fad5ac] bg-[#fff3e6] px-[16px] py-[14px] dark:border-amber-800/40 dark:bg-amber-950/20">
                <span className="text-[13px] font-semibold text-[#a5500b] dark:text-amber-400">
                  Override the class
                  {computedBracket ? ` (worked out: Class ${computedBracket.code})` : ""}
                </span>
                <div className="flex flex-wrap items-center gap-[8px]">
                  {(matrix ?? []).map((tier) => (
                    <button
                      key={tier.code}
                      type="button"
                      onClick={() => setOverrideCode(tier.code)}
                      className={cn(
                        "h-[34px] cursor-pointer rounded-full border px-[14px] text-[13px] font-semibold transition-colors",
                        overrideCode === tier.code
                          ? "border-[#1f5fd6] bg-[#1f5fd6] text-white"
                          : "border-[#cfd7e4] bg-white text-[#0c2a5b] hover:bg-[#f4f7fc] dark:border-border dark:bg-card dark:text-foreground"
                      )}
                    >
                      Class {tier.code}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Why is the class changed? (required)"
                  className="h-[38px] w-full rounded-[10px] border border-[#c6e8ee] bg-white px-[12px] text-[13px] font-medium text-[#1b2433] outline-none focus:border-[#1f5fd6] dark:border-border dark:bg-card dark:text-foreground"
                />
                <div className="flex items-center gap-[8px]">
                  <button
                    type="button"
                    disabled={!overrideCode || !overrideReason.trim()}
                    onClick={() => {
                      setClassOverride({
                        code: overrideCode,
                        reason: overrideReason.trim(),
                      })
                      setIsOverriding(false)
                    }}
                    className="h-[34px] cursor-pointer rounded-full bg-[#1f5fd6] px-[16px] text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Apply override
                  </button>
                  {classOverride && (
                    <button
                      type="button"
                      onClick={() => {
                        setClassOverride(null)
                        setIsOverriding(false)
                      }}
                      className="h-[34px] cursor-pointer rounded-full border border-[#cfd7e4] px-[16px] text-[13px] font-semibold text-[#0c2a5b] dark:border-border dark:text-foreground"
                    >
                      Use the worked-out class
                    </button>
                  )}
                </div>
              </div>
            )}

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
                      value={recommendationMode}
                      onChange={(e) => setRecommendationMode(e.target.value)}
                      className="w-full cursor-pointer appearance-none bg-transparent text-[14px] leading-normal font-medium text-[#1b2433] outline-none dark:text-foreground"
                    >
                      <option value="">Select a mode of assistance</option>
                      {modeOptions.map((mode) => (
                        <option key={mode.value} value={mode.value}>
                          {mode.label}
                        </option>
                      ))}
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
                    {existing?.interviewedBy ?? user?.employee_name ?? "—"}
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
              {saveError ?? `Step ${currentStep} of 5`}
            </span>

            {/* Next / Save Buttons */}
            {currentStep === 5 ? (
              <div className="flex items-center gap-[8px]">
                <button
                  type="button"
                  onClick={async () => {
                    if (!(await saveAnnexB())) return
                    toast.add({
                      title: "ANNEX B Saved",
                      description: "Assessment & classification saved.",
                      type: "success",
                    })
                    onSuccess?.()
                    onClose()
                  }}
                  disabled={isSavingAnnexB || !canSaveAnnexB || !canEditGuarantees}
                  title={
                    !canSaveAnnexB
                      ? "You cannot take or edit an intake."
                      : !canEditGuarantees
                        ? guaranteeLockReason
                        : undefined
                  }
                  data-node-id="257:6601"
                  className="flex h-[42px] cursor-pointer items-center gap-[6px] rounded-full bg-[#1f5fd6] px-[20px] text-[14px] leading-normal font-semibold text-white drop-shadow-[0px_6px_7px_rgba(31,95,214,0.25)] transition-all hover:bg-[#1a53bd] hover:drop-shadow-[0px_8px_12px_rgba(31,95,214,0.35)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span>
                    {isSavingAnnexB
                      ? "Saving..."
                      : existing
                        ? "Update ANNEX B"
                        : "Save ANNEX B"}
                  </span>
                  <Check className="size-[16px] stroke-[2.5]" />
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    if (!(await saveAnnexB())) return
                    toast.add({
                      title: "ANNEX B Saved",
                      description: "Now you can assign guarantors & assistance.",
                      type: "success",
                    })
                    onSuccess?.()
                    setActiveSection("guarantors")
                  }}
                  disabled={isSavingAnnexB || !canSaveAnnexB || !canEditGuarantees}
                  data-node-id="312:12656"
                  className="flex h-[42px] cursor-pointer items-center gap-[6px] rounded-full bg-[#1f5fd6] px-[20px] text-[14px] leading-normal font-semibold text-white drop-shadow-[0px_6px_7px_rgba(31,95,214,0.25)] transition-all hover:bg-[#1a53bd] hover:drop-shadow-[0px_8px_12px_rgba(31,95,214,0.35)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
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
                {guarantees.some((g) => g.approvalStatus === "pending")
                  ? "A guarantee is waiting for approval."
                  : "Every print is logged."}
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
                        {existing ? "Saved" : "Not saved yet"}
                      </span>
                    </div>
                  </div>
                  <p
                    data-node-id="321:12818"
                    className="text-[12px] leading-normal font-normal text-[#5b6678] dark:text-muted-foreground"
                  >
                    {existing
                      ? `${classification} · ${uisRow?.uis.ready ? "complete" : "incomplete"}${(uisRow?.uis.printCount ?? 0) > 0 ? ` · printed ${uisRow?.uis.printCount}x` : ""}`
                      : "Save ANNEX B to print it"}
                  </p>
                </div>

                {/* Actions */}
                <div
                  data-node-id="321:13130"
                  className="flex items-center gap-[10px]"
                >
                  <button
                    type="button"
                    onClick={() => void previewAnnexB()}
                    disabled={!existing}
                    data-node-id="321:13129"
                    className="cursor-pointer text-[12px] leading-normal font-bold text-[#1f5fd6] transition-colors hover:underline active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => void printAnnexB()}
                    disabled={!existing || isPrintingAnnexB}
                    data-node-id="321:13118"
                    className="flex h-[34px] cursor-pointer items-center gap-[6px] rounded-full bg-[#1f5fd6] px-[14px] text-[13px] leading-normal font-semibold text-white shadow-xs transition-colors hover:bg-[#1a53bd] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Printer className="size-[17px]" />
                    <span>{isPrintingAnnexB ? "Printing..." : "Print"}</span>
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
                    {guarantee.approvalStatus === "pending" && (
                      <span className="font-semibold text-[#8a5300] dark:text-amber-300">
                        {" "}
                        · Awaiting approval
                      </span>
                    )}
                    {guarantee.approvalStatus === "approved" && (
                      <span className="font-semibold text-[#146b43] dark:text-emerald-400">
                        {" "}
                        · Approved
                      </span>
                    )}
                  </p>
                </div>

                {/* Actions */}
                <button
                  type="button"
                  onClick={() => setSlipGuaranteeId(guarantee.id)}
                  disabled={guarantee.approvalStatus === "pending"}
                  title={
                    guarantee.approvalStatus === "pending"
                      ? "A guarantee of this size needs approval before it can be printed."
                      : undefined
                  }
                  className="flex h-[34px] cursor-pointer items-center gap-[6px] rounded-full bg-[#1f5fd6] px-[14px] text-[13px] leading-normal font-semibold text-white shadow-xs transition-colors hover:bg-[#1a53bd] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Printer className="size-[17px]" />
                  <span>Print</span>
                </button>
              </div>
            ))}

            {/* City Mayor slip and Certificate of Indigency, for the HIS encounter */}
            {hasEncounter &&
              [
                {
                  key: "city-mayor",
                  title: "City Mayor Acknowledgement Slip",
                  note: "ZCMC-F-MSS-04",
                  open: () => setCityMayorOpen(true),
                },
                {
                  key: "indigency",
                  title: "Certificate of Eligibility (Indigency)",
                  note: "Annex A",
                  open: () => setIndigencyOpen(true),
                },
              ].map((doc) => (
                <div
                  key={doc.key}
                  className="flex items-center gap-[12px] rounded-[16px] border border-[#e4e9f2] bg-white p-[14px] dark:border-border dark:bg-card"
                >
                  <div className="flex size-[38px] shrink-0 items-center justify-center rounded-[12px] bg-[#e6f7f7] text-[#0a6b78] dark:bg-cyan-950/40 dark:text-cyan-400">
                    <FileText className="size-[20px]" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                    <span className="text-[15px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground">
                      {doc.title}
                    </span>
                    <p className="text-[12px] leading-normal font-normal text-[#5b6678] dark:text-muted-foreground">
                      {doc.note}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={doc.open}
                    disabled={!hisEncounter}
                    className="flex h-[34px] cursor-pointer items-center gap-[6px] rounded-full bg-[#1f5fd6] px-[14px] text-[13px] leading-normal font-semibold text-white shadow-xs transition-colors hover:bg-[#1a53bd] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
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
                A guarantee of ₱50,000 or more is held for the Head or Supervisor
                to approve; its Acknowledgement Slip prints once it is approved.
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
            onOpenChange={(isOpen) => {
              if (!isOpen) {
                setSlipGuaranteeId(null)
                refreshPrintCounts()
              }
            }}
            patientId={patient.id}
            transactionId={transactionId}
            guaranteeId={slipGuaranteeId}
          />

          {hisEncounter && (
            <>
              <CityMayorSlipDialog
                open={cityMayorOpen}
                onOpenChange={(isOpen) => {
                  setCityMayorOpen(isOpen)
                  if (!isOpen) refreshPrintCounts()
                }}
                encounter={hisEncounter}
                patient={patient}
              />
              <IndigencyCertificateDialog
                open={indigencyOpen}
                onOpenChange={(isOpen) => {
                  setIndigencyOpen(isOpen)
                  if (!isOpen) refreshPrintCounts()
                }}
                encounter={hisEncounter}
                patient={patient}
                caseId={uisRow?.case?.id ?? null}
              />
            </>
          )}
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
