import React, { useMemo, useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ApiError } from "@/lib/api-client"
import { useHospitalEncounters } from "@/features/hospital/hooks/use-hospital-encounters"
import { formatTransactionType } from "@/features/hospital/lib/transaction-type"
import type { HospitalEncounter } from "@/features/hospital/types"
import type { PatientRecord } from "../../types"
import { usePatientVisits, useTimeInVisit } from "@/features/queue"
import { usePatientUis } from "@/features/cases/hooks/use-uis-prints"
import {
  AlertCircle,
  ArrowRight,
  ClipboardList,
  CreditCard,
  Loader2,
  ShieldCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface PatientQueueDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  patient: PatientRecord
}

type VisitPurpose = "Guarantee only" | "Intake"

function sortEncounters(list: HospitalEncounter[]): HospitalEncounter[] {
  return [...list].sort((a, b) => {
    const activeA = a.registrationStatus?.code === "A" ? 0 : 1
    const activeB = b.registrationStatus?.code === "A" ? 0 : 1
    if (activeA !== activeB) return activeA - activeB
    return (b.registrationDate ?? "").localeCompare(a.registrationDate ?? "")
  })
}

function getPatientInitials(fullName: string): string {
  const cleaned = fullName.replace(/,/g, " ").trim()
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "PT"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export const PatientQueueDialog: React.FC<PatientQueueDialogProps> = ({
  open,
  onOpenChange,
  patient,
}) => {
  const [selectedEncounterId, setSelectedEncounterId] = useState<number | null>(
    null
  )
  const [selectedPurpose, setSelectedPurpose] =
    useState<VisitPurpose>("Guarantee only")
  const [remarks, setRemarks] = useState("")
  const [error, setError] = useState<string | null>(null)

  const hospitalId =
    patient.hospitalId ??
    (patient.hospitalNo && !isNaN(Number(patient.hospitalNo))
      ? Number(patient.hospitalNo)
      : undefined)

  const {
    data: encounters = [],
    isLoading: encountersLoading,
    error: encountersError,
  } = useHospitalEncounters(hospitalId)

  const sortedEncounters = useMemo(
    () => sortEncounters(encounters),
    [encounters]
  )

  const { data: visits = [] } = usePatientVisits(patient.id, undefined, open)
  const { data: uisRows = [] } = usePatientUis(patient.id)

  const latestAnnexB = useMemo(() => {
    return uisRows.find((r) => r.uis.hasAssessment) ?? null
  }, [uisRows])

  const latestAnnexBDate = useMemo(() => {
    if (!latestAnnexB) return null
    const raw = latestAnnexB.encounter.date ?? latestAnnexB.case?.dateOpened
    if (!raw) return "Recent"
    const d = new Date(raw)
    if (Number.isNaN(d.getTime())) return raw
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }, [latestAnnexB])

  const latestAnnexBClass = useMemo(() => {
    if (!latestAnnexB) return patient.category || "C3"
    return (
      latestAnnexB.uis.classification?.classification ||
      latestAnnexB.uis.classification?.calculatedClassification ||
      latestAnnexB.uis.assessment?.classification ||
      patient.category ||
      "C3"
    )
  }, [latestAnnexB, patient.category])

  const openEncounterIds = useMemo(
    () =>
      new Set(
        visits
          .filter((v) => v.status === "waiting" || v.status === "in_progress")
          .map((v) => v.hisTransactionId)
      ),
    [visits]
  )

  // Auto-select first available encounter if none selected
  useEffect(() => {
    if (!open) {
      setSelectedEncounterId(null)
      setSelectedPurpose(latestAnnexB ? "Guarantee only" : "Intake")
      setRemarks("")
      setError(null)
      return
    }

    if (sortedEncounters.length > 0 && selectedEncounterId === null) {
      const firstAvailable = sortedEncounters.find(
        (enc) => !openEncounterIds.has(enc.id)
      )
      if (firstAvailable) {
        setSelectedEncounterId(firstAvailable.id)
      }
    }
  }, [open, sortedEncounters, openEncounterIds, selectedEncounterId, latestAnnexB])

  const timeInMutation = useTimeInVisit()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEncounterId) {
      setError("Please select a hospital encounter to queue this patient for.")
      return
    }

    setError(null)

    try {
      await timeInMutation.mutateAsync({
        patientId: patient.id,
        input: {
          hisTransactionId: selectedEncounterId,
          purpose: selectedPurpose,
          remarks: remarks.trim() || undefined,
        },
      })
      onOpenChange(false)
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to queue patient."
      )
    }
  }

  const steps = useMemo(() => {
    if (selectedPurpose === "Guarantee only") {
      return ["Check details", "Guarantors", "Approval", "Letters"]
    }
    return ["Check details", "ANNEX B", "Guarantors", "Approval", "Letters"]
  }, [selectedPurpose])

  const mswdClean = (patient.mswdNo || "").replace(/^MSWD-?/i, "")
  const classLabel =
    !patient.category ||
    patient.category.toLowerCase() === "unclassified" ||
    patient.category === "N/A"
      ? "Unclassified"
      : patient.category.toLowerCase().includes("indigent") ||
          patient.category.toLowerCase() === "c3"
        ? "Class C3"
        : patient.category

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[92vh] w-full max-w-[680px] gap-0 overflow-y-auto rounded-[20px] border border-[#e4e9f2] bg-white p-0 shadow-[0px_24px_56px_0px_rgba(11,44,89,0.25)] dark:border-border dark:bg-card"
      >
        {/* Modal Header (186:2978) */}
        <div
          data-node-id="186:2978"
          className="flex items-center justify-between border-b border-[#e4e9f2] px-[24px] py-[16px] dark:border-border"
        >
          <div className="flex items-center gap-[12px]">
            <div className="flex size-[44px] shrink-0 items-center justify-center rounded-[12px] bg-[#edf3fe] dark:bg-primary/10">
              <img
                alt=""
                className="block size-[24px] max-w-none"
                src="/images/patient-registry/queue-modal-clock.svg"
              />
            </div>
            <div className="flex flex-col">
              <DialogTitle className="text-[20px] font-bold leading-[25px] tracking-[-0.3px] text-[#0c2a5b] dark:text-foreground">
                Queue patient
              </DialogTitle>
              <DialogDescription className="text-[12px] font-normal leading-[18px] text-[#5b6678] dark:text-muted-foreground">
                Puts the patient on the MSWD service desk queue. Arrival time is
                stamped by the server clock.
              </DialogDescription>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex size-[32px] cursor-pointer items-center justify-center rounded-full text-[#5b6678] transition-colors hover:bg-[#f4f7fc] hover:text-[#0c2a5b] dark:hover:bg-muted"
            title="Close"
          >
            <img
              alt="Close"
              className="block size-[16px] max-w-none"
              src="/images/patient-registry/queue-modal-close.svg"
            />
          </button>
        </div>

        {/* Modal Body (186:2988) */}
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="flex flex-col gap-[16px] px-[24px] py-[20px]">
            {error && (
              <Alert variant="destructive" className="py-2.5 text-xs">
                <AlertCircle className="size-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Patient Summary Card (186:3078) */}
            <div
              data-node-id="186:3078"
              className="flex items-center justify-between gap-[12px] rounded-[14px] bg-[#f4f7fc] p-[12px] dark:bg-muted/40"
            >
              <div className="flex min-w-0 items-center gap-[12px]">
                <div className="flex size-[46px] shrink-0 items-center justify-center rounded-full bg-[#e0f5f8] text-[13px] font-bold text-[#0a6b78]">
                  {getPatientInitials(patient.fullName)}
                </div>
                <div className="flex min-w-0 flex-col gap-[2px]">
                  <div className="truncate text-[14px] leading-[18px] font-bold text-[#0c2a5b] dark:text-foreground">
                    {patient.fullName}
                  </div>
                  <div className="truncate font-mono text-[11px] leading-[14px] text-[#5b6678] dark:text-muted-foreground">
                    Hosp {patient.hospitalNo || "—"} • MSWD {mswdClean || "—"}
                  </div>
                </div>
              </div>

              <div className="shrink-0">
                <span className="inline-flex h-[32px] items-center rounded-full bg-[#e8f6ef] px-[12px] text-[12px] font-bold text-[#146b43]">
                  {classLabel}
                </span>
              </div>
            </div>

            {/* 1. Hospital Encounter Section (186:2999) */}
            <div className="flex flex-col gap-[6px]">
              <div className="flex items-center justify-between text-[12px] font-bold text-[#5b6678] dark:text-muted-foreground">
                <span>1. Hospital encounter</span>
                <span>
                  {sortedEncounters.length} encounter
                  {sortedEncounters.length === 1 ? "" : "s"} on record · newest
                  first
                </span>
              </div>

              {!hospitalId ? (
                <div className="rounded-[12px] border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
                  This patient does not have a linked hospital number, so there
                  are no HIS encounters to queue for.
                </div>
              ) : encountersLoading ? (
                <div className="flex h-[52px] items-center gap-2 rounded-[12px] border border-[#c6e8ee] bg-[#f1fafb] px-4 text-xs text-[#5b6678]">
                  <Loader2 className="size-4 animate-spin text-[#1f5fd6]" />
                  Loading encounters from HIS…
                </div>
              ) : encountersError ? (
                <div className="rounded-[12px] border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                  Unable to load hospital encounters. Please retry in a moment.
                </div>
              ) : sortedEncounters.length === 0 ? (
                <div className="flex h-[52px] items-center justify-center rounded-[12px] border border-dashed border-[#cfd7e4] p-3 text-xs text-[#5b6678]">
                  No hospital encounters found for this patient in the HIS database.
                </div>
              ) : (
                <Select
                  value={selectedEncounterId ? String(selectedEncounterId) : ""}
                  onValueChange={(val) =>
                    val && setSelectedEncounterId(Number(val))
                  }
                >
                  <SelectTrigger
                    id="encounter-select"
                    className="h-[52px] w-full rounded-[12px] border border-[#c6e8ee] bg-[#f1fafb] px-[14px] text-[13px] font-semibold text-[#1b2433] hover:border-[#1f5fd6]/50 focus:ring-1 focus:ring-[#1f5fd6] dark:border-border dark:bg-muted/40 dark:text-foreground"
                  >
                    <SelectValue placeholder="Select an encounter">
                      {(value: string | null) => {
                        if (!value) return "Select an encounter"
                        const enc = sortedEncounters.find(
                          (e) => String(e.id) === value
                        )
                        if (!enc) return value
                        const dateOnly = enc.registrationDate
                          ? enc.registrationDate.split(" ")[0]
                          : "No Date"
                        return (
                          <span className="flex items-center gap-2 truncate">
                            <span>[ {dateOnly} ]</span>
                            <span>
                              {formatTransactionType(
                                enc.patientTransactionType
                              )}
                            </span>
                            <span className="font-mono text-xs text-[#5b6678]">
                              #{enc.id}
                            </span>
                          </span>
                        )
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-60 rounded-[12px] border-[#cfd7e4]">
                    {sortedEncounters.map((enc) => {
                      const queued = openEncounterIds.has(enc.id)
                      const dateOnly = enc.registrationDate
                        ? enc.registrationDate.split(" ")[0]
                        : "No Date"
                      const isActive = enc.registrationStatus?.code === "A"

                      return (
                        <SelectItem
                          key={enc.id}
                          value={String(enc.id)}
                          disabled={queued}
                          className="py-2.5 text-[12px]"
                        >
                          <div className="flex w-full items-center justify-between gap-3">
                            <div className="flex items-center gap-2 truncate">
                              <span className="font-semibold text-foreground">
                                [ {dateOnly} ]
                              </span>
                              <span className="truncate text-muted-foreground">
                                {formatTransactionType(
                                  enc.patientTransactionType
                                )}
                              </span>
                              <span className="font-mono text-xs text-muted-foreground">
                                #{enc.id}
                              </span>
                            </div>

                            <div className="ml-auto flex shrink-0 items-center gap-1.5">
                              {queued ? (
                                <Badge
                                  variant="outline"
                                  className="border-amber-500/40 bg-amber-500/10 text-[10px] font-bold text-amber-600"
                                >
                                  Already in queue
                                </Badge>
                              ) : isActive ? (
                                <Badge
                                  variant="outline"
                                  className="border-emerald-500/40 bg-emerald-500/10 text-[10px] font-bold text-emerald-600"
                                >
                                  Active
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-medium text-muted-foreground"
                                >
                                  {enc.registrationStatus?.label || "Past"}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* 2. Purpose of Visit Section (186:3033 / 370:4763) */}
            <div className="flex flex-col gap-[8px]">
              <div className="text-[12px] font-bold text-[#5b6678] dark:text-muted-foreground">
                2. Purpose of visit
              </div>

              <div className="flex flex-col gap-[8px]">
                {/* Option 1: Intake */}
                <button
                  type="button"
                  onClick={() => setSelectedPurpose("Intake")}
                  className={cn(
                    "flex w-full cursor-pointer items-start gap-[12px] rounded-[10px] p-[12px] text-left transition-all",
                    selectedPurpose === "Intake"
                      ? "border border-[#1f5fd6] bg-[#edf3fe] dark:border-primary dark:bg-primary/10"
                      : "border border-[#cfd7e4] bg-white hover:bg-[#f4f7fc]/50 dark:border-border dark:bg-card"
                  )}
                >
                  <span className="flex size-[18px] shrink-0 items-center justify-center pt-0.5">
                    {selectedPurpose === "Intake" ? (
                      <span className="flex size-[18px] items-center justify-center rounded-full border-2 border-[#1f5fd6]">
                        <span className="size-[8px] rounded-full bg-[#1f5fd6]" />
                      </span>
                    ) : (
                      <span className="size-[18px] rounded-full border-2 border-[#cfd7e4]" />
                    )}
                  </span>
                  <div className="flex flex-1 flex-col gap-[4px]">
                    <div className="flex items-center gap-[6px]">
                      <ClipboardList className="size-4 text-[#1f5fd6]" />
                      <span className="text-[13px] font-semibold text-[#0c2a5b] dark:text-foreground">
                        Intake
                      </span>
                    </div>
                    <p className="text-[12px] leading-[18px] font-normal text-[#5b6678] dark:text-muted-foreground">
                      A new or updated assessment. Fill in ANNEX B, then add
                      guarantors and print letters.
                    </p>
                  </div>
                </button>

                {/* Option 2: Guarantee only */}
                <button
                  type="button"
                  onClick={() => setSelectedPurpose("Guarantee only")}
                  className={cn(
                    "flex w-full cursor-pointer items-start gap-[12px] rounded-[10px] p-[12px] text-left transition-all",
                    selectedPurpose === "Guarantee only"
                      ? "border border-[#1f5fd6] bg-[#edf3fe] dark:border-primary dark:bg-primary/10"
                      : "border border-[#cfd7e4] bg-white hover:bg-[#f4f7fc]/50 dark:border-border dark:bg-card"
                  )}
                >
                  <span className="flex size-[18px] shrink-0 items-center justify-center pt-0.5">
                    {selectedPurpose === "Guarantee only" ? (
                      <span className="flex size-[18px] items-center justify-center rounded-full border-2 border-[#1f5fd6]">
                        <span className="size-[8px] rounded-full bg-[#1f5fd6]" />
                      </span>
                    ) : (
                      <span className="size-[18px] rounded-full border-2 border-[#cfd7e4]" />
                    )}
                  </span>
                  <div className="flex flex-1 flex-col gap-[4px]">
                    <div className="flex items-center gap-[6px]">
                      <CreditCard className="size-4 text-[#1f5fd6]" />
                      <span className="text-[13px] font-semibold text-[#0c2a5b] dark:text-foreground">
                        Guarantee only
                      </span>
                    </div>
                    <p className="text-[12px] leading-[18px] font-normal text-[#5b6678] dark:text-muted-foreground">
                      Uses the class from the latest saved ANNEX B. No new intake
                      sheet; go straight to guarantors and letters.
                    </p>
                  </div>
                </button>

                {/* Selected Visit Flow Steps Bar (370:4778) */}
                <div className="flex w-full items-center gap-[8px] rounded-[10px] bg-[#f4f7fc] p-[12px] dark:bg-muted/40">
                  <span className="text-[12px] font-medium text-[#5b6678] dark:text-muted-foreground">
                    STEPS
                  </span>
                  <div className="flex flex-wrap items-center gap-[8px]">
                    {steps.map((step, idx) => (
                      <React.Fragment key={step}>
                        <span className="rounded-full border border-[#cfd7e4] bg-white px-[8px] py-[4px] text-[12px] font-medium text-[#0c2a5b] dark:border-border dark:bg-card dark:text-foreground">
                          {step}
                        </span>
                        {idx < steps.length - 1 && (
                          <ArrowRight className="size-3.5 text-[#5b6678]" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* ANNEX B Guidance Callout (370:4791) */}
                <div className="flex w-full items-start gap-[8px] rounded-[10px] bg-[#c3e6d3] p-[12px] text-[#146b43] dark:bg-emerald-950/40 dark:text-emerald-300">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                  <p className="flex-1 text-[12px] leading-[18px] font-normal">
                    {latestAnnexB ? (
                      <>
                        Latest ANNEX B on record:{" "}
                        <strong className="font-semibold">
                          {latestAnnexBDate}
                        </strong>{" "}
                        ·{" "}
                        <strong className="font-semibold">
                          Class {latestAnnexBClass}
                        </strong>
                        . The letters use this class. A patient with no saved
                        ANNEX B has to take Intake.
                      </>
                    ) : (
                      <>
                        No saved ANNEX B on record. The patient has no prior
                        assessment, so they must take Intake.
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Remarks (Optional) Section (186:3056) */}
            <div className="flex flex-col gap-[6px]">
              <div className="text-[12px] font-bold text-[#5b6678] dark:text-muted-foreground">
                3. Remarks <span className="font-normal">(optional)</span>
              </div>
              <Input
                id="queue-remarks"
                value={remarks}
                maxLength={500}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Watcher information, notes for the desk"
                className="h-[52px] rounded-[12px] border border-[#c6e8ee] bg-[#f1fafb] px-[14px] text-[13px] text-[#1b2433] placeholder:text-[#5b6678] hover:border-[#1f5fd6]/50 focus:border-[#1f5fd6] focus:ring-1 focus:ring-[#1f5fd6] dark:border-border dark:bg-muted/40 dark:text-foreground"
              />
            </div>
          </div>

          {/* Modal Footer (186:3020) */}
          <div
            data-node-id="186:3020"
            className="flex items-center justify-between border-t border-[#e4e9f2] px-[24px] py-[14px] dark:border-border"
          >
            <span className="text-[12px] font-normal text-[#5b6678] dark:text-muted-foreground">
              Waiting time starts now.
            </span>

            <div className="flex items-center gap-[8px]">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={timeInMutation.isPending}
                className="cursor-pointer rounded-full px-[16px] py-[10px] text-[14px] font-bold text-[#0c2a5b] transition-colors hover:bg-[#f4f7fc] dark:text-foreground dark:hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedEncounterId || timeInMutation.isPending}
                className="flex cursor-pointer items-center gap-[8px] rounded-full bg-[#1f5fd6] px-[25px] py-[10px] text-[14px] font-bold text-white shadow-[0px_6px_7px_rgba(32,96,215,0.25)] transition-colors hover:bg-[#1950b8] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {timeInMutation.isPending ? (
                  <>
                    <Loader2 className="size-5 animate-spin" />
                    <span>Queuing…</span>
                  </>
                ) : (
                  <>
                    <img
                      alt=""
                      className="block size-[20px] max-w-none"
                      src="/images/patient-registry/queue-modal-confirm-clock.svg"
                    />
                    <span>Confirm queue</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
