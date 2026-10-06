import React, { useState, useEffect, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Building2, FileText, FolderPlus, Loader2, Stethoscope } from "lucide-react"
import { ApiError } from "@/lib/api-client"
import { useCaseMutations } from "../../hooks/use-case-mutations"
import { CARD_COLORS } from "../../lib/case-card-color"
import type { CaseCardColor, CasePriority, CaseRecord } from "../../types/case.types"
import { usePatients } from "@/features/patients/hooks/use-patients"
import { useHospitalEncounter, useHospitalEncounters } from "@/features/hospital/hooks/use-hospital-encounters"
import { formatTransactionType } from "@/features/hospital/lib/transaction-type"
import type { HospitalEncounter } from "@/features/hospital/types"

interface OpenCaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientId?: number | string
  patientName?: string
  hospitalNumber?: string | number
  transactionId?: number
  caseType?: string
  admissionType?: string
  transactionType?: string
  onCaseOpened?: (newCase: CaseRecord) => void
}

export const OpenCaseDialog: React.FC<OpenCaseDialogProps> = ({
  open,
  onOpenChange,
  patientId,
  patientName,
  hospitalNumber,
  transactionId: initialTransactionId,
  caseType: initialCaseType,
  admissionType: initialAdmissionType,
  transactionType: initialTransactionType,
  onCaseOpened,
}) => {
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patientId ? String(patientId) : "")
  const [selectedEncounterId, setSelectedEncounterId] = useState<string>(
    initialTransactionId ? String(initialTransactionId) : ""
  )
  const [priorityLevel, setPriorityLevel] = useState<CasePriority>("Medium")
  const [cardColor, setCardColor] = useState<CaseCardColor>("white")
  const [notes, setNotes] = useState<string>("")
  const [error, setError] = useState<string>("")

  const { patients = [] } = usePatients()
  const { openCase, isOpenPending } = useCaseMutations()

  // Find active patient record
  const currentPatient = useMemo(() => {
    const id = selectedPatientId || (patientId ? String(patientId) : "")
    return patients.find((p) => String(p.id) === id)
  }, [patients, selectedPatientId, patientId])

  const activeHospitalNumber = hospitalNumber ?? currentPatient?.hospitalId ?? currentPatient?.hospitalNo

  // Load encounters list for active patient
  const { data: encounters = [], isLoading: isEncountersLoading } = useHospitalEncounters(
    activeHospitalNumber
  )

  const activeEncounterId = Number(selectedEncounterId || initialTransactionId)

  // Load full encounter single detail (with lookups: admissionCaseType, transactionType, serviceType)
  const { data: detailedEncounter, isLoading: isDetailLoading } = useHospitalEncounter(
    activeEncounterId,
    Boolean(activeEncounterId && open)
  )

  // Find encounter item from list as fallback
  const listEncounter: HospitalEncounter | undefined = useMemo(() => {
    if (!selectedEncounterId) return undefined
    return encounters.find((e) => String(e.id) === String(selectedEncounterId))
  }, [encounters, selectedEncounterId])

  // Map Admission Case Type ("House/Walk-In") to Case Admission Type
  const derivedAdmissionType =
    detailedEncounter?.admissionCaseType?.description ??
    initialAdmissionType ??
    listEncounter?.patientCategory ??
    "General"

  // Map Transaction Type ("Outpatient Consultation") to Case Type / Transaction Type
  const derivedTransactionType =
    detailedEncounter?.transactionType?.description ??
    detailedEncounter?.patientTransactionType ??
    initialTransactionType ??
    listEncounter?.patientTransactionType ??
    "Outpatient Consultation"

  const derivedCaseType =
    initialCaseType ??
    detailedEncounter?.transactionType?.description ??
    detailedEncounter?.patientTransactionType ??
    "Inpatient"

  const derivedServiceType = detailedEncounter?.serviceType?.description ?? null

  useEffect(() => {
    if (patientId) {
      setSelectedPatientId(String(patientId))
    }
    if (initialTransactionId) {
      setSelectedEncounterId(String(initialTransactionId))
    }
  }, [patientId, initialTransactionId, open])

  // Auto-select first encounter if only 1 exists and none selected
  useEffect(() => {
    if (!selectedEncounterId && encounters.length === 1) {
      setSelectedEncounterId(String(encounters[0].id))
    }
  }, [encounters, selectedEncounterId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const targetPatientId = Number(selectedPatientId || patientId)
    if (!targetPatientId) {
      setError("Please select a patient to open a case for.")
      return
    }

    const txId = Number(selectedEncounterId || initialTransactionId)
    if (!txId) {
      setError("A case must be opened against a valid hospital encounter.")
      return
    }

    try {
      const created = await openCase({
        patient_id: targetPatientId,
        case_type: derivedCaseType,
        admission_type: derivedAdmissionType,
        transaction_id: txId,
        transaction_type: derivedTransactionType || undefined,
        priority_level: priorityLevel,
        card_color: cardColor,
        notes: notes.trim() || undefined,
      })
      onOpenChange(false)
      onCaseOpened?.(created)
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.firstValidationMessage ?? err.message)
      } else {
        setError(err instanceof Error ? err.message : "Failed to open case episode.")
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2 text-primary">
            <FolderPlus className="size-5 text-primary shrink-0" />
            Open Social Case Episode
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm font-medium leading-relaxed">
            Create a new social case episode attached to a hospital encounter. Admission Case Type and Transaction Type are derived directly from the HIS encounter.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 flex gap-2.5 items-start text-xs font-semibold text-destructive">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Patient Selection (if not pre-locked) */}
          {!patientId ? (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider">
                Patient <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedPatientId}
                onValueChange={(val) => {
                  setSelectedPatientId(val || "")
                  setSelectedEncounterId("")
                }}
              >
                <SelectTrigger className="h-10 text-sm font-medium border">
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)} className="text-sm">
                      {p.fullName} (Hosp #{p.hospitalNo} · {p.mswdNo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="p-3 bg-muted/40 rounded-lg border text-xs space-y-1">
              <span className="font-semibold uppercase tracking-wider text-muted-foreground">Patient:</span>
              <div className="text-sm font-bold text-foreground">
                {patientName ?? currentPatient?.fullName ?? `Patient #${patientId}`}
                {activeHospitalNumber ? ` (Hosp #${activeHospitalNumber})` : ""}
              </div>
            </div>
          )}

          {/* Encounter Selection / Display */}
          {initialTransactionId ? (
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 text-xs space-y-1">
              <span className="font-semibold uppercase tracking-wider text-primary">Attached Encounter:</span>
              <div className="text-sm font-bold text-foreground flex items-center gap-2">
                <Building2 className="size-4 text-primary shrink-0" />
                Encounter #{initialTransactionId} {derivedTransactionType ? `· ${formatTransactionType(derivedTransactionType)}` : ""}
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider">
                Hospital Encounter <span className="text-destructive">*</span>
              </Label>
              {isEncountersLoading ? (
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground p-2.5 bg-muted/30 rounded border">
                  <Loader2 className="size-3.5 animate-spin" /> Loading hospital encounters…
                </div>
              ) : encounters.length === 0 ? (
                <Alert className="border p-3 text-xs bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200">
                  <AlertCircle className="size-4 text-amber-600 dark:text-amber-400" />
                  <AlertTitle className="text-xs font-bold">No Hospital Encounters Found</AlertTitle>
                  <AlertDescription className="text-xs">
                    This patient has no HIS encounters on file. Cases must be opened against a hospital encounter.
                  </AlertDescription>
                </Alert>
              ) : (
                <Select value={selectedEncounterId} onValueChange={(val) => setSelectedEncounterId(val || "")}>
                  <SelectTrigger className="h-10 text-sm font-medium border">
                    <SelectValue placeholder="Select HIS encounter" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {encounters.map((enc) => (
                      <SelectItem key={enc.id} value={String(enc.id)} className="text-sm">
                        Encounter #{enc.id} · {formatTransactionType(enc.patientTransactionType)} (
                        {enc.registrationDate ?? "No date"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Read-Only Encounter-derived Fields (Admission Case Type & Transaction Type) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 bg-muted/40 rounded-xl border text-xs">
            <div className="space-y-1">
              <span className="font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Building2 className="size-3.5 text-primary" /> Admission Case Type:
              </span>
              <div className="text-sm font-bold text-foreground">
                {isDetailLoading ? "Loading…" : derivedAdmissionType}
              </div>
            </div>

            <div className="space-y-1">
              <span className="font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Stethoscope className="size-3.5 text-primary" /> Transaction Type:
              </span>
              <div className="text-sm font-bold text-foreground">
                {isDetailLoading ? "Loading…" : derivedTransactionType}
              </div>
            </div>

            {derivedServiceType && (
              <div className="space-y-1 sm:col-span-2 pt-1 border-t border-border/50">
                <span className="font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileText className="size-3.5 text-primary" /> Service Type:
                </span>
                <div className="text-sm font-semibold text-foreground">{derivedServiceType}</div>
              </div>
            )}
          </div>


          {/* Worker Input Fields: Priority & Card Color */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider">Priority Level</Label>
              <Select value={priorityLevel} onValueChange={(val) => setPriorityLevel((val || "Medium") as CasePriority)}>
                <SelectTrigger className="h-10 text-sm font-medium border">
                  <SelectValue placeholder="Priority level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low" className="text-sm font-medium">Low</SelectItem>
                  <SelectItem value="Medium" className="text-sm font-medium">Medium</SelectItem>
                  <SelectItem value="High" className="text-sm font-medium">High</SelectItem>
                  <SelectItem value="Urgent" className="text-sm font-medium">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider">Card Colour</Label>
              <Select value={cardColor} onValueChange={(val) => setCardColor((val || "white") as CaseCardColor)}>
                <SelectTrigger className="h-10 text-sm font-medium border">
                  <SelectValue placeholder="Select card color" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(CARD_COLORS).map((cfg) => (
                    <SelectItem key={cfg.color} value={cfg.color} className="text-sm font-medium">
                      <span className="flex items-center gap-2">
                        <span className={`size-2.5 rounded-full ${cfg.dotClass}`} />
                        {cfg.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Optional Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider">Intake Notes</Label>
            <Input
              placeholder="Optional clinical notes or initial intake observations"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-10 text-sm"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isOpenPending}
              className="font-bold text-sm h-10 px-4"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isOpenPending || (!selectedEncounterId && !initialTransactionId)}
              className="font-extrabold text-sm h-10 px-5 shadow-sm transition-all gap-1.5"
            >
              {isOpenPending && <Loader2 className="size-4 animate-spin" />}
              Open Case Episode
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
