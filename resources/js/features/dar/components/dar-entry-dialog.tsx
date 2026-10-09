import React, { useEffect, useState, useTransition } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  AlertCircle,
  FileCheck,
  Loader2,
  Search,
  UserCheck,
  X,
} from "lucide-react"
import { ApiError } from "@/lib/api-client"
import { useRegistryQuickSearch } from "@/features/patients/hooks/use-registry-quick-search"
import { computeAge } from "@/features/patients/api/patients-adapter"
import { useCreateDarEntry, useUpdateDarEntry } from "../hooks/use-dar"
import type { DarEntry, DarPatient } from "../types/dar.types"

// Mirrors DarEntry::ACTIVITIES; used until GET /api/dar has returned the list.
const DEFAULT_ACTIVITIES: Record<string, string> = {
  interview: "Interview",
  assessment: "Assessment",
  counseling: "Counseling",
  guarantee_assistance: "Guarantee / Assistance",
  referral: "Referral",
  follow_up: "Follow-up",
  home_ward_visit: "Home/Ward Visit",
  documentation: "Documentation",
  other: "Other",
}

interface DarEntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentDate: string
  entry?: DarEntry | null
  activitiesMap?: Record<string, string>
  onSaved?: () => void
}

export const DarEntryDialog: React.FC<DarEntryDialogProps> = ({
  open,
  onOpenChange,
  currentDate,
  entry,
  activitiesMap = DEFAULT_ACTIVITIES,
  onSaved,
}) => {
  const isEditing = Boolean(entry)
  const createMutation = useCreateDarEntry()
  const updateMutation = useUpdateDarEntry()

  // Form states
  const [selectedPatient, setSelectedPatient] = useState<DarPatient | null>(
    null
  )
  const [patientSearch, setPatientSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [activity, setActivity] = useState("interview")
  const [servedTime, setServedTime] = useState("")
  const [remarks, setRemarks] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  // Search debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        setDebouncedSearch(patientSearch)
      })
    }, 250)
    return () => clearTimeout(timer)
  }, [patientSearch])

  // Registry quick search
  const { data: searchResults, isLoading: isSearching } =
    useRegistryQuickSearch(debouncedSearch)
  const patientsList = searchResults?.data ?? []

  // Initialize or reset form on open/change
  useEffect(() => {
    if (!open) {
      setSelectedPatient(null)
      setPatientSearch("")
      setDebouncedSearch("")
      setActivity("interview")
      setServedTime("")
      setRemarks("")
      setError(null)
      return
    }

    if (entry) {
      setSelectedPatient(entry.patient)
      setActivity(entry.activity || "interview")
      setServedTime(entry.served_time ?? "")
      setRemarks(entry.remarks ?? "")
      setError(null)
    } else {
      setSelectedPatient(null)
      setPatientSearch("")
      setDebouncedSearch("")
      setActivity("interview")
      setServedTime("")
      setRemarks("")
      setError(null)
    }
  }, [open, entry])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selectedPatient) {
      setError("Please select a patient from the MSWD registry.")
      return
    }

    if (!activity) {
      setError("Please select an activity.")
      return
    }

    try {
      if (isEditing && entry) {
        await updateMutation.mutateAsync({
          id: entry.id,
          payload: {
            patient_id: selectedPatient.id,
            entry_date: currentDate,
            served_time: servedTime || null,
            activity,
            remarks: remarks.trim() || null,
          },
        })
      } else {
        await createMutation.mutateAsync({
          patient_id: selectedPatient.id,
          entry_date: currentDate,
          served_time: servedTime || null,
          activity,
          remarks: remarks.trim() || null,
        })
      }

      onOpenChange(false)
      onSaved?.()
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.firstValidationMessage ?? err.message)
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("Failed to save DAR entry.")
      }
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader className="space-y-1.5 border-b pb-3">
          <div className="flex items-center gap-2">
            <FileCheck className="size-5 shrink-0 text-primary" />
            <DialogTitle className="text-lg font-bold text-foreground sm:text-xl">
              {isEditing ? "Edit DAR Entry" : "New DAR Entry"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs font-medium text-muted-foreground sm:text-sm">
            Daily Accomplishment Report entry for{" "}
            <span className="font-bold text-foreground">{currentDate}</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="size-4 shrink-0" />
              <AlertTitle className="text-xs font-bold">
                Unable to save
              </AlertTitle>
              <AlertDescription className="mt-0.5 text-xs">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Patient Selection */}
          <div className="space-y-2">
            <Label className="text-xs font-bold tracking-wider text-foreground uppercase">
              Patient (MSWD Registry){" "}
              <span className="text-destructive">*</span>
            </Label>

            {selectedPatient ? (
              <div className="space-y-2 rounded-xl border bg-muted/40 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <UserCheck className="size-4.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>{selectedPatient.name}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPatient(null)}
                    className="h-7 px-2 text-xs font-bold text-muted-foreground hover:text-foreground"
                  >
                    <X className="mr-1 size-3.5" /> Change
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>
                    Hospital #:{" "}
                    <strong className="text-foreground">
                      {selectedPatient.hospital_id ?? "—"}
                    </strong>
                  </div>
                  <div>
                    MSWD ID:{" "}
                    <strong className="text-foreground">
                      {selectedPatient.mswd_id ?? "—"}
                    </strong>
                  </div>
                  <div>
                    Age / Sex:{" "}
                    <strong className="text-foreground">
                      {selectedPatient.age !== null
                        ? `${selectedPatient.age} y/o`
                        : "—"}{" "}
                      {selectedPatient.sex ? `· ${selectedPatient.sex}` : ""}
                    </strong>
                  </div>
                  <div className="truncate">
                    Address:{" "}
                    <strong
                      className="text-foreground"
                      title={selectedPatient.address ?? undefined}
                    >
                      {selectedPatient.address ?? "—"}
                    </strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search patient by name, Hosp #, or MSWD ID…"
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    className="h-10 pr-8 pl-9 text-sm font-medium"
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
                  <div className="flex items-center gap-2 rounded-lg border bg-muted/20 p-3 text-xs font-medium text-muted-foreground">
                    <Loader2 className="size-4 animate-spin text-primary" />
                    Searching MSWD patient registry…
                  </div>
                ) : debouncedSearch.trim().length >= 2 ? (
                  patientsList.length > 0 ? (
                    <div className="max-h-48 divide-y overflow-y-auto rounded-lg border bg-popover shadow-sm">
                      {patientsList.map((p) => {
                        const fullName = [
                          p.last_name + ",",
                          p.first_name,
                          p.middle_name,
                          p.extension_name,
                        ]
                          .filter(Boolean)
                          .join(" ")
                        const age = computeAge(p.birthdate)
                        const address =
                          p.permanent_address ||
                          [p.address, p.barangay, p.municipality]
                            .filter(Boolean)
                            .join(", ")

                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setSelectedPatient({
                                id: p.id,
                                name: fullName,
                                hospital_id: p.hospital_id ?? null,
                                mswd_id:
                                  p.mswd_id == null ? null : String(p.mswd_id),
                                age: age || null,
                                sex: p.sex ?? null,
                                address: address || null,
                              })
                              setPatientSearch("")
                              setDebouncedSearch("")
                            }}
                            className="group flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2 text-left text-xs transition-colors hover:bg-accent/60"
                          >
                            <div className="space-y-0.5">
                              <div className="text-sm font-bold text-foreground transition-colors group-hover:text-primary">
                                {fullName}
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <span>Hosp #{p.hospital_id || "—"}</span>
                                <span>•</span>
                                <span>MSWD #{p.mswd_id || "—"}</span>
                                <span>•</span>
                                <span>{age ? `${age} y/o` : "Age N/A"}</span>
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className="shrink-0 text-[10px] font-bold"
                            >
                              Select
                            </Badge>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="rounded-lg border bg-muted/20 p-3 text-center text-xs text-muted-foreground">
                      No matching patient found in MSWD registry for “
                      {debouncedSearch}”.
                    </div>
                  )
                ) : (
                  <p className="px-1 text-[11px] text-muted-foreground">
                    Type at least 2 characters to search the registry. Free-text
                    entries are not allowed.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Activity Selection & Time Served */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label
                htmlFor="dar-activity"
                className="text-xs font-bold tracking-wider text-foreground uppercase"
              >
                Activity / Service <span className="text-destructive">*</span>
              </Label>
              <Select
                value={activity}
                onValueChange={(val) => val && setActivity(val)}
              >
                <SelectTrigger
                  id="dar-activity"
                  className="h-10 w-full border text-sm font-medium"
                >
                  <SelectValue placeholder="Select activity">
                    {(value: string | null) =>
                      value ? (activitiesMap[value] ?? value) : ""
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(activitiesMap).map(([key, label]) => (
                    <SelectItem
                      key={key}
                      value={key}
                      className="text-sm font-medium"
                    >
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="dar-served-time"
                className="text-xs font-bold tracking-wider text-foreground uppercase"
              >
                Time Served (Optional)
              </Label>
              <div className="relative">
                <Input
                  id="dar-served-time"
                  type="time"
                  value={servedTime}
                  onChange={(e) => setServedTime(e.target.value)}
                  className="h-10 text-sm font-medium"
                />
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="dar-remarks"
                className="text-xs font-bold tracking-wider text-foreground uppercase"
              >
                Remarks / Notes (Optional)
              </Label>
              <span className="font-mono text-[11px] text-muted-foreground">
                {remarks.length}/500
              </span>
            </div>
            <Textarea
              id="dar-remarks"
              placeholder="e.g. Completed initial assessment; referred to Malasakit Center for billing guarantee."
              value={remarks}
              maxLength={500}
              onChange={(e) => setRemarks(e.target.value)}
              className="min-h-20 text-sm"
            />
          </div>

          <DialogFooter className="flex-col gap-2 border-t pt-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="h-10 px-4 text-sm font-bold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving || !selectedPatient}
              className="h-10 gap-2 px-5 text-sm font-bold"
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <FileCheck className="size-4" />
                  {isEditing ? "Update Entry" : "Add Entry"}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
