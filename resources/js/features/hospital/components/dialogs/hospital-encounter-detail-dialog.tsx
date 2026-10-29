import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RegistryStatusBadge } from "../registry-status-badge"
import { AssessEncounterDialog } from "./assess-encounter-dialog"
import { OpenCaseDialog } from "@/features/cases/components/dialogs/open-case-dialog"
import { EncounterUisPanel } from "@/features/cases/components/encounter-uis-panel"
import {
  AcknowledgementSlipDialog,
  GuaranteeBreakdownTable,
  GuaranteeForm,
  isMaifipGuarantee,
  useDeleteGuarantee,
  useGuarantees,
} from "@/features/guarantees"
import type { PatientGuarantee } from "@/features/guarantees/types"
import { formatCurrency } from "@/lib/format-currency"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  EncounterPrintableDialog,
  type PrintableType,
} from "./encounter-printable-dialog"
import { useHospitalEncounter, useAssignableCases } from "../../hooks/use-hospital-encounters"
import { formatTransactionType } from "../../lib/transaction-type"
import type { HospitalEncounter, HospitalLookup } from "../../types/hospital-transaction.types"
import type { PatientRecord } from "@/features/patients/types"
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock,
  CreditCard,
  Edit2,
  ExternalLink,
  FileCheck2,
  FileText,
  FolderPlus,
  Loader2,
  Plus,
  Printer,
  Receipt,
  ShieldCheck,
  Stethoscope,
  Trash2,
  XCircle,
} from "lucide-react"
import { useNavigate } from "@/lib/inertia-router-hooks"
import {
  QueueActionGateProvider,
  QueueStatusBanner,
  ServiceVisitPanel,
  useQueueActionGate,
} from "@/features/queue"
import { usePermission } from "@/features/auth/hooks/use-permission"

const PLACEHOLDER = "—"

function lookupText(value: HospitalLookup | null | undefined): string {
  return value?.description ?? PLACEHOLDER
}

function text(value: string | null | undefined): string {
  return value && value.trim() !== "" ? value : PLACEHOLDER
}

function peso(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return PLACEHOLDER
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount)
}

const Field: React.FC<{
  label: string
  value: React.ReactNode
  className?: string
}> = ({ label, value, className = "" }) => (
  <div className={`space-y-1 ${className}`}>
    <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className="text-sm font-semibold text-foreground break-words">{value}</div>
  </div>
)

interface HospitalEncounterDetailDialogProps {
  encounter: HospitalEncounter | null
  patient: PatientRecord
  open: boolean
  onOpenChange: (open: boolean) => void
  canAssess: boolean
  canCreateCase: boolean
  initialTab?: string
}

export const HospitalEncounterDetailDialog: React.FC<HospitalEncounterDetailDialogProps> = (props) => {
  if (!props.encounter) return null

  return (
    <QueueActionGateProvider
      patientId={props.patient.id}
      transactionId={props.encounter.id}
    >
      <HospitalEncounterDetailDialogContent {...props} />
    </QueueActionGateProvider>
  )
}

const HospitalEncounterDetailDialogContent: React.FC<HospitalEncounterDetailDialogProps> = ({
  encounter,
  patient,
  open,
  onOpenChange,
  canAssess,
  canCreateCase,
  initialTab = "overview",
}) => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(initialTab)
  const [assessOpen, setAssessOpen] = useState(false)
  const [openCaseOpen, setOpenCaseOpen] = useState(false)
  const [createdCase, setCreatedCase] = useState<{ id: number; caseCode: string } | null>(null)

  const [printableType, setPrintableType] = useState<PrintableType>("uis")
  const [isPrintableOpen, setIsPrintableOpen] = useState(false)

  const { canPerformActions, reason, activeVisit } = useQueueActionGate()

  const handleOpenPrint = (type: PrintableType) => {
    setPrintableType(type)
    setIsPrintableOpen(true)
  }

  const encounterId = encounter?.id ?? 0
  const { data: detail, isLoading, error } = useHospitalEncounter(encounterId, open && encounterId > 0)
  const { data: assignableCases = [] } = useAssignableCases(encounterId, open && encounterId > 0)
  const canManageQueue = usePermission("queue.manage")
  const canCreateGuarantee = usePermission("guarantee.create")
  const canUpdateGuarantee = usePermission("guarantee.update")
  const canDeleteGuarantee = usePermission("guarantee.delete")
  const [expandedRowIds, setExpandedRowIds] = useState<Set<number>>(new Set())
  const [deletingGuarantee, setDeletingGuarantee] = useState<PatientGuarantee | null>(null)
  const [slipGuaranteeId, setSlipGuaranteeId] = useState<number | null>(null)
  const deleteGuaranteeMutation = useDeleteGuarantee(
    patient?.id,
    encounterId > 0 ? encounterId : undefined
  )

  const toggleExpandRow = (id: number) => {
    setExpandedRowIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleDeleteGuaranteeConfirm = async () => {
    if (!deletingGuarantee) return
    try {
      await deleteGuaranteeMutation.mutateAsync(deletingGuarantee.id)
    } finally {
      setDeletingGuarantee(null)
    }
  }

  const [viewMode, setViewMode] = useState<"encounter" | "guarantor-form">("encounter")
  const [formGuarantee, setFormGuarantee] = useState<PatientGuarantee | null>(null)
  const [formGuarantorName, setFormGuarantorName] = useState<string | null>(null)
  const [formGuarantorId, setFormGuarantorId] = useState<number | null>(null)
  const [formLockGuarantor, setFormLockGuarantor] = useState(false)
  const [isFormDirty, setIsFormDirty] = useState(false)
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)
  const [pendingActionAfterDiscard, setPendingActionAfterDiscard] = useState<(() => void) | null>(null)

  const handleRequestBack = () => {
    if (isFormDirty) {
      setPendingActionAfterDiscard(() => () => {
        setViewMode("encounter")
        setIsFormDirty(false)
        setActiveTab("charges")
      })
      setConfirmDiscardOpen(true)
    } else {
      setViewMode("encounter")
      setActiveTab("charges")
    }
  }

  const handleDialogClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      if (viewMode === "guarantor-form") {
        if (isFormDirty) {
          setPendingActionAfterDiscard(() => () => {
            setViewMode("encounter")
            setIsFormDirty(false)
            onOpenChange(false)
          })
          setConfirmDiscardOpen(true)
          return
        } else {
          setViewMode("encounter")
          onOpenChange(false)
          return
        }
      }
    }
    onOpenChange(nextOpen)
  }

  const { data: mswdGuaranteesData } = useGuarantees(
    patient?.id,
    encounterId > 0 ? encounterId : undefined,
    open && Boolean(patient?.id && encounterId > 0)
  )
  const mswdGuaranteesList = mswdGuaranteesData?.data ?? []

  // Reset tab and view mode on open
  React.useEffect(() => {
    if (open) {
      setActiveTab(initialTab)
      setViewMode("encounter")
      setFormGuarantee(null)
      setIsFormDirty(false)
    }
  }, [open, initialTab])

  if (!encounter) return null

  const activeEncounter = detail ?? encounter
  const activeCase =
    createdCase ??
    (assignableCases.length > 0
      ? { id: assignableCases[0].id, caseCode: assignableCases[0].caseCode }
      : null)

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogClose}>
        <DialogContent
          className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden"
          onPointerDownOutside={(e) => {
            if (viewMode === "guarantor-form") {
              e.preventDefault()
            }
          }}
          onEscapeKeyDown={(e) => {
            if (viewMode === "guarantor-form") {
              e.preventDefault()
              handleRequestBack()
            }
          }}
        >
          {viewMode === "guarantor-form" ? (
            <>
              {/* Guarantor Form Subview Header */}
              <DialogHeader className="p-5 pb-4 border-b bg-muted/20 shrink-0">
                <div className="flex flex-wrap items-center justify-between gap-3 pr-6">
                  <div className="space-y-1.5">
                    <div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRequestBack}
                        className="h-8 gap-1.5 px-2.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/60"
                      >
                        <ArrowLeft className="size-4 text-primary" />
                        <span>Back to Encounter</span>
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 pt-0.5">
                      <DialogTitle className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                        <CreditCard className="size-5 text-primary shrink-0" />
                        {formGuarantee?.id ? "Edit Patient Guarantor" : "Add Patient Guarantor"}
                      </DialogTitle>
                    </div>
                    <DialogDescription className="text-xs text-muted-foreground">
                      Record the guarantor for this hospital encounter and break it down by type of assistance, mode of assistance and fund source.
                      <span className="ml-2 font-medium text-foreground">
                        (Patient: {patient.fullName} • Encounter #{activeEncounter.id})
                      </span>
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Form Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                <GuaranteeForm
                  patientId={patient.id}
                  transactionId={activeEncounter.id}
                  guarantee={formGuarantee}
                  initialGuarantorId={formGuarantorId}
                  initialGuarantorName={formGuarantorName}
                  lockGuarantor={formLockGuarantor}
                  onDirtyChange={setIsFormDirty}
                  onSuccess={() => {
                    setIsFormDirty(false)
                    setViewMode("encounter")
                    setActiveTab("charges")
                  }}
                  onCancel={handleRequestBack}
                  cancelLabel="Cancel"
                />
              </div>
            </>
          ) : (
            <>
              {/* Header */}
              <DialogHeader className="p-5 pb-4 border-b bg-muted/20 shrink-0">
            <div className="flex flex-wrap items-start justify-between gap-3 pr-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <DialogTitle className="text-xl font-black text-foreground flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary shrink-0" />
                    Encounter #{activeEncounter.id}
                  </DialogTitle>
                  <RegistryStatusBadge status={activeEncounter.registrationStatus} />
                  <Badge variant="secondary" className="font-semibold text-xs px-2.5 py-0.5">
                    {formatTransactionType(activeEncounter.patientTransactionType)}
                  </Badge>
                </div>
                <DialogDescription className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-3 flex-wrap">
                  <span>
                    Hospital No. <strong className="text-foreground">{patient.hospitalNo || String(patient.hospitalId)}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Patient: <strong className="text-foreground">{patient.fullName}</strong>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    {activeEncounter.registrationDate ?? "No admission date"}
                  </span>
                </DialogDescription>
              </div>

              {/* Header Print Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  disabled={!canPerformActions}
                  title={!canPerformActions ? reason : undefined}
                  className="inline-flex items-center justify-center h-10 px-4 rounded-md border border-input bg-background shadow-2xs hover:bg-muted text-sm font-bold gap-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Print documents for encounter"
                >
                  <Printer className="size-4.5 text-primary" />
                  <span>Print Documents</span>
                  <ChevronDown className="size-4 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 p-2 space-y-1">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="px-3 py-2 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                      Encounter Printables
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => handleOpenPrint("uis")}
                    className="cursor-pointer gap-3 px-3 py-2.5 text-sm font-bold text-foreground min-h-11 rounded-lg"
                  >
                    <FileText className="size-5 text-primary shrink-0" />
                    <span>Unified Intake Sheet (UIS)</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleOpenPrint("maifip")}
                    className="cursor-pointer gap-3 px-3 py-2.5 text-sm font-bold text-foreground min-h-11 rounded-lg"
                  >
                    <FileCheck2 className="size-5 text-primary shrink-0" />
                    <span>Acknowledgement Slip (MAIFIP)</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleOpenPrint("cga")}
                    className="cursor-pointer gap-3 px-3 py-2.5 text-sm font-bold text-foreground min-h-11 rounded-lg"
                  >
                    <Building2 className="size-5 text-primary shrink-0" />
                    <span>City Mayor Acknowledgement Slip</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleOpenPrint("indigency")}
                    className="cursor-pointer gap-3 px-3 py-2.5 text-sm font-bold text-foreground min-h-11 rounded-lg"
                  >
                    <BadgeCheck className="size-5 text-primary shrink-0" />
                    <span>Certificate of Eligibility (Indigency)</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </DialogHeader>

          {/* Body with Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col min-h-0 overflow-hidden"
          >
            <div className="px-5 py-3.5 border-b bg-background shrink-0">
              <TabsList className={`grid ${canManageQueue ? "grid-cols-5" : "grid-cols-4"} w-full h-10 p-1 bg-muted/60`}>
                <TabsTrigger
                  value="overview"
                  className="text-xs sm:text-sm font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs"
                >
                  <Stethoscope className="w-4 h-4 text-primary shrink-0" />
                  {/* Five tabs don't fit the long labels in this 3xl dialog. */}
                  {!canManageQueue && <span className="hidden sm:inline">Overview &</span>} Admission
                </TabsTrigger>
                <TabsTrigger
                  value="clinical"
                  className="text-xs sm:text-sm font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs"
                >
                  <FileText className="w-4 h-4 text-primary shrink-0" />
                  {!canManageQueue && <span className="hidden sm:inline">Diagnosis &</span>} Discharge
                </TabsTrigger>
                <TabsTrigger
                  value="financial"
                  className="text-xs sm:text-sm font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs"
                >
                  <CreditCard className="w-4 h-4 text-primary shrink-0" />
                  Guarantors
                  {activeEncounter.guarantors && activeEncounter.guarantors.length > 0 && (
                    <span className="ml-1 text-[11px] bg-primary/15 text-primary px-1.5 py-0.2 rounded-full font-bold">
                      {activeEncounter.guarantors.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="mswd"
                  className="text-xs sm:text-sm font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs"
                >
                  <FileCheck2 className="w-4 h-4 text-primary shrink-0" />
                  MSWD <span className="hidden sm:inline">& UIS</span>
                </TabsTrigger>
                {canManageQueue && (
                <TabsTrigger
                  value="queue"
                  className="text-xs sm:text-sm font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs"
                >
                  <Clock className="w-4 h-4 text-primary shrink-0" />
                  <span>Queue <span className="hidden sm:inline">& TAT</span></span>
                  {activeVisit?.status === "waiting" && (
                    <span className="size-2 rounded-full bg-amber-500 animate-pulse ml-0.5" title="Waiting in Queue" />
                  )}
                  {activeVisit?.status === "in_progress" && (
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" title="Service In Progress" />
                  )}
                </TabsTrigger>
                )}
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <QueueStatusBanner onNavigateToQueue={() => setActiveTab("queue")} />
              {isLoading && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground p-3 bg-muted/30 rounded-lg">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" /> Loading complete encounter records from HIS…
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <Skeleton className="h-16 rounded-lg" />
                    <Skeleton className="h-16 rounded-lg" />
                    <Skeleton className="h-16 rounded-lg" />
                    <Skeleton className="h-16 rounded-lg" />
                    <Skeleton className="h-16 rounded-lg" />
                    <Skeleton className="h-16 rounded-lg" />
                  </div>
                </div>
              )}

              {error && (
                <Alert variant="destructive" className="border">
                  <AlertCircle className="w-4 h-4" />
                  <AlertTitle className="text-sm font-bold">Unable to fetch full details</AlertTitle>
                  <AlertDescription className="text-xs">
                    Basic encounter info is shown, but lookups and guarantor details could not be retrieved from the hospital service.
                  </AlertDescription>
                </Alert>
              )}

              {/* TAB 1: OVERVIEW & ADMISSION */}
              <TabsContent value="overview" className="m-0 space-y-4 focus-visible:outline-none">
                {/* 1st Card: PhilHealth Information */}
                <div className="p-4 rounded-xl border bg-card/60 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-primary uppercase tracking-wider border-b pb-2">
                    <ShieldCheck className="size-4 text-primary shrink-0" />
                    PhilHealth Coverage & Membership
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 pt-1">
                    <Field
                      label="PhilHealth Membership"
                      value={lookupText(activeEncounter.membership)}
                    />
                    <Field
                      label="PhilHealth Enrolled"
                      value={
                        activeEncounter.isWithPhic ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                            <CheckCircle2 className="size-4" /> With PhilHealth (Enrolled)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-muted-foreground font-semibold">
                            <XCircle className="size-4 text-muted-foreground/60" /> Without PhilHealth
                          </span>
                        )
                      }
                    />
                  </div>
                </div>

                {/* 2nd Card: Service & Admission Details */}
                <div className="p-4 rounded-xl border bg-card/60 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-primary uppercase tracking-wider border-b pb-2">
                    <Stethoscope className="size-4 text-primary shrink-0" />
                    Service & Admission Details
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 pt-1">
                    <Field label="Service Type" value={lookupText(activeEncounter.serviceType)} />
                    <Field label="Admission Case Type" value={lookupText(activeEncounter.admissionCaseType)} />
                    <Field label="Admission Result" value={lookupText(activeEncounter.admissionResult)} />
                    <Field label="Hospital Plan" value={lookupText(activeEncounter.hospitalPlan)} />
                    <Field label="Discount" value={lookupText(activeEncounter.discount)} />
                    <Field label="Transaction Type" value={lookupText(activeEncounter.transactionType)} />
                    <Field label="Patient Category" value={text(activeEncounter.patientCategory)} />
                  </div>
                </div>
              </TabsContent>

              {/* TAB 2: CLINICAL & DISCHARGE */}
              <TabsContent value="clinical" className="m-0 space-y-4 focus-visible:outline-none">
                {/* 1st Card: Diagnosis & Medical Impressions */}
                <div className="p-4 rounded-xl border bg-card/60 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-primary uppercase tracking-wider border-b pb-2">
                    <FileText className="size-4 text-primary shrink-0" />
                    Diagnosis & Medical Impressions
                  </div>
                  <div className="space-y-3 pt-1">
                    <div className="p-3.5 rounded-lg border bg-primary/5 border-primary/20 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                          Final Diagnosis (HIS Reference)
                        </span>
                        {activeEncounter.finalDiagnosisCode && (
                          <Badge variant="outline" className="font-mono text-xs border-primary/30 text-primary">
                            ICD Code: {activeEncounter.finalDiagnosisCode}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm sm:text-base font-semibold text-foreground leading-relaxed">
                        {text(activeEncounter.finalDiagnosis)}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 pt-2">
                      <Field
                        label="Doctor's Impression"
                        value={text(activeEncounter.impression)}
                      />
                      <Field
                        label="Discharge Diagnosis"
                        value={text(activeEncounter.dischargeDiagnosis)}
                      />
                    </div>
                  </div>
                </div>

                {/* 2nd Card: Discharge & Administrative Status */}
                <div className="p-4 rounded-xl border bg-card/60 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-primary uppercase tracking-wider border-b pb-2">
                    <Calendar className="size-4 text-primary shrink-0" />
                    Discharge & Administrative Status
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 pt-1">
                    <Field label="Discharge No." value={text(activeEncounter.dischargeNumber)} />
                    <Field label="Discharge Date" value={text(activeEncounter.dischargeDate)} />
                    <Field label="May-Go-Home No." value={text(activeEncounter.mayGoHomeNumber)} />
                    <Field label="May-Go-Home Date" value={text(activeEncounter.mayGoHomeDatetime)} />
                    <Field
                      label="Hemodialysis Case"
                      value={activeEncounter.isHemodialysis ? "Yes" : "No"}
                    />
                    <Field
                      label="Cancelled Encounter"
                      value={
                        activeEncounter.isCancelled ? (
                          <span className="text-destructive font-bold">
                            Yes {activeEncounter.cancelDate ? `(${activeEncounter.cancelDate})` : ""}
                          </span>
                        ) : (
                          "No"
                        )
                      }
                    />
                  </div>
                </div>
              </TabsContent>

              {/* TAB 3: GUARANTORS & FINANCIAL ASSISTANCE */}
              <TabsContent value="financial" className="m-0 space-y-5 focus-visible:outline-none">
                {/* Hospital Billing Guarantors (HIS) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 border flex-wrap gap-2">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Hospital Billing Guarantors (HIS)
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Financial guarantees and assistance logged in the hospital billing system (read-only).
                      </div>
                    </div>
                    {activeEncounter.guarantorTotal !== null && activeEncounter.guarantorTotal > 0 && (
                      <div className="text-right">
                        <div className="text-[11px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                          Total Amount
                        </div>
                        <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                          {peso(activeEncounter.guarantorTotal)}
                        </div>
                      </div>
                    )}
                  </div>

                  {!activeEncounter.guarantors || activeEncounter.guarantors.length === 0 ? (
                    <div className="text-sm font-medium text-muted-foreground py-6 text-center border border-dashed rounded-lg">
                      No hospital billing guarantors on file for this encounter.
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader className="bg-muted/50">
                          <TableRow>
                            <TableHead className="w-9 px-2 text-center"></TableHead>
                            <TableHead className="text-xs font-bold text-foreground">Guarantor Name</TableHead>
                            <TableHead className="text-xs font-bold text-foreground text-right">HIS Amount</TableHead>
                            <TableHead className="text-xs font-bold text-foreground">General Ledger Status</TableHead>
                            <TableHead className="text-xs font-bold text-foreground text-right">MSWD Breakdown</TableHead>
                            <TableHead className="text-xs font-bold text-foreground text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activeEncounter.guarantors.map((g) => {
                            const match = mswdGuaranteesList.find(
                              (mg) =>
                                mg.guarantor?.name.trim().toLowerCase() ===
                                (g.name?.trim().toLowerCase() ?? "")
                            )
                            const isExpanded = expandedRowIds.has(g.id)
                            const itemCount = match?.items?.length ?? 0
                            const isMaifip = match ? isMaifipGuarantee(match) : false

                            return (
                              <React.Fragment key={g.id}>
                                <TableRow className="hover:bg-muted/30">
                                  {/* Expand/Collapse Chevron */}
                                  <TableCell className="w-9 px-2 text-center align-middle">
                                    {match && itemCount > 0 ? (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => toggleExpandRow(g.id)}
                                        className="size-6 cursor-pointer text-muted-foreground hover:text-foreground"
                                        aria-label={
                                          isExpanded
                                            ? "Collapse assistance breakdown"
                                            : "Expand assistance breakdown"
                                        }
                                      >
                                        {isExpanded ? (
                                          <ChevronDown className="size-4 text-primary" />
                                        ) : (
                                          <ChevronRight className="size-4" />
                                        )}
                                      </Button>
                                    ) : (
                                      <span className="inline-block size-6" />
                                    )}
                                  </TableCell>

                                  {/* Guarantor Name & Lines badge */}
                                  <TableCell className="font-semibold text-sm">
                                    <div className="flex items-center gap-2">
                                      <span>{text(g.name)}</span>
                                      {match && (
                                        <Badge
                                          variant="secondary"
                                          className="h-4 cursor-pointer bg-muted px-1.5 py-0 text-[10px] font-semibold text-muted-foreground hover:bg-muted/80"
                                          onClick={() => toggleExpandRow(g.id)}
                                        >
                                          {itemCount} {itemCount === 1 ? "line" : "lines"}
                                        </Badge>
                                      )}
                                    </div>
                                    {match?.remarks && (
                                      <div className="mt-0.5 line-clamp-1 text-[11px] font-normal text-muted-foreground">
                                        {match.remarks}
                                      </div>
                                    )}
                                  </TableCell>

                                  {/* HIS Amount */}
                                  <TableCell className="text-right font-bold text-sm text-emerald-600 dark:text-emerald-400">
                                    {peso(g.amount)}
                                  </TableCell>

                                  {/* GL Status */}
                                  <TableCell className="text-xs font-medium">
                                    {g.glPosted ? (
                                      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-500/15 px-2 py-0.5 rounded text-xs">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Posted ({text(g.glPostDate)})
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground text-xs">Not Posted</span>
                                    )}
                                  </TableCell>

                                  {/* MSWD Breakdown Total */}
                                  <TableCell className="text-right text-sm font-black text-emerald-600 dark:text-emerald-400">
                                    {match ? (
                                      formatCurrency(match.total)
                                    ) : (
                                      <span className="text-xs font-normal text-muted-foreground italic">No breakdown</span>
                                    )}
                                  </TableCell>

                                  {/* Action Buttons */}
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      {match ? (
                                        <>
                                          {isMaifip && (
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => setSlipGuaranteeId(match.id)}
                                              className="size-7 cursor-pointer text-primary hover:bg-primary/10"
                                              title="Print Acknowledgement Slip (MAIFIP)"
                                            >
                                              <Printer className="size-3.5" />
                                            </Button>
                                          )}
                                          {canUpdateGuarantee && (
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              disabled={!canPerformActions}
                                              onClick={() => {
                                                setFormGuarantee(match)
                                                setFormGuarantorName(null)
                                                setFormGuarantorId(null)
                                                setFormLockGuarantor(false)
                                                setIsFormDirty(false)
                                                setViewMode("guarantor-form")
                                              }}
                                              className="size-7 cursor-pointer text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                                              title={!canPerformActions ? reason : "Edit assistance breakdown"}
                                            >
                                              <Edit2 className="size-3.5" />
                                            </Button>
                                          )}
                                          {canDeleteGuarantee && (
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              disabled={!canPerformActions}
                                              onClick={() => setDeletingGuarantee(match)}
                                              className="size-7 cursor-pointer text-destructive hover:bg-destructive/10 hover:text-destructive disabled:opacity-50 disabled:cursor-not-allowed"
                                              title={!canPerformActions ? reason : "Delete assistance breakdown"}
                                            >
                                              <Trash2 className="size-3.5" />
                                            </Button>
                                          )}
                                        </>
                                      ) : canCreateGuarantee ? (
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          disabled={!canPerformActions}
                                          title={!canPerformActions ? reason : undefined}
                                          onClick={() => {
                                            setFormGuarantee(null)
                                            setFormGuarantorName(g.name ?? "")
                                            setFormGuarantorId(g.mswdGuarantorId ?? null)
                                            setFormLockGuarantor(true)
                                            setIsFormDirty(false)
                                            setViewMode("guarantor-form")
                                          }}
                                          className="h-7 cursor-pointer gap-1 border-primary/30 px-2 text-xs font-bold text-primary hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          <Plus className="size-3" />
                                          Add Breakdown
                                        </Button>
                                      ) : (
                                        <span className="text-xs text-muted-foreground italic">—</span>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>

                                {/* Collapsible Expanded Breakdown Area */}
                                {isExpanded && match && (
                                  <TableRow className="border-b bg-muted/15 hover:bg-muted/20">
                                    <TableCell colSpan={6} className="p-3.5 pl-10">
                                      <div className="space-y-3">
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                                            <Receipt className="size-3.5 text-primary" />
                                            Assistance Breakdown ({text(g.name)})
                                          </div>
                                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                            {match.referenceNo && (
                                              <span>
                                                Ref/GL:{" "}
                                                <strong className="font-mono text-foreground">
                                                  {match.referenceNo}
                                                </strong>
                                              </span>
                                            )}
                                            {match.guaranteedOn && (
                                              <span>
                                                Date:{" "}
                                                <strong className="text-foreground">
                                                  {match.guaranteedOn}
                                                </strong>
                                              </span>
                                            )}
                                            {match.recordedBy && (
                                              <span>
                                                Recorded by:{" "}
                                                <strong className="text-foreground">
                                                  {match.recordedBy.name}
                                                </strong>
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        <GuaranteeBreakdownTable items={match.items} />
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </React.Fragment>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* TAB 4: MSWD CASE & UIS INTAKE */}
              <TabsContent value="mswd" className="m-0 space-y-4 focus-visible:outline-none">
                <EncounterUisPanel
                  caseId={activeCase?.id}
                  caseCode={activeCase?.caseCode}
                  patientName={patient.fullName}
                  patientAddress={patient.address}
                  patientContact={patient.contactNo}
                  patientMonthlyIncome={patient.monthlyIncome}
                  transactionId={activeEncounter.id}
                  transactionType={activeEncounter.patientTransactionType}
                  onOpenCaseNeeded={() => setOpenCaseOpen(true)}
                />
              </TabsContent>

              {/* TAB 5: QUEUE & TAT SERVICE VISITS */}
              {canManageQueue && (
                <TabsContent value="queue" className="m-0 space-y-4 focus-visible:outline-none">
                  <ServiceVisitPanel
                    patientId={patient.id}
                    transactionId={activeEncounter.id}
                  />
                </TabsContent>
              )}
            </div>
          </Tabs>

          {/* Footer with Actions */}
          <DialogFooter className="p-4 border-t bg-muted/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              {activeCase && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false)
                    navigate(`/patients/${patient.id}?tab=uis&case=${activeCase.id}`)
                  }}
                  className="font-bold text-xs h-9 px-3 gap-1.5 border shadow-2xs"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-primary" />
                  Open UIS Sheet
                </Button>
              )}

              {patient.latestCaseId && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false)
                    navigate(`/cases/${patient.latestCaseId}`)
                  }}
                  className="font-bold text-xs h-9 px-3 gap-1.5 border shadow-2xs"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-primary" />
                  View Case #{patient.latestCaseId}
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2 justify-end">
              {canCreateCase && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canPerformActions}
                  title={!canPerformActions ? reason : undefined}
                  onClick={() => setOpenCaseOpen(true)}
                  className="font-bold text-xs h-9 px-3.5 gap-1.5 border shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-primary" />
                  Open Case
                </Button>
              )}

              {canAssess && (
                <Button
                  type="button"
                  size="sm"
                  disabled={!canPerformActions}
                  title={!canPerformActions ? reason : undefined}
                  onClick={() => setAssessOpen(true)}
                  className="font-bold text-xs h-9 px-3.5 gap-1.5 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ClipboardCheck className="w-3.5 h-3.5" />
                  Assess Encounter
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="font-semibold text-xs h-9 px-3"
              >
                Close
              </Button>
            </div>
          </DialogFooter>
        </>
      )}
    </DialogContent>
  </Dialog>

      {/* Confirm Discard Dialog */}
      <AlertDialog open={confirmDiscardOpen} onOpenChange={setConfirmDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="size-5" />
              Discard unsaved changes?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in the guarantor breakdown. If you leave now, these changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setConfirmDiscardOpen(false)
                if (pendingActionAfterDiscard) {
                  const action = pendingActionAfterDiscard
                  setPendingActionAfterDiscard(null)
                  action()
                } else {
                  setViewMode("encounter")
                  setIsFormDirty(false)
                }
              }}
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sub-Dialogs */}
      <AssessEncounterDialog
        encounterId={activeEncounter.id}
        hospitalNumber={patient.hospitalId}
        open={assessOpen}
        onOpenChange={setAssessOpen}
      />

      <OpenCaseDialog
        open={openCaseOpen}
        onOpenChange={setOpenCaseOpen}
        patientId={patient.id}
        patientName={patient.fullName}
        hospitalNumber={patient.hospitalNo}
        transactionId={activeEncounter.id}
        transactionType={activeEncounter.patientTransactionType ?? undefined}
        onCaseOpened={(newCase) => {
          setOpenCaseOpen(false)
          if (newCase?.id) {
            setCreatedCase({ id: newCase.id, caseCode: newCase.caseCode || `CASE-${newCase.id}` })
          }
        }}
      />

      {/* Printable Dialog (UIS, MAIFIP, City Mayor) */}
      <EncounterPrintableDialog
        open={isPrintableOpen}
        onOpenChange={setIsPrintableOpen}
        type={printableType}
        encounter={activeEncounter}
        patient={patient}
        caseId={activeCase?.id ?? patient.latestCaseId}
      />

      {/* Delete Guarantee Confirmation Dialog */}
      <AlertDialog
        open={deletingGuarantee !== null}
        onOpenChange={(open) => !open && setDeletingGuarantee(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="size-5" />
              Delete Assistance Breakdown?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the assistance breakdown for{" "}
              <strong>{deletingGuarantee?.guarantor?.name}</strong>? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteGuaranteeMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteGuaranteeConfirm}
              disabled={deleteGuaranteeMutation.isPending}
            >
              {deleteGuaranteeMutation.isPending ? "Deleting..." : "Delete Breakdown"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Acknowledgement Slip Dialog (MAIFIP) */}
      <AcknowledgementSlipDialog
        open={slipGuaranteeId !== null}
        onOpenChange={(open) => !open && setSlipGuaranteeId(null)}
        patientId={patient.id}
        transactionId={activeEncounter.id}
        guaranteeId={slipGuaranteeId}
      />
    </>
  )
}
