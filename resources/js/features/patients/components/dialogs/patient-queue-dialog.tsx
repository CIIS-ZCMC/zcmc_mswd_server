import React, { useMemo, useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ApiError } from "@/lib/api-client"
import { useHospitalEncounters } from "@/features/hospital/hooks/use-hospital-encounters"
import { formatTransactionType } from "@/features/hospital/lib/transaction-type"
import type { HospitalEncounter } from "@/features/hospital/types"
import type { PatientRecord } from "../../types"
import { usePatientVisits, useTimeInVisit } from "@/features/queue"
import { Clock, Loader2, UserCheck, AlertCircle } from "lucide-react"

interface PatientQueueDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  patient: PatientRecord
}

const DEFAULT_PURPOSE = "Guarantee letter / Assistance"
const OTHER_PURPOSE_VALUE = "Other / Specify..."

const PURPOSE_OPTIONS = [
  "Guarantee letter / Assistance",
  "Assessment / Intake",
  "Financial Assistance",
  "Counseling / Interview",
  "Medical Requirements",
  OTHER_PURPOSE_VALUE,
]

function sortEncounters(list: HospitalEncounter[]): HospitalEncounter[] {
  return [...list].sort((a, b) => {
    const activeA = a.registrationStatus?.code === "A" ? 0 : 1
    const activeB = b.registrationStatus?.code === "A" ? 0 : 1
    if (activeA !== activeB) return activeA - activeB
    return (b.registrationDate ?? "").localeCompare(a.registrationDate ?? "")
  })
}

export const PatientQueueDialog: React.FC<PatientQueueDialogProps> = ({
  open,
  onOpenChange,
  patient,
}) => {
  const [selectedEncounterId, setSelectedEncounterId] = useState<number | null>(
    null
  )
  const [selectedPurposePreset, setSelectedPurposePreset] =
    useState(DEFAULT_PURPOSE)
  const [customPurpose, setCustomPurpose] = useState("")
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
      setSelectedPurposePreset(DEFAULT_PURPOSE)
      setCustomPurpose("")
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
  }, [open, sortedEncounters, openEncounterIds, selectedEncounterId])

  const timeInMutation = useTimeInVisit()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEncounterId) {
      setError("Please select a hospital encounter to queue this patient for.")
      return
    }

    const finalPurpose =
      selectedPurposePreset === OTHER_PURPOSE_VALUE
        ? customPurpose.trim()
        : selectedPurposePreset

    if (!finalPurpose) {
      setError("Please specify the visit purpose.")
      return
    }

    setError(null)

    try {
      await timeInMutation.mutateAsync({
        patientId: patient.id,
        input: {
          hisTransactionId: selectedEncounterId,
          purpose: finalPurpose,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full gap-5 p-6 sm:max-w-xl sm:p-7">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Clock className="size-5.5 text-primary" />
            Queue Patient
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground sm:text-sm">
            Place patient on the MSWD Service Desk queue. Arrival timestamp is
            stamped by the server clock.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1 sm:space-y-5">
          {error && (
            <Alert variant="destructive" className="py-2.5 text-xs">
              <AlertCircle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Patient Summary Card */}
          <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                <UserCheck className="size-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-foreground">
                  {patient.fullName}
                </div>
                <div className="font-mono text-xs text-muted-foreground">
                  Hosp ID:{" "}
                  <strong className="text-foreground">
                    {patient.hospitalNo || "—"}
                  </strong>{" "}
                  • MSWD ID:{" "}
                  <strong className="text-foreground">
                    {patient.mswdNo || "—"}
                  </strong>
                </div>
              </div>
            </div>
            {patient.category && (
              <Badge variant="outline" className="shrink-0 text-xs font-bold">
                {patient.category}
              </Badge>
            )}
          </div>

          {/* Step 1: HIS Encounter Selection Dropdown */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="encounter-select"
                className="text-xs font-semibold text-foreground"
              >
                1. Hospital Encounter
              </Label>
              {sortedEncounters.length > 0 && (
                <span className="text-[11px] text-muted-foreground">
                  {sortedEncounters.length} encounter
                  {sortedEncounters.length > 1 ? "s" : ""} on record
                </span>
              )}
            </div>

            {!hospitalId ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
                This patient does not have a linked hospital number, so there
                are no HIS encounters to queue for.
              </div>
            ) : encountersLoading ? (
              <div className="flex items-center gap-2 rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
                <Loader2 className="size-4 animate-spin text-primary" />
                Loading encounters from HIS…
              </div>
            ) : encountersError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                Unable to load hospital encounters. Please retry in a moment.
              </div>
            ) : sortedEncounters.length === 0 ? (
              <div className="rounded-lg border bg-muted/20 p-3 text-center text-xs text-muted-foreground">
                No hospital encounters found for this patient in the HIS
                database.
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
                  className="h-11 text-xs font-medium sm:text-sm"
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
                        <span className="flex items-center gap-1.5 truncate">
                          <strong className="font-bold text-foreground">
                            {dateOnly}
                          </strong>
                          <span className="text-muted-foreground">—</span>
                          <span className="font-semibold text-foreground">
                            #{enc.id}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            ({formatTransactionType(enc.patientTransactionType)}
                            )
                          </span>
                        </span>
                      )
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-64">
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
                        className="py-2 text-xs sm:text-sm"
                      >
                        <div className="flex w-full items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="font-bold text-foreground">
                              {dateOnly}
                            </span>
                            <span className="text-muted-foreground">—</span>
                            <span className="font-semibold text-foreground">
                              #{enc.id}
                            </span>
                            <span className="truncate text-xs text-muted-foreground">
                              (
                              {formatTransactionType(
                                enc.patientTransactionType
                              )}
                              )
                            </span>
                          </div>

                          <div className="mr-2 ml-auto flex shrink-0 items-center gap-1.5">
                            {queued ? (
                              <Badge
                                variant="outline"
                                className="border-amber-500/40 text-[10px] font-bold text-amber-600"
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

          {/* Step 2: Purpose Dropdown */}
          <div className="space-y-1.5">
            <Label
              htmlFor="purpose-select"
              className="text-xs font-semibold text-foreground"
            >
              2. Purpose of Visit
            </Label>
            <Select
              value={selectedPurposePreset}
              onValueChange={(val) => val && setSelectedPurposePreset(val)}
            >
              <SelectTrigger
                id="purpose-select"
                className="h-11 text-xs font-medium sm:text-sm"
              >
                <SelectValue placeholder="Select visit purpose" />
              </SelectTrigger>
              <SelectContent>
                {PURPOSE_OPTIONS.map((item) => (
                  <SelectItem
                    key={item}
                    value={item}
                    className="py-2 text-xs sm:text-sm"
                  >
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedPurposePreset === OTHER_PURPOSE_VALUE && (
              <div className="pt-1.5">
                <Input
                  id="custom-purpose"
                  value={customPurpose}
                  maxLength={120}
                  onChange={(e) => setCustomPurpose(e.target.value)}
                  placeholder="Specify custom visit purpose…"
                  className="h-10 text-xs sm:text-sm"
                  autoFocus
                />
              </div>
            )}
          </div>

          {/* Step 3: Remarks (Optional) */}
          <div className="space-y-1.5">
            <Label
              htmlFor="queue-remarks"
              className="text-xs font-semibold text-foreground"
            >
              3. Remarks (Optional)
            </Label>
            <Textarea
              id="queue-remarks"
              value={remarks}
              maxLength={500}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Watcher information, special notes for desk..."
              className="min-h-20 text-xs sm:text-sm"
            />
          </div>

          <DialogFooter className="gap-2 pt-3 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={() => onOpenChange(false)}
              disabled={timeInMutation.isPending}
              className="h-10 px-5 text-sm font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="default"
              disabled={!selectedEncounterId || timeInMutation.isPending}
              className="h-10 gap-2 px-6 text-sm font-bold shadow-sm"
            >
              {timeInMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Queuing…
                </>
              ) : (
                <>
                  <Clock className="size-4" />
                  Confirm Queue
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
