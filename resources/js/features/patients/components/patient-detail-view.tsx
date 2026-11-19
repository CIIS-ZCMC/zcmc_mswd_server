import React, { useEffect, useMemo, useState } from "react"
import { router } from "@inertiajs/react"
import { useSearchParams, useNavigate } from "@/lib/inertia-router-hooks"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { usePermission } from "@/features/auth/hooks/use-permission"
import {
  useAddFamilyMember,
  useDeleteFamilyMember,
  useUpdateFamilyMember,
} from "../hooks/use-patient-writes"
import type { FamilyMember, PatientRecord } from "../types"
import { FamilyMemberDialog } from "./dialogs/family-member-dialog"
import { OpenCaseDialog } from "@/features/cases/components/dialogs/open-case-dialog"
import { PatientQueueDialog } from "./dialogs/patient-queue-dialog"
import { PatientActiveQueueStatusDialog } from "./dialogs/patient-active-queue-status-dialog"
import { PatientIntakeDialog } from "./dialogs/patient-intake-dialog"
import {
  QueueActionGateProvider,
  QueueStatusBanner,
  pickActiveVisit,
  usePatientVisits,
  useQueueActionGate,
  useMarkDetailsChecked,
  useStartVisit,
  type ServiceVisit,
} from "@/features/queue"
import {
  detailsToCheck as listDetailsToCheck,
  detailsToCheckLabel,
} from "../lib/details-check"
import { usePatientUis } from "@/features/cases/hooks/use-uis-prints"
import { toast } from "@/components/ui/toast"
import { ApiError } from "@/lib/api-client"
import { DocumentsTab } from "./tabs/documents-tab"
import { FamilyTab } from "./tabs/family-tab"
import { HistoryTab } from "./tabs/history-tab"
import { HospitalEncountersTab } from "./tabs/hospital-encounters-tab"
import { ProfileTab } from "./tabs/profile-tab"
import { SocialCaseTab } from "./tabs/social-case-tab"
import { SocioeconomicTab } from "@/features/socioeconomic"
import { UisTab } from "./tabs/uis-tab"
import { WatchersTab } from "./tabs/watchers-tab"
import { CaseWatcherRequirement } from "./case-watcher-requirement"
import { cn } from "@/lib/utils"

interface PatientDetailViewProps {
  patient: PatientRecord
  onUpdatePatient?: (updatedPatient: PatientRecord) => void
}

const PATIENT_TABS = [
  "profile",
  "id",
  "socioeconomic",
  "hospital-encounters",
  "uis",
  "social-case",
  "watchers",
  "documents",
  "history",
]

function getInitials(name: string): string {
  const cleaned = name.replace(/,/g, " ").trim()
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "JD"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function getMssClassificationLabel(category?: string | null): string {
  if (!category) return "Unclassified"
  const lower = category.toLowerCase()
  if (lower.includes("indigent") || lower === "c3" || lower === "class c3") {
    return "Class C3 · 100% discount"
  }
  if (lower.includes("low") || lower === "c1" || lower === "c2") {
    return `${category} · Partial discount`
  }
  return category
}

function formatServingTimer(
  startedAt?: string | null,
  currentMs = Date.now()
): string {
  if (!startedAt) return "00:00"
  const startMs = new Date(startedAt).getTime()
  if (Number.isNaN(startMs)) return "00:00"
  const totalSecs = Math.max(0, Math.floor((currentMs - startMs) / 1000))
  const mins = Math.floor(totalSecs / 60)
  const secs = totalSecs % 60
  const mm = String(mins).padStart(2, "0")
  const ss = String(secs).padStart(2, "0")
  return `${mm}:${ss}`
}

/** Whole minutes from `iso` to `nowMs`, at least 1. */
function minutesSince(iso: string | null | undefined, nowMs: number): number {
  if (!iso) return 1
  const diffMs = nowMs - new Date(iso).getTime()
  if (Number.isNaN(diffMs) || diffMs < 0) return 1
  return Math.max(1, Math.floor(diffMs / 60000))
}

export const PatientDetailView: React.FC<PatientDetailViewProps> = (props) => {
  return (
    <QueueActionGateProvider patientId={props.patient.id}>
      <PatientDetailViewContent {...props} />
    </QueueActionGateProvider>
  )
}

const PatientDetailViewContent: React.FC<PatientDetailViewProps> = ({
  patient,
}) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const requestedTab = searchParams.get("tab")
  const rawTab =
    requestedTab && PATIENT_TABS.includes(requestedTab)
      ? requestedTab
      : "profile"
  const activeTab = rawTab === "id" ? "profile" : rawTab

  const setActiveTab = (tab: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set("tab", tab)
        return next
      },
      { replace: true }
    )
  }

  const [isOpenCaseOpen, setIsOpenCaseOpen] = useState(false)
  const [openCaseTransactionId, setOpenCaseTransactionId] = useState<
    number | undefined
  >(undefined)
  const [isAddFamilyOpen, setIsAddFamilyOpen] = useState(false)
  const [editingFamilyMember, setEditingFamilyMember] =
    useState<FamilyMember | null>(null)
  const [isQueueDialogOpen, setIsQueueDialogOpen] = useState(false)
  const [isActiveQueueStatusOpen, setIsActiveQueueStatusOpen] = useState(false)

  const canManageQueue = usePermission("queue.manage")
  const canCreateCase = usePermission("cases.create")
  const { getActionProps } = useQueueActionGate()
  const { user } = useAuth()

  const { data: visits = [] } = usePatientVisits(
    patient.id,
    undefined,
    canManageQueue
  )
  const activeVisit = useMemo(() => {
    const fromVisits = pickActiveVisit(visits, user?.id)
    if (fromVisits) return fromVisits
    if (patient.activeVisit) {
      return {
        id: patient.activeVisit.id,
        patientId: Number(patient.id),
        hisTransactionId: patient.activeVisit.hisTransactionId,
        status: patient.activeVisit.status,
        purpose: patient.activeVisit.purpose ?? null,
        remarks: null,
        arrivedAt: patient.activeVisit.arrivedAt ?? new Date().toISOString(),
        startedAt: null,
        completedAt: null,
        cancelledAt: null,
        cancelReason: null,
        waitingMinutes: null,
        processingMinutes: null,
        totalMinutes: null,
        withinTarget: { waiting: null, processing: null, total: null },
        receivedBy: null,
        servedBy: null,
        completedBy: null,
        cancelledBy: null,
        takenOverBy: null,
        takenOverAt: null,
        takeoverReason: null,
        detailsCheckedAt: patient.activeVisit.detailsCheckedAt ?? null,
        darEntryId: null,
        patient: null,
        createdAt: patient.activeVisit.arrivedAt ?? new Date().toISOString(),
        updatedAt: patient.activeVisit.arrivedAt ?? new Date().toISOString(),
      } satisfies ServiceVisit
    }
    return null
  }, [visits, user?.id, patient.activeVisit, patient.id])
  const { data: uisRows = [] } = usePatientUis(patient.id)
  const startVisitMutation = useStartVisit()
  const [nowMs, setNowMs] = useState<number>(() => Date.now())
  const markDetailsChecked = useMarkDetailsChecked()
  const [isIntakeOpen, setIsIntakeOpen] = useState(false)
  const [intakeSection, setIntakeSection] = useState<
    "annex-b" | "guarantors" | "prints"
  >("annex-b")

  // One clock for the serving timer and the waiting / serving minutes, so
  // render stays pure.
  useEffect(() => {
    if (!activeVisit?.status) return
    setNowMs(Date.now())
    const interval = setInterval(() => {
      setNowMs(Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [activeVisit?.status])

  const activeUisRow = useMemo(() => {
    if (!activeVisit) return uisRows[0] ?? null
    return (
      uisRows.find(
        (r) =>
          r.encounter.transactionId != null &&
          Number(r.encounter.transactionId) ===
            Number(activeVisit.hisTransactionId)
      ) ??
      uisRows[0] ??
      null
    )
  }, [activeVisit, uisRows])

  const isGuaranteeOnly = useMemo(() => {
    const purpose = (
      activeVisit?.purpose ??
      patient.activeVisit?.purpose ??
      ""
    ).toLowerCase()
    if (purpose.includes("guarantee")) return true
    if (purpose.includes("intake") || purpose.includes("annex")) return false
    if (activeUisRow?.uis.ready) return true
    if (patient.category && patient.category !== "Unclassified") return true
    return false
  }, [
    activeVisit?.purpose,
    patient.activeVisit?.purpose,
    activeUisRow?.uis.ready,
    patient.category,
  ])

  // Saved on the visit, so it survives a reload and shows to everyone.
  const detailsChecked = Boolean(activeVisit?.detailsCheckedAt)
  const detailsToCheck = useMemo(() => listDetailsToCheck(patient), [patient])

  const openIntakeFor = () => {
    setIntakeSection(isGuaranteeOnly ? "guarantors" : "annex-b")
    setIsIntakeOpen(true)
  }

  const handleDetailsChecked = async () => {
    if (!activeVisit) return
    try {
      await markDetailsChecked.mutateAsync(activeVisit.id)
      openIntakeFor()
    } catch (err) {
      toast.add({
        title: "Could not save",
        description:
          err instanceof ApiError
            ? err.message
            : "Failed to record that the details were checked.",
        type: "error",
      })
    }
  }

  const handleStartServingInline = async (silent = false) => {
    if (!activeVisit || activeVisit.status !== "waiting") return
    try {
      await startVisitMutation.mutateAsync(activeVisit.id)
      if (!silent) {
        toast.add({
          title: "Service Started",
          description: `Service has started for ${patient.fullName}.`,
          type: "success",
        })
      }
    } catch (err) {
      if (!silent) {
        const msg =
          err instanceof ApiError ? err.message : "Failed to start service."
        toast.add({
          title: "Action Failed",
          description: msg,
          type: "error",
        })
      }
    }
  }

  const addFamilyMember = useAddFamilyMember(patient.id)
  const updateFamilyMember = useUpdateFamilyMember(patient.id)
  const deleteFamilyMember = useDeleteFamilyMember(patient.id)

  const handleAddFamilyMember = (newFamily: Omit<FamilyMember, "id">) => {
    addFamilyMember.mutate({
      name: newFamily.fullName,
      first_name: newFamily.firstName || undefined,
      middle_name: newFamily.middleName || null,
      last_name: newFamily.lastName || undefined,
      extension_name: newFamily.extensionName || null,
      relationship: newFamily.relationship,
      birthdate: newFamily.birthdate || undefined,
      sex: newFamily.sex || undefined,
      civil_status: newFamily.civilStatus || undefined,
      age: newFamily.age,
      occupation: newFamily.occupation,
      monthly_income: newFamily.monthlyIncome,
      educational_attainment: newFamily.educationalAttainment || undefined,
      contact_number: newFamily.contactNumber || undefined,
      is_living_with_patient: newFamily.isLivingWithPatient,
    })
  }

  const handleUpdateFamilyMember = (
    memberId: string,
    updatedFamily: Omit<FamilyMember, "id">
  ) => {
    updateFamilyMember.mutate({
      memberId,
      payload: {
        name: updatedFamily.fullName,
        first_name: updatedFamily.firstName || undefined,
        middle_name: updatedFamily.middleName || null,
        last_name: updatedFamily.lastName || undefined,
        extension_name: updatedFamily.extensionName || null,
        relationship: updatedFamily.relationship,
        birthdate: updatedFamily.birthdate || undefined,
        sex: updatedFamily.sex || undefined,
        civil_status: updatedFamily.civilStatus || undefined,
        age: updatedFamily.age,
        occupation: updatedFamily.occupation,
        monthly_income: updatedFamily.monthlyIncome,
        educational_attainment:
          updatedFamily.educationalAttainment || undefined,
        contact_number: updatedFamily.contactNumber || undefined,
        is_living_with_patient: updatedFamily.isLivingWithPatient,
      },
    })
  }

  const handleDeleteFamilyMember = (memberId: string) => {
    deleteFamilyMember.mutate(memberId)
  }

  const wardLabel =
    patient.ward && patient.ward !== "N/A" && patient.ward.trim() !== ""
      ? patient.bedNo && patient.bedNo !== "N/A"
        ? `${patient.ward} (${patient.bedNo})`
        : patient.ward
      : "Ward not recorded"

  const primaryWatcher = patient.watchers?.[0]
  const watcherLabel = primaryWatcher
    ? `Watcher: ${primaryWatcher.fullName}${
        primaryWatcher.relationship
          ? ` (${primaryWatcher.relationship.toLowerCase()})`
          : ""
      }`
    : "Watcher: Not recorded"

  const diagnosisLabel =
    patient.diagnosis &&
    patient.diagnosis !== "N/A" &&
    patient.diagnosis.trim() !== ""
      ? patient.diagnosis
      : "Not recorded"

  const arrivedAt = activeVisit?.arrivedAt

  const visitDateFormatted = useMemo(() => {
    const d = arrivedAt ? new Date(arrivedAt) : new Date()
    if (Number.isNaN(d.getTime())) return "Today"
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }, [arrivedAt])

  const arrivedTimeFormatted = useMemo(() => {
    if (!arrivedAt) return "—"
    const d = new Date(arrivedAt)
    if (Number.isNaN(d.getTime())) return "—"
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })
  }, [arrivedAt])

  const waitingMinutes = !activeVisit
    ? 0
    : activeVisit.waitingMinutes != null
      ? Math.max(1, activeVisit.waitingMinutes)
      : minutesSince(activeVisit.arrivedAt, nowMs)

  const servingMinutes = minutesSince(activeVisit?.startedAt, nowMs)

  const visitSteps = useMemo(() => {
    const annexBReady = Boolean(activeUisRow?.uis.ready)
    const annexBStarted = Boolean(activeUisRow?.uis.hasAssessment)
    const guarantorsCount = activeUisRow?.guarantees.count ?? 0
    // UIS prints plus the MAIFIP, City Mayor and Indigency letters.
    const printCount =
      (activeUisRow?.uis.printCount ?? 0) +
      (activeUisRow?.letters.printCount ?? 0)
    const pendingApproval = activeUisRow?.guarantees.pendingApproval ?? 0
    const approvedCount = activeUisRow?.guarantees.approved ?? 0

    const queuedStep = {
      id: "queued",
      label: "Queued",
      subLabel: arrivedTimeFormatted,
      done: true,
      onClick: undefined,
    }

    const checkDetailsStep = {
      id: "check-details",
      label: "Check details",
      subLabel: detailsToCheckLabel(detailsToCheck, detailsChecked),
      done: detailsChecked,
      onClick: () => {
        setActiveTab("profile")
        if (activeVisit?.status === "waiting") {
          void handleStartServingInline(true)
        }
      },
    }

    const annexBStep = {
      id: "annex-b",
      label: "ANNEX B",
      subLabel: annexBReady
        ? "Complete"
        : annexBStarted
          ? "In progress"
          : "Not started",
      done: annexBReady,
      onClick: () => {
        setIntakeSection("annex-b")
        setIsIntakeOpen(true)
        if (activeVisit?.status === "waiting") {
          void handleStartServingInline(true)
        }
      },
    }

    const guarantorsStep = {
      id: "guarantors",
      label: "Guarantors",
      subLabel:
        guarantorsCount > 0 ? `${guarantorsCount} added` : "None yet",
      done: guarantorsCount > 0,
      onClick: () => {
        setIntakeSection("guarantors")
        setIsIntakeOpen(true)
        if (activeVisit?.status === "waiting") {
          void handleStartServingInline(true)
        }
      },
    }

    // Only a guarantee at or above the approval threshold needs the Head's sign-off.
    const approvalStep = {
      id: "approval",
      label: "Approval",
      subLabel:
        pendingApproval > 0
          ? "Waiting on approval"
          : approvedCount > 0
            ? "Approved"
            : "Not needed",
      done: pendingApproval === 0 && approvedCount > 0,
      onClick: () => {
        setIntakeSection("guarantors")
        setIsIntakeOpen(true)
      },
    }

    const lettersPrintedStep = {
      id: "letters-printed",
      label: "Letters printed",
      subLabel: printCount > 0 ? `${printCount} printed` : "—",
      done: printCount > 0,
      onClick: () => setActiveTab("uis"),
    }

    if (isGuaranteeOnly) {
      return [
        queuedStep,
        checkDetailsStep,
        guarantorsStep,
        approvalStep,
        lettersPrintedStep,
      ]
    }

    return [
      queuedStep,
      checkDetailsStep,
      annexBStep,
      guarantorsStep,
      approvalStep,
      lettersPrintedStep,
    ]
  }, [
    activeVisit,
    activeUisRow,
    arrivedTimeFormatted,
    detailsChecked,
    isGuaranteeOnly,
  ])

  return (
    <div
      data-node-id="144:717"
      className="flex h-full flex-col gap-[16px] overflow-y-auto bg-[#f4f7fc] px-[28px] pt-[4px] pb-[32px] text-[#0c2a5b] transition-colors duration-200 dark:bg-background dark:text-foreground"
    >
      {/* Breadcrumb & Top-Right Action Buttons Row */}
      <div
        data-node-id="144:718"
        className="flex w-full shrink-0 items-center justify-between gap-[12px]"
      >
        <div className="flex items-center gap-[8px]">
          <button
            type="button"
            onClick={() => router.visit("/")}
            className="cursor-pointer text-[13px] leading-normal font-semibold text-[#1f5fd6] hover:underline"
          >
            Patients
          </button>
          <span className="flex size-[16px] shrink-0 items-center justify-center">
            <img
              alt=""
              className="block size-[16px] max-w-none"
              src="/images/patient-registry/breadcrumb-chevron.svg"
            />
          </span>
          <span className="text-[13px] leading-normal font-semibold text-[#1b2433] dark:text-foreground">
            {patient.fullName}
          </span>
        </div>

        {activeVisit ? (
          <div
            data-node-id="225:3656"
            className="flex shrink-0 items-center gap-[8px]"
          >
            <button
              type="button"
              data-node-id="225:3657"
              onClick={() => setActiveTab("social-case")}
              className={cn(
                "flex h-[36px] shrink-0 cursor-pointer items-center gap-[6px] rounded-full border bg-white px-[14px] py-px text-[13px] leading-normal font-semibold text-[#0c2a5b] transition-colors hover:bg-[#f4f7fc] dark:border-border dark:bg-card dark:text-foreground",
                activeTab === "social-case"
                  ? "border-[#1f5fd6] ring-2 ring-[#1f5fd6]/20"
                  : "border-[#cfd7e4]"
              )}
            >
              <img
                alt=""
                className="block size-[18px] max-w-none"
                src="/images/patient-registry/print-case-study.svg"
              />
              <span>Print Case Study</span>
            </button>

            {canManageQueue && (
              <button
                type="button"
                data-node-id="225:3661"
                onClick={() => setIsActiveQueueStatusOpen(true)}
                className="flex h-[36px] shrink-0 cursor-pointer items-center gap-[6px] rounded-full border border-[#cfd7e4] bg-white px-[14px] py-px text-[13px] leading-normal font-semibold text-[#0c2a5b] transition-colors hover:bg-[#f4f7fc] dark:border-border dark:bg-card dark:text-foreground"
              >
                <img
                  alt=""
                  className="block size-[18px] max-w-none"
                  src="/images/patient-registry/edit-status.svg"
                />
                <span>Edit Status</span>
              </button>
            )}

            {canCreateCase && (
              <button
                type="button"
                data-node-id="225:3665"
                {...getActionProps("open a case")}
                onClick={() => {
                  setOpenCaseTransactionId(activeVisit.hisTransactionId)
                  setIsOpenCaseOpen(true)
                }}
                className="flex h-[36px] shrink-0 cursor-pointer items-center gap-[6px] rounded-full bg-[#1f5fd6] px-[16px] text-[13px] leading-normal font-semibold text-white shadow-[0px_6px_7px_rgba(31,95,214,0.25)] transition-colors hover:bg-[#1950b8] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <img
                  alt=""
                  className="block size-[18px] max-w-none"
                  src="/images/patient-registry/open-case-folder.svg"
                />
                <span>Open Case</span>
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setActiveTab("social-case")}
            data-node-id="144:731"
            className={cn(
              "flex h-[36px] shrink-0 cursor-pointer items-center gap-[6px] rounded-full border bg-white px-[14px] text-[13px] leading-normal font-semibold text-[#0c2a5b] transition-colors hover:bg-[#f4f7fc] dark:border-border dark:bg-card dark:text-foreground",
              activeTab === "social-case"
                ? "border-[#1f5fd6] ring-2 ring-[#1f5fd6]/20"
                : "border-[#cfd7e4]"
            )}
          >
            <img
              alt=""
              className="block size-[18px] max-w-none"
              src="/images/patient-registry/cases-folder.svg"
            />
            <span>Cases</span>
            <img
              alt=""
              className="block size-[18px] max-w-none"
              src="/images/patient-registry/ellipsis-vertical.svg"
            />
          </button>
        )}
      </div>

      {/* Patient Summary Header Card */}
      <section
        data-node-id={activeVisit ? "225:1351" : "225:2384"}
        className="flex w-full shrink-0 flex-col items-start justify-between gap-[20px] rounded-[16px] border border-[#e4e9f2] bg-white px-[24px] py-[22px] shadow-[0px_1px_1px_rgba(12,42,91,0.04),0px_2px_3px_rgba(12,42,91,0.05)] lg:flex-row dark:border-border dark:bg-card"
      >
        <div className="flex min-w-0 flex-1 items-start gap-[20px]">
          {/* Avatar */}
          <div className="flex size-[60px] shrink-0 items-center justify-center rounded-[16px] bg-[#edf3fe] text-[20px] leading-normal font-bold text-[#1f5fd6]">
            {getInitials(patient.fullName)}
          </div>

          {/* Info Column */}
          <div className="flex min-w-0 flex-1 flex-col gap-[8px]">
            <div className="flex flex-wrap items-center gap-[10px]">
              <h1 className="text-[24px] leading-[31.2px] font-bold tracking-[-0.4px] text-[#0c2a5b] dark:text-foreground">
                {patient.fullName}
              </h1>
              <span className="flex h-[28px] items-center rounded-full border border-[#cfd7e4] px-[11px] py-px text-[12px] leading-normal font-semibold text-[#5b6678] dark:border-border dark:text-muted-foreground">
                {patient.mswdNo}
              </span>

              {activeVisit?.status === "in_progress" && (
                <div
                  data-node-id="I225:3669;355:3850"
                  className="flex h-[22px] items-center gap-[5px] rounded-full bg-[#edf3fe] px-[9px] dark:bg-primary/10"
                >
                  <span className="size-[7px] rounded-full bg-[#1f5fd6]" />
                  <span className="text-[12px] font-bold leading-normal text-[#1f5fd6]">
                    Serving
                  </span>
                  <span className="font-mono text-[12px] font-bold leading-normal text-[#1f5fd6]">
                    {formatServingTimer(activeVisit.startedAt, nowMs)}
                  </span>
                </div>
              )}
            </div>

            {/* Metadata Row 1 & Row 2 */}
            <div className="flex flex-col gap-[6px]">
              <div className="flex flex-wrap items-center gap-x-[20px] gap-y-[6px] text-[13px] text-[#5b6678] dark:text-muted-foreground">
                <span className="inline-flex items-center gap-[6px]">
                  <img
                    alt=""
                    className="block size-[18px] max-w-none"
                    src="/images/patient-registry/hosp-id.svg"
                  />
                  <span>Hosp ID</span>
                  <strong className="font-mono text-[13px] font-bold text-[#1b2433] dark:text-foreground">
                    {patient.hospitalNo}
                  </strong>
                </span>

                <span className="inline-flex items-center gap-[6px]">
                  <img
                    alt=""
                    className="block size-[18px] max-w-none"
                    src="/images/patient-registry/meta-user.svg"
                  />
                  <span>
                    {patient.age} y/o · {patient.gender}
                  </span>
                </span>

                <span className="inline-flex items-center gap-[6px]">
                  <img
                    alt=""
                    className="block size-[18px] max-w-none"
                    src="/images/patient-registry/meta-ward.svg"
                  />
                  <span>{wardLabel}</span>
                </span>
              </div>

              <div className="flex items-center gap-[6px] text-[13px] text-[#5b6678] dark:text-muted-foreground">
                <img
                  alt=""
                  className="block size-[18px] max-w-none"
                  src="/images/patient-registry/meta-watcher.svg"
                />
                <span>{watcherLabel}</span>
              </div>
            </div>

            {/* Diagnosis Line */}
            <p className="text-[14px] leading-[21px] font-normal">
              <span className="text-[#5b6678] dark:text-muted-foreground">
                Diagnosis:{" "}
              </span>
              <span className="text-[#1b2433] dark:text-foreground">
                {diagnosisLabel}
              </span>
            </p>
          </div>
        </div>

        {/* Right: MSS Classification Box & Queue Patient Button (when not queued) */}
        <div className="flex shrink-0 flex-col items-end justify-center gap-[20px] self-stretch lg:self-start">
          <div className="flex items-center gap-[12px] rounded-[14px] border border-[#d9e6fc] bg-[#edf3fe] py-[11px] pr-[17px] pl-[13px] dark:border-primary/30 dark:bg-primary/10">
            <span className="flex size-[24px] shrink-0 items-center justify-center">
              <img
                alt=""
                className="block size-[24px] max-w-none"
                src="/images/patient-registry/mss-shield.svg"
              />
            </span>
            <div className="flex flex-col items-start">
              <span className="text-[12px] leading-normal font-semibold text-[#5b6678] dark:text-muted-foreground">
                MSS classification
              </span>
              <span className="text-[15px] leading-normal font-bold text-[#0c2a5b] whitespace-nowrap dark:text-foreground">
                {getMssClassificationLabel(patient.category)}
              </span>
            </div>
          </div>

          {canManageQueue && !activeVisit && (
            <button
              type="button"
              onClick={() => setIsQueueDialogOpen(true)}
              data-node-id="I225:2384;225:2372"
              className="flex shrink-0 cursor-pointer items-center gap-[6px] rounded-full bg-[#1f5fd6] px-[16px] py-[12px] text-[13px] leading-normal font-semibold text-white shadow-[0px_6px_7px_rgba(31,95,214,0.25)] transition-colors hover:bg-[#1950b8]"
            >
              <img
                alt=""
                className="block size-[20px] max-w-none"
                src="/images/patient-registry/queue-time.svg"
              />
              <span>Queue Patient</span>
            </button>
          )}
        </div>
      </section>

      {patient.openCases.map((openCase) => (
        <CaseWatcherRequirement
          key={openCase.id}
          caseId={openCase.id}
          patientId={Number(patient.id)}
          caseCode={
            patient.openCases.length > 1 ? openCase.caseCode : undefined
          }
        />
      ))}

      {/* Figma Node 225:3454 — Today's visit Card (when activeVisit exists) */}
      {activeVisit ? (
        <section
          data-node-id="225:3454"
          className="flex w-full shrink-0 flex-col gap-[16px] rounded-[16px] border border-[rgba(242,166,90,0.7)] bg-white px-[24px] pt-[18px] pb-[20px] shadow-[0px_2px_3px_rgba(12,42,91,0.05),0px_1px_1px_rgba(12,42,91,0.04)] dark:bg-card"
        >
          {/* Header Row */}
          <div className="flex flex-wrap items-center justify-between gap-[12px]">
            <div className="flex min-w-0 flex-1 items-center gap-[12px]">
              <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[17px] bg-[#edf3fe]">
                <img
                  alt=""
                  className="block size-[20px] max-w-none"
                  src="/images/patient-registry/visit-calendar.svg"
                />
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <h2 className="truncate text-[16px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground">
                  Today&apos;s visit · {visitDateFormatted}
                </h2>
                <p className="truncate text-[13px] leading-normal font-normal text-[#5b6678] dark:text-muted-foreground">
                  Encounter #{activeVisit.hisTransactionId} ·{" "}
                  {patient.admissionStatus && patient.admissionStatus !== "N/A"
                    ? patient.admissionStatus
                    : "Outpatient consultation"}{" "}
                  · {activeVisit.purpose || "Guarantee letter / Assistance"}
                </p>
              </div>
            </div>

            <div className="shrink-0 text-right text-[12px] leading-[18px] font-normal text-[#5b6678] dark:text-muted-foreground">
              {activeVisit.status === "in_progress"
                ? `Queued ${arrivedTimeFormatted} · serving ${servingMinutes} min`
                : `Queued ${arrivedTimeFormatted} · waiting ${waitingMinutes} min`}
            </div>
          </div>

          {/* Progress Stepper (5 steps for Guarantee Only, 6 steps for Standard) */}
          <div
            className={cn(
              "grid w-full grid-cols-2 gap-y-3",
              isGuaranteeOnly ? "sm:grid-cols-5" : "sm:grid-cols-6"
            )}
          >
            {visitSteps.map((step, index) => {
              const isFirst = index === 0
              const isLast = index === visitSteps.length - 1
              const isServing = activeVisit.status === "in_progress"
              const isStepDone = step.done
              const isStepActive =
                isServing &&
                ((step.id === "check-details" && !detailsChecked) ||
                  (isGuaranteeOnly
                    ? step.id === "guarantors" && detailsChecked && !step.done
                    : step.id === "annex-b" && detailsChecked && !step.done))
              const leftLineBlue =
                index > 0 && isServing && Boolean(visitSteps[index - 1]?.done)
              const rightLineBlue =
                index < visitSteps.length - 1 && isServing && Boolean(step.done)

              return (
                <div
                  key={step.id}
                  onClick={step.onClick}
                  className={cn(
                    "flex flex-col items-center gap-[8px]",
                    step.onClick && "group cursor-pointer"
                  )}
                >
                  <div className="flex w-full items-center">
                    <div
                      className={cn(
                        "h-[2px] flex-1",
                        isFirst
                          ? "bg-transparent"
                          : leftLineBlue
                            ? "bg-[#1f5fd6]"
                            : "bg-[#e4e9f2] dark:bg-border"
                      )}
                    />
                    <span
                      className={cn(
                        "flex size-[34px] shrink-0 items-center justify-center rounded-[17px] border-2 transition-colors",
                        isStepDone
                          ? "border-[#1f5fd6] bg-[#1f5fd6]"
                          : isStepActive
                            ? "border-[#1f5fd6] bg-white group-hover:border-[#1f5fd6]"
                            : "border-[#cfd7e4] bg-white group-hover:border-[#1f5fd6]/60 dark:border-border dark:bg-card"
                      )}
                    >
                      {isStepDone ? (
                        <img
                          alt=""
                          className="block size-[20px] max-w-none"
                          src="/images/patient-registry/visit-step-done.svg"
                        />
                      ) : isStepActive ? (
                        <span className="size-[10px] rounded-full bg-[#1f5fd6]" />
                      ) : (
                        <img
                          alt=""
                          className="block size-[18px] max-w-none"
                          src="/images/patient-registry/visit-step-pending.svg"
                        />
                      )}
                    </span>
                    <div
                      className={cn(
                        "h-[2px] flex-1",
                        isLast
                          ? "bg-transparent"
                          : rightLineBlue
                            ? "bg-[#1f5fd6]"
                            : "bg-[#e4e9f2] dark:bg-border"
                      )}
                    />
                  </div>
                  <div className="flex flex-col items-center gap-[2px] text-center">
                    <span
                      className={cn(
                        "text-[12px] leading-[15.6px] font-bold whitespace-nowrap",
                        isStepDone
                          ? "text-[#1b2433] dark:text-foreground"
                          : isStepActive
                            ? "text-[#1f5fd6]"
                            : "text-[#5b6678] dark:text-muted-foreground"
                      )}
                    >
                      {step.label}
                    </span>
                    <span className="text-[11px] leading-[14.3px] font-normal text-[#5b6678] whitespace-nowrap dark:text-muted-foreground">
                      {step.subLabel}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Callout Banner with Start serving or Next Step & Finish visit buttons */}
          {activeVisit.status === "in_progress" ? (
            <div
              data-node-id="I225:4137;225:3390"
              className="flex flex-wrap items-center justify-between gap-[14px] rounded-[14px] bg-[rgba(31,95,214,0.09)] px-[16px] py-[14px] dark:bg-primary/10"
            >
              <div className="flex min-w-0 flex-1 items-center gap-[14px]">
                <span className="flex size-[40px] shrink-0 items-center justify-center rounded-[12px] bg-white dark:bg-card">
                  <img
                    alt=""
                    className="block size-[22px] max-w-none"
                    src="/images/patient-registry/visit-next-step-megaphone.svg"
                  />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                  <span className="text-[11px] leading-normal font-bold tracking-[0.6px] text-[#1f5fd6] uppercase">
                    NEXT STEP
                  </span>
                  <span className="text-[15px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground">
                    {!detailsChecked
                      ? "Check the patient's details"
                      : isGuaranteeOnly
                        ? "Add guarantors for this visit"
                        : "Complete ANNEX B Intake"}
                  </span>
                  <span className="text-[13px] leading-normal font-normal text-[#5b6678] dark:text-muted-foreground">
                    {!detailsChecked
                      ? detailsToCheck.length > 0
                        ? `${detailsToCheck.length} to confirm with the patient: ${detailsToCheck.join(", ")}.`
                        : "Read the profile back to the patient and confirm it is current."
                      : isGuaranteeOnly
                        ? "Select assistance type and assign guarantors (GLs) to cover hospital bills."
                        : "Review and complete patient social case assessment."}
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-[10px]">
                {!detailsChecked ? (
                  activeTab !== "profile" && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("profile")}
                      className="flex h-[42px] shrink-0 cursor-pointer items-center justify-center gap-[6px] rounded-full bg-[#1f5fd6] px-[18px] text-[14px] leading-normal font-semibold text-white shadow-[0px_6px_7px_rgba(31,95,214,0.25)] transition-colors hover:bg-[#1950b8]"
                    >
                      <span>Check details</span>
                      <img
                        alt=""
                        className="block size-[20px] max-w-none"
                        src="/images/patient-registry/visit-start-arrow.svg"
                      />
                    </button>
                  )
                ) : isGuaranteeOnly ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIntakeSection("guarantors")
                      setIsIntakeOpen(true)
                    }}
                    className="flex h-[42px] shrink-0 cursor-pointer items-center justify-center gap-[6px] rounded-full bg-[#1f5fd6] px-[18px] text-[14px] leading-normal font-semibold text-white shadow-[0px_6px_7px_rgba(31,95,214,0.25)] transition-colors hover:bg-[#1950b8]"
                  >
                    <span>Add guarantors</span>
                    <img
                      alt=""
                      className="block size-[20px] max-w-none"
                      src="/images/patient-registry/visit-start-arrow.svg"
                    />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIntakeSection("annex-b")
                      setIsIntakeOpen(true)
                    }}
                    className="flex h-[42px] shrink-0 cursor-pointer items-center justify-center gap-[6px] rounded-full bg-[#1f5fd6] px-[18px] text-[14px] leading-normal font-semibold text-white shadow-[0px_6px_7px_rgba(31,95,214,0.25)] transition-colors hover:bg-[#1950b8]"
                  >
                    <span>Open ANNEX B</span>
                    <img
                      alt=""
                      className="block size-[20px] max-w-none"
                      src="/images/patient-registry/visit-start-arrow.svg"
                    />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsActiveQueueStatusOpen(true)}
                  className="flex h-[42px] shrink-0 cursor-pointer items-center justify-center gap-[6px] rounded-full border border-[#cfd7e4] bg-white px-[16px] text-[14px] leading-normal font-semibold text-[#0c2a5b] transition-colors hover:bg-[#f4f7fc] dark:border-border dark:bg-card dark:text-foreground"
                >
                  <img
                    alt=""
                    className="block size-[20px] max-w-none"
                    src="/images/patient-registry/visit-finish-check.svg"
                  />
                  <span>Finish visit</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-[14px] rounded-[14px] bg-[#fff5e0] px-[16px] py-[14px] dark:bg-amber-950/30">
              <div className="flex min-w-0 flex-1 items-center gap-[14px]">
                <span className="flex size-[40px] shrink-0 items-center justify-center rounded-[12px] bg-white dark:bg-card">
                  <img
                    alt=""
                    className="block size-[22px] max-w-none"
                    src="/images/patient-registry/visit-call-patient.svg"
                  />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                  <span className="text-[11px] leading-normal font-bold tracking-[0.6px] text-[#8a5300] uppercase dark:text-amber-300">
                    Waiting {waitingMinutes} min
                  </span>
                  <span className="text-[15px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground">
                    Call the patient and start serving
                  </span>
                  <span className="text-[13px] leading-normal font-normal text-[#5b6678] dark:text-muted-foreground">
                    {isGuaranteeOnly
                      ? "Starting also happens by itself when you open Check details or Guarantors."
                      : "Starting also happens by itself when you open Check details or ANNEX B."}
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-[10px]">
                <button
                  type="button"
                  disabled={startVisitMutation.isPending}
                  onClick={() => void handleStartServingInline(false)}
                  className="flex h-[42px] shrink-0 cursor-pointer items-center justify-center gap-[6px] rounded-full bg-[#1f5fd6] px-[18px] text-[14px] leading-normal font-semibold text-white shadow-[0px_6px_7px_rgba(31,95,214,0.25)] transition-colors hover:bg-[#1950b8] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span>
                    {startVisitMutation.isPending
                      ? "Starting..."
                      : "Start serving"}
                  </span>
                  <img
                    alt=""
                    className="block size-[20px] max-w-none"
                    src="/images/patient-registry/visit-start-arrow.svg"
                  />
                </button>

                <button
                  type="button"
                  onClick={() => setIsActiveQueueStatusOpen(true)}
                  className="flex h-[42px] shrink-0 cursor-pointer items-center justify-center gap-[6px] rounded-full border border-[#cfd7e4] bg-white px-[16px] text-[14px] leading-normal font-semibold text-[#0c2a5b] transition-colors hover:bg-[#f4f7fc] dark:border-border dark:bg-card dark:text-foreground"
                >
                  <img
                    alt=""
                    className="block size-[20px] max-w-none"
                    src="/images/patient-registry/visit-finish-check.svg"
                  />
                  <span>Finish visit</span>
                </button>
              </div>
            </div>
          )}
        </section>
      ) : (
        <QueueStatusBanner
          onQueuePatient={() => setIsQueueDialogOpen(true)}
        />
      )}

      {/* 5 Pill Tabs Row */}
      <div
        data-node-id="202:2503"
        className="flex flex-wrap items-center gap-[10px]"
      >
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={cn(
            "flex shrink-0 cursor-pointer items-center justify-center gap-[6px] rounded-full px-[16px] py-[10px] text-[12px] leading-normal font-semibold transition-all",
            activeTab === "profile"
              ? "bg-[#0c2a5b] text-white"
              : "border border-[#e4e9f2] bg-white text-[#5b6678] hover:bg-[#f4f7fc] dark:border-border dark:bg-card dark:text-muted-foreground"
          )}
        >
          <img
            alt=""
            className="block size-[20px] max-w-none"
            src={
              activeTab === "profile"
                ? "/images/patient-registry/tab-user-active.svg"
                : "/images/patient-registry/tab-user.svg"
            }
          />
          <span>Profile &amp; IDs</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("socioeconomic")}
          className={cn(
            "flex shrink-0 cursor-pointer items-center justify-center gap-[6px] rounded-full px-[16px] py-[10px] text-[12px] leading-normal font-semibold transition-all",
            activeTab === "socioeconomic"
              ? "bg-[#0c2a5b] text-white"
              : "border border-[#e4e9f2] bg-white text-[#5b6678] hover:bg-[#f4f7fc] dark:border-border dark:bg-card dark:text-muted-foreground"
          )}
        >
          <img
            alt=""
            className={cn(
              "block size-[20px] max-w-none",
              activeTab === "socioeconomic" && "brightness-0 invert"
            )}
            src="/images/patient-registry/tab-banknotes.svg"
          />
          <span>Household &amp; Finances</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("hospital-encounters")}
          className={cn(
            "flex shrink-0 cursor-pointer items-center justify-center gap-[6px] rounded-full px-[16px] py-[10px] text-[12px] leading-normal font-semibold transition-all",
            activeTab === "hospital-encounters"
              ? "bg-[#0c2a5b] text-white"
              : "border border-[#e4e9f2] bg-white text-[#5b6678] hover:bg-[#f4f7fc] dark:border-border dark:bg-card dark:text-muted-foreground"
          )}
        >
          <img
            alt=""
            className={cn(
              "block size-[20px] max-w-none",
              activeTab === "hospital-encounters" && "brightness-0 invert"
            )}
            src="/images/patient-registry/tab-encounters.svg"
          />
          <span>Hospital Encounters</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("uis")}
          className={cn(
            "flex shrink-0 cursor-pointer items-center justify-center gap-[6px] rounded-full px-[16px] py-[10px] text-[12px] leading-normal font-semibold transition-all",
            activeTab === "uis"
              ? "bg-[#0c2a5b] text-white"
              : "border border-[#e4e9f2] bg-white text-[#5b6678] hover:bg-[#f4f7fc] dark:border-border dark:bg-card dark:text-muted-foreground"
          )}
        >
          <img
            alt=""
            className="block size-[20px] max-w-none"
            src={
              activeTab === "uis"
                ? "/images/patient-registry/tab-document-active.svg"
                : "/images/patient-registry/tab-document.svg"
            }
          />
          <span>Intake Sheets</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("watchers")}
          className={cn(
            "flex shrink-0 cursor-pointer items-center justify-center gap-[6px] rounded-full px-[16px] py-[10px] text-[12px] leading-normal font-semibold transition-all",
            activeTab === "watchers"
              ? "bg-[#0c2a5b] text-white"
              : "border border-[#e4e9f2] bg-white text-[#5b6678] hover:bg-[#f4f7fc] dark:border-border dark:bg-card dark:text-muted-foreground"
          )}
        >
          <img
            alt=""
            className={cn(
              "block size-[20px] max-w-none",
              activeTab === "watchers" && "brightness-0 invert"
            )}
            src="/images/patient-registry/tab-watchers.svg"
          />
          <span>Watchers</span>
        </button>
      </div>

      {/* Active Tab Content */}
      <div className="w-full">
        {activeTab === "profile" && (
          <ProfileTab
            patient={patient}
            showCheckDetailsBanner={
              activeVisit?.status === "in_progress" && !detailsChecked
            }
            detailsToCheck={detailsToCheck}
            detailsCheckPending={markDetailsChecked.isPending}
            onDetailsChecked={() => void handleDetailsChecked()}
            onOpenAddFamilyDialog={() => setIsAddFamilyOpen(true)}
            onOpenEditFamilyDialog={(member) => setEditingFamilyMember(member)}
            onDeleteFamilyMember={handleDeleteFamilyMember}
          />
        )}

        {activeTab === "socioeconomic" && (
          <div className="space-y-6">
            <FamilyTab
              patient={patient}
              onOpenAddFamilyDialog={() => setIsAddFamilyOpen(true)}
              onOpenEditFamilyDialog={(member) =>
                setEditingFamilyMember(member)
              }
              onDeleteFamilyMember={handleDeleteFamilyMember}
            />
            <SocioeconomicTab patient={patient} />
          </div>
        )}

        {activeTab === "hospital-encounters" && (
          <HospitalEncountersTab patient={patient} />
        )}

        {activeTab === "uis" && (
          <UisTab
            patient={patient}
            onOpenCaseNeeded={(transactionId) => {
              setOpenCaseTransactionId(transactionId ?? undefined)
              setIsOpenCaseOpen(true)
            }}
          />
        )}

        {activeTab === "social-case" && (
          <SocialCaseTab
            caseId={patient.latestCaseId}
            patientId={Number(patient.id)}
            patientName={patient.fullName}
            showCaseContext={true}
          />
        )}

        {activeTab === "watchers" && (
          <WatchersTab
            patient={patient}
            patientId={Number(patient.id)}
            openCases={patient.openCases}
          />
        )}

        {activeTab === "documents" && <DocumentsTab patient={patient} />}

        {activeTab === "history" && <HistoryTab patient={patient} />}
      </div>

      {/* Bottom 2-Card Strip: Documents & History */}
      <div
        data-node-id="385:4762"
        className="grid w-full grid-cols-1 gap-[14px] md:grid-cols-2"
      >
        {/* Documents Card */}
        <button
          type="button"
          onClick={() => setActiveTab("documents")}
          data-node-id="385:4732"
          className={cn(
            "flex cursor-pointer items-center gap-[12px] rounded-[16px] border bg-white px-[18px] py-[16px] text-left shadow-[0px_1px_1px_rgba(12,42,91,0.04),0px_2px_3px_rgba(12,42,91,0.05)] transition-all hover:border-[#1f5fd6]/50 dark:bg-card",
            activeTab === "documents"
              ? "border-[#1f5fd6] ring-2 ring-[#1f5fd6]/20"
              : "border-[#e4e9f2] dark:border-border"
          )}
        >
          <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[17px] bg-[#edf3fe]">
            <img
              alt=""
              className="block size-[20px] max-w-none"
              src="/images/patient-registry/card-documents.svg"
            />
          </span>

          <div className="flex min-w-0 flex-1 flex-col items-start">
            <span className="text-[15px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground">
              Documents
            </span>
            <span className="text-[12px] leading-normal font-normal text-[#5b6678] dark:text-muted-foreground">
              Uploaded files and scans
            </span>
          </div>

          <span className="flex h-[24px] min-w-[24px] shrink-0 items-center justify-center rounded-full bg-[#edf3fe] px-[8px] text-[12px] leading-[24px] font-bold text-[#1f5fd6]">
            {patient.documents.length}
          </span>

          <span className="flex size-[22px] shrink-0 items-center justify-center">
            <img
              alt=""
              className="block size-[22px] max-w-none"
              src="/images/patient-registry/card-chevron.svg"
            />
          </span>
        </button>

        {/* History Card */}
        <button
          type="button"
          onClick={() => setActiveTab("history")}
          data-node-id="385:4744"
          className={cn(
            "flex cursor-pointer items-center gap-[12px] rounded-[16px] border bg-white px-[18px] py-[16px] text-left shadow-[0px_1px_1px_rgba(12,42,91,0.04),0px_2px_3px_rgba(12,42,91,0.05)] transition-all hover:border-[#1f5fd6]/50 dark:bg-card",
            activeTab === "history"
              ? "border-[#1f5fd6] ring-2 ring-[#1f5fd6]/20"
              : "border-[#e4e9f2] dark:border-border"
          )}
        >
          <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[17px] bg-[#edf3fe]">
            <img
              alt=""
              className="block size-[20px] max-w-none"
              src="/images/patient-registry/card-history.svg"
            />
          </span>

          <div className="flex min-w-0 flex-1 flex-col items-start">
            <span className="text-[15px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground">
              History
            </span>
            <span className="text-[12px] leading-normal font-normal text-[#5b6678] dark:text-muted-foreground">
              Every change to this record
            </span>
          </div>

          <span className="flex h-[24px] min-w-[24px] shrink-0 items-center justify-center rounded-full bg-[#edf3fe] px-[8px] text-[12px] leading-[24px] font-bold text-[#1f5fd6]">
            {patient.history.length}
          </span>

          <span className="flex size-[22px] shrink-0 items-center justify-center">
            <img
              alt=""
              className="block size-[22px] max-w-none"
              src="/images/patient-registry/card-chevron.svg"
            />
          </span>
        </button>
      </div>

      {/* Dialogs */}
      <FamilyMemberDialog
        isOpen={isAddFamilyOpen || editingFamilyMember !== null}
        initialMember={editingFamilyMember}
        patientCivilStatus={patient.civilStatus}
        existingMembers={patient.familyMembers}
        onClose={() => {
          setIsAddFamilyOpen(false)
          setEditingFamilyMember(null)
        }}
        onAddFamilyMember={handleAddFamilyMember}
        onUpdateFamilyMember={handleUpdateFamilyMember}
      />

      <OpenCaseDialog
        open={isOpenCaseOpen}
        onOpenChange={setIsOpenCaseOpen}
        patientId={patient.id}
        patientName={patient.fullName}
        hospitalNumber={patient.hospitalNo}
        transactionId={openCaseTransactionId}
        onCaseOpened={(newCase) => {
          setIsOpenCaseOpen(false)
          if (newCase?.id) {
            navigate(`/cases/${newCase.id}`)
          }
        }}
      />

      <PatientQueueDialog
        open={isQueueDialogOpen}
        onOpenChange={setIsQueueDialogOpen}
        patient={patient}
      />

      <PatientActiveQueueStatusDialog
        open={isActiveQueueStatusOpen}
        onOpenChange={setIsActiveQueueStatusOpen}
        patient={patient}
        activeVisit={activeVisit}
      />

      <PatientIntakeDialog
        open={isIntakeOpen}
        onClose={() => setIsIntakeOpen(false)}
        patient={patient}
        activeVisit={activeVisit}
        initialSection={intakeSection}
        isGuaranteeOnly={isGuaranteeOnly}
        onFinishServing={() => setIsActiveQueueStatusOpen(true)}
        servingTimer={formatServingTimer(activeVisit?.startedAt, nowMs)}
        onOpenAddFamilyMember={() => setIsAddFamilyOpen(true)}
        onOpenEditFamilyMember={(member) => setEditingFamilyMember(member)}
        onOpenEditPatient={() => setActiveTab("profile")}
        onSuccess={() => {
          setActiveTab("uis")
          toast.add({
            title: "Intake Saved",
            description: isGuaranteeOnly
              ? "Guarantee details have been saved."
              : "ANNEX B intake details have been saved.",
            type: "success",
          })
        }}
      />
    </div>
  )
}
