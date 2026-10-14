import React, { useEffect, useMemo, useState, useTransition } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ApiError } from "@/lib/api-client"
import { useRegistryQuickSearch } from "@/features/patients/hooks/use-registry-quick-search"
import { useHospitalEncounters } from "@/features/hospital/hooks/use-hospital-encounters"
import { RegistryStatusBadge } from "@/features/hospital/components/registry-status-badge"
import { formatTransactionType } from "@/features/hospital/lib/transaction-type"
import type { HospitalEncounter } from "@/features/hospital/types"
import { Loader2, LogIn, Search, UserCheck, X } from "lucide-react"
import { usePatientVisits, useTimeInVisit } from "../hooks/use-queue"

interface TimeInDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface PickedPatient {
  id: number
  name: string
  hospitalId: number | null
  mswdId: string | null
}

const DEFAULT_PURPOSE = "Guarantee letter / Assistance"

/** Active encounters first, then newest first. */
function sortEncounters(list: HospitalEncounter[]): HospitalEncounter[] {
  return [...list].sort((a, b) => {
    const activeA = a.registrationStatus?.code === "A" ? 0 : 1
    const activeB = b.registrationStatus?.code === "A" ? 0 : 1
    if (activeA !== activeB) return activeA - activeB
    return (b.registrationDate ?? "").localeCompare(a.registrationDate ?? "")
  })
}

/**
 * Time a patient in from the queue board: pick a registry patient, then one of
 * their HIS encounters, then confirm. Arrival is stamped by the server.
 */
export const TimeInDialog: React.FC<TimeInDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const [patientSearch, setPatientSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [patient, setPatient] = useState<PickedPatient | null>(null)
  const [encounterId, setEncounterId] = useState<number | null>(null)
  const [purpose, setPurpose] = useState(DEFAULT_PURPOSE)
  const [remarks, setRemarks] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const timeInMutation = useTimeInVisit()

  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => setDebouncedSearch(patientSearch))
    }, 250)
    return () => clearTimeout(timer)
  }, [patientSearch])

  // Reset everything when the dialog closes.
  useEffect(() => {
    if (open) return
    setPatientSearch("")
    setDebouncedSearch("")
    setPatient(null)
    setEncounterId(null)
    setPurpose(DEFAULT_PURPOSE)
    setRemarks("")
    setError(null)
  }, [open])

  const { data: searchResults, isLoading: isSearching } =
    useRegistryQuickSearch(debouncedSearch)
  const patientsList = searchResults?.data ?? []

  const {
    data: encounters = [],
    isLoading: encountersLoading,
    error: encountersError,
  } = useHospitalEncounters(patient?.hospitalId ?? undefined)
  const sortedEncounters = useMemo(
    () => sortEncounters(encounters),
    [encounters]
  )

  // Encounters already on the queue can't be timed in again.
  const { data: visits = [] } = usePatientVisits(
    patient?.id,
    undefined,
    open && patient !== null
  )
  const openEncounterIds = useMemo(
    () =>
      new Set(
        visits
          .filter((v) => v.status === "waiting" || v.status === "in_progress")
          .map((v) => v.hisTransactionId)
      ),
    [visits]
  )

  const pickPatient = (next: PickedPatient | null) => {
    setPatient(next)
    setEncounterId(null)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patient || encounterId === null) return
    setError(null)
    try {
      await timeInMutation.mutateAsync({
        patientId: patient.id,
        input: {
          hisTransactionId: encounterId,
          purpose: purpose.trim() || undefined,
          remarks: remarks.trim() || undefined,
        },
      })
      onOpenChange(false)
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to time in patient."
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <LogIn className="size-5 text-primary" />
            Time In Patient
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Pick a registry patient and the HIS encounter they came for. Arrival
            is stamped with the server clock.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {error && (
            <Alert variant="destructive" className="py-2.5 text-xs">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Step 1: patient */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">1. Patient</Label>
            {patient ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                <div className="flex items-center gap-2">
                  <UserCheck className="size-4 text-primary" />
                  <div>
                    <div className="text-sm font-bold">{patient.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      Hosp #{patient.hospitalId ?? "—"} • MSWD #
                      {patient.mswdId ?? "—"}
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => pickPatient(null)}
                  className="h-7 text-xs"
                >
                  Change
                </Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search patient by name, Hosp #, or MSWD ID…"
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    className="h-10 pr-8 pl-9 text-sm"
                    autoFocus
                  />
                  {patientSearch && (
                    <button
                      type="button"
                      onClick={() => setPatientSearch("")}
                      className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
                {isSearching ? (
                  <div className="flex items-center gap-2 rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
                    <Loader2 className="size-4 animate-spin text-primary" />
                    Searching the MSWD registry…
                  </div>
                ) : debouncedSearch.trim().length >= 2 ? (
                  patientsList.length > 0 ? (
                    <div className="max-h-44 divide-y overflow-y-auto rounded-lg border bg-popover">
                      {patientsList.map((p) => {
                        const name = [
                          p.last_name + ",",
                          p.first_name,
                          p.middle_name,
                          p.extension_name,
                        ]
                          .filter(Boolean)
                          .join(" ")
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              pickPatient({
                                id: p.id,
                                name,
                                hospitalId: p.hospital_id ?? null,
                                mswdId:
                                  p.mswd_id == null ? null : String(p.mswd_id),
                              })
                              setPatientSearch("")
                              setDebouncedSearch("")
                            }}
                            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs hover:bg-accent/60"
                          >
                            <div>
                              <div className="text-sm font-bold">{name}</div>
                              <div className="text-muted-foreground">
                                Hosp #{p.hospital_id || "—"} • MSWD #
                                {p.mswd_id || "—"}
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className="text-[10px] font-bold"
                            >
                              Select
                            </Badge>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
                      No registry patient matches. To add someone from HIS, use
                      &ldquo;Search or Import Patient&rdquo; in the header
                      first.
                    </p>
                  )
                ) : null}
              </>
            )}
          </div>

          {/* Step 2: encounter */}
          {patient && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold">2. HIS encounter</Label>
              {patient.hospitalId === null ? (
                <p className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
                  This patient has no hospital number, so there are no HIS
                  encounters to time in for.
                </p>
              ) : encountersLoading ? (
                <div className="flex items-center gap-2 rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
                  <Loader2 className="size-4 animate-spin text-primary" />
                  Loading HIS encounters…
                </div>
              ) : encountersError ? (
                <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                  Couldn&apos;t load HIS encounters. Try again in a moment.
                </p>
              ) : sortedEncounters.length === 0 ? (
                <p className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
                  HIS has no encounters for this patient.
                </p>
              ) : (
                <div className="max-h-52 divide-y overflow-y-auto rounded-lg border">
                  {sortedEncounters.map((enc) => {
                    const queued = openEncounterIds.has(enc.id)
                    const selected = encounterId === enc.id
                    return (
                      <button
                        key={enc.id}
                        type="button"
                        disabled={queued}
                        onClick={() => setEncounterId(enc.id)}
                        className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs transition-colors ${
                          selected
                            ? "bg-primary/10"
                            : "hover:bg-accent/60 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                        }`}
                      >
                        <div>
                          <div className="font-bold">
                            #{enc.id}{" "}
                            <span className="font-normal text-muted-foreground">
                              {enc.registrationDate ?? "—"}
                            </span>
                          </div>
                          <div className="text-muted-foreground">
                            {formatTransactionType(enc.patientTransactionType)}
                          </div>
                        </div>
                        {queued ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-bold"
                          >
                            Already in queue
                          </Badge>
                        ) : (
                          <RegistryStatusBadge
                            status={enc.registrationStatus}
                          />
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 3: details */}
          {patient && encounterId !== null && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="time-in-purpose"
                  className="text-xs font-semibold"
                >
                  3. Purpose of visit
                </Label>
                <Input
                  id="time-in-purpose"
                  value={purpose}
                  maxLength={120}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Guarantee letter, Assessment, Counseling"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="time-in-remarks"
                  className="text-xs font-semibold"
                >
                  Remarks (optional)
                </Label>
                <Textarea
                  id="time-in-remarks"
                  value={remarks}
                  maxLength={500}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Watcher details, desk notes..."
                  className="min-h-16 text-sm"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={timeInMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={
                !patient || encounterId === null || timeInMutation.isPending
              }
              className="gap-2"
            >
              {timeInMutation.isPending && (
                <Loader2 className="size-3.5 animate-spin" />
              )}
              Confirm Time In
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
