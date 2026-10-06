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
import { EncounterGuaranteesCard } from "@/features/guarantees"
import { useHospitalEncounter, useAssignableCases } from "../../hooks/use-hospital-encounters"
import { formatTransactionType } from "../../lib/transaction-type"
import type { HospitalEncounter, HospitalLookup } from "../../types/hospital-transaction.types"
import type { PatientRecord } from "@/features/patients/types"
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  ExternalLink,
  FileCheck2,
  FileText,
  FolderPlus,
  Loader2,
  ShieldCheck,
  Stethoscope,
  XCircle,
} from "lucide-react"
import { useNavigate } from "@/lib/inertia-router-hooks"

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

export const HospitalEncounterDetailDialog: React.FC<HospitalEncounterDetailDialogProps> = ({
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

  const encounterId = encounter?.id ?? 0
  const { data: detail, isLoading, error } = useHospitalEncounter(encounterId, open && encounterId > 0)
  const { data: assignableCases = [] } = useAssignableCases(encounterId, open && encounterId > 0)

  // Reset tab on open
  React.useEffect(() => {
    if (open) {
      setActiveTab(initialTab)
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
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
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
            </div>
          </DialogHeader>

          {/* Body with Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col min-h-0 overflow-hidden"
          >
            <div className="px-5 py-3.5 border-b bg-background shrink-0">
              <TabsList className="grid grid-cols-4 w-full h-10 p-1 bg-muted/60">
                <TabsTrigger
                  value="overview"
                  className="text-xs sm:text-sm font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs"
                >
                  <Stethoscope className="w-4 h-4 text-primary shrink-0" />
                  <span className="hidden sm:inline">Overview &</span> Admission
                </TabsTrigger>
                <TabsTrigger
                  value="clinical"
                  className="text-xs sm:text-sm font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs"
                >
                  <FileText className="w-4 h-4 text-primary shrink-0" />
                  <span className="hidden sm:inline">Diagnosis &</span> Discharge
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
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
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
                            <TableHead className="text-xs font-bold text-foreground">Guarantor Name</TableHead>
                            <TableHead className="text-xs font-bold text-foreground text-right">Amount</TableHead>
                            <TableHead className="text-xs font-bold text-foreground">General Ledger Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activeEncounter.guarantors.map((g) => (
                            <TableRow key={g.id} className="hover:bg-muted/30">
                              <TableCell className="font-semibold text-sm">{text(g.name)}</TableCell>
                              <TableCell className="text-right font-bold text-sm text-emerald-600 dark:text-emerald-400">
                                {peso(g.amount)}
                              </TableCell>
                              <TableCell className="text-xs font-medium">
                                {g.glPosted ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-500/15 px-2 py-0.5 rounded text-xs">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Posted ({text(g.glPostDate)})
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-xs">Not Posted</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                {/* MSWD Patient Guarantors */}
                <EncounterGuaranteesCard
                  patientId={patient.id}
                  transactionId={activeEncounter.id}
                />
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
                  onClick={() => setOpenCaseOpen(true)}
                  className="font-bold text-xs h-9 px-3.5 gap-1.5 border shadow-2xs"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-primary" />
                  Open Case
                </Button>
              )}

              {canAssess && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setAssessOpen(true)}
                  className="font-bold text-xs h-9 px-3.5 gap-1.5 shadow-xs"
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
        </DialogContent>
      </Dialog>

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
    </>
  )
}
