import React, { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { PatientRecord } from "../../types"
import {
  useCancelVisit,
  useCompleteVisit,
  useStartVisit,
  type ServiceVisit,
} from "@/features/queue"
import { usePermission } from "@/features/auth/hooks/use-permission"
import { toast } from "@/components/ui/toast"
import { ApiError } from "@/lib/api-client"
import {
  Ban,
  CheckCircle2,
  Clock,
  ExternalLink,
  Hourglass,
  Loader2,
  Play,
} from "lucide-react"
import { useNavigate } from "@/lib/inertia-router-hooks"

interface PatientActiveQueueStatusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  patient: PatientRecord
  activeVisit: ServiceVisit | null
}

type DialogMode = "status" | "complete" | "cancel"

function formatElapsed(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}m ${secs < 10 ? "0" : ""}${secs}s`
}

function getElapsedSeconds(
  fromIso?: string | null,
  currentMs = Date.now()
): number {
  if (!fromIso) return 0
  const fromMs = new Date(fromIso).getTime()
  return Math.max(0, Math.floor((currentMs - fromMs) / 1000))
}

function formatDateTime(isoString?: string | null): string {
  if (!isoString) return "—"
  try {
    const d = new Date(isoString)
    return (
      d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }) +
      " • " +
      d.toLocaleDateString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    )
  } catch {
    return isoString
  }
}

export const PatientActiveQueueStatusDialog: React.FC<
  PatientActiveQueueStatusDialogProps
> = ({ open, onOpenChange, patient, activeVisit }) => {
  const navigate = useNavigate()
  const canManage = usePermission("queue.manage")

  const startMutation = useStartVisit()
  const completeMutation = useCompleteVisit()
  const cancelMutation = useCancelVisit()

  const [mode, setMode] = useState<DialogMode>("status")
  const [completeRemarks, setCompleteRemarks] = useState("")
  const [cancelReason, setCancelReason] = useState("")
  const [actionError, setActionError] = useState<string | null>(null)
  const [now, setNow] = useState<number>(() => Date.now())

  // Keep a cached copy of the active visit so closing exit-animations don't abruptly glitch
  const [cachedVisit, setCachedVisit] = useState(activeVisit)
  if (activeVisit && activeVisit !== cachedVisit) {
    setCachedVisit(activeVisit)
  }
  const currentVisit = activeVisit ?? cachedVisit

  // Reset dialog sub-state when closed
  useEffect(() => {
    if (!open) {
      setMode("status")
      setCompleteRemarks("")
      setCancelReason("")
      setActionError(null)
    }
  }, [open])

  // SSR-safe live ticker
  useEffect(() => {
    if (!open) return
    setNow(Date.now())
    const interval = setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [open])

  if (!currentVisit) return null

  const isWaiting = currentVisit.status === "waiting"
  const isServing = currentVisit.status === "in_progress"

  const waitSeconds = isWaiting
    ? getElapsedSeconds(currentVisit.arrivedAt, now)
    : currentVisit.waitingMinutes != null
      ? currentVisit.waitingMinutes * 60
      : currentVisit.startedAt
        ? Math.max(
            0,
            Math.floor(
              (new Date(currentVisit.startedAt).getTime() -
                new Date(currentVisit.arrivedAt).getTime()) /
                1000
            )
          )
        : 0

  const serviceSeconds = isServing
    ? getElapsedSeconds(currentVisit.startedAt, now)
    : 0

  const isAnyPending =
    startMutation.isPending ||
    completeMutation.isPending ||
    cancelMutation.isPending

  const handleStartService = async () => {
    if (!currentVisit) return
    setActionError(null)
    try {
      await startMutation.mutateAsync(currentVisit.id)
      toast.add({
        title: "Service Started",
        description: `Service has started for ${patient.fullName}.`,
        type: "success",
      })
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Failed to start service."
      setActionError(msg)
      toast.add({
        title: "Action Failed",
        description: msg,
        type: "error",
      })
    }
  }

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentVisit) return
    setActionError(null)
    try {
      await completeMutation.mutateAsync({
        visitId: currentVisit.id,
        input: {
          remarks: completeRemarks.trim() || undefined,
        },
      })
      toast.add({
        title: "Service Completed",
        description: `Service visit for ${patient.fullName} has been completed.`,
        type: "success",
      })
      onOpenChange(false)
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Failed to complete service visit."
      setActionError(msg)
    }
  }

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentVisit || !cancelReason.trim()) return
    setActionError(null)
    try {
      await cancelMutation.mutateAsync({
        visitId: currentVisit.id,
        input: {
          cancelReason: cancelReason.trim(),
        },
      })
      toast.add({
        title: "Visit Cancelled",
        description: `Queue visit for ${patient.fullName} was cancelled.`,
        type: "info",
      })
      onOpenChange(false)
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Failed to cancel service visit."
      setActionError(msg)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full gap-4 p-6 sm:max-w-md">
        {mode === "status" && (
          <>
            <DialogHeader>
              <div className="flex items-center justify-between pr-4">
                <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                  <Clock className="size-5 text-amber-500" />
                  Active Queue Status
                </DialogTitle>
                <Badge
                  variant="outline"
                  className={`px-2.5 py-0.5 text-xs font-bold ${
                    isServing
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  }`}
                >
                  <span
                    className={`mr-1.5 size-2 animate-pulse rounded-full ${
                      isServing ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                  />
                  {isServing ? "Currently in Service" : "Waiting in Queue"}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                {patient.fullName} is currently tracked on today&apos;s Service
                Desk queue.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {actionError && (
                <Alert variant="destructive" className="py-2 text-xs">
                  <AlertDescription>{actionError}</AlertDescription>
                </Alert>
              )}

              {/* Live Turnaround Time Ticker Card */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                    <Hourglass className="size-3.5" />
                    {isWaiting ? "Elapsed Wait Time" : "Total Wait Time"}
                  </div>
                  <div className="mt-1 font-mono text-2xl font-black tracking-tight text-foreground">
                    {formatElapsed(waitSeconds)}
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    Arrived: {formatDateTime(currentVisit.arrivedAt)}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-3.5 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Play className="size-3.5 text-primary" />
                    Service Time
                  </div>
                  <div className="mt-1 font-mono text-2xl font-black tracking-tight text-foreground">
                    {isServing ? formatElapsed(serviceSeconds) : "—"}
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {isServing
                      ? `Started: ${formatDateTime(currentVisit.startedAt)}`
                      : "Awaiting worker"}
                  </div>
                </div>
              </div>

              {/* Visit & Encounter Details */}
              <div className="space-y-2 rounded-xl border bg-muted/30 p-3.5 text-xs">
                <div className="flex items-center justify-between border-b border-border/50 py-1">
                  <span className="font-semibold text-muted-foreground">
                    Encounter ID
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    #{currentVisit.hisTransactionId}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-border/50 py-1">
                  <span className="font-semibold text-muted-foreground">
                    Purpose
                  </span>
                  <span className="max-w-[200px] truncate text-right font-semibold text-foreground">
                    {currentVisit.purpose || "General Assistance"}
                  </span>
                </div>

                {currentVisit.receivedBy && (
                  <div className="flex items-center justify-between border-b border-border/50 py-1">
                    <span className="font-semibold text-muted-foreground">
                      Received By
                    </span>
                    <span className="font-medium text-foreground">
                      {currentVisit.receivedBy.name}
                    </span>
                  </div>
                )}

                {currentVisit.servedBy && (
                  <div className="flex items-center justify-between border-b border-border/50 py-1">
                    <span className="font-semibold text-muted-foreground">
                      Handled By
                    </span>
                    <span className="font-bold text-primary">
                      {currentVisit.servedBy.name}
                    </span>
                  </div>
                )}

                {currentVisit.remarks && (
                  <div className="pt-1">
                    <span className="mb-0.5 block font-semibold text-muted-foreground">
                      Remarks
                    </span>
                    <p className="rounded bg-background p-2 text-muted-foreground italic">
                      &ldquo;{currentVisit.remarks}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
              <div>
                {canManage && (isWaiting || isServing) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => {
                      setCancelReason("")
                      setActionError(null)
                      setMode("cancel")
                    }}
                    disabled={isAnyPending}
                  >
                    <Ban className="size-3.5" />
                    Cancel Visit
                  </Button>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => onOpenChange(false)}
                  disabled={isAnyPending}
                >
                  Close
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    onOpenChange(false)
                    navigate("/queue")
                  }}
                  disabled={isAnyPending}
                >
                  <ExternalLink className="size-3.5" />
                  Queue Board
                </Button>

                {canManage && isWaiting && (
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 gap-1.5 bg-blue-600 font-bold text-white shadow-xs hover:bg-blue-700"
                    onClick={handleStartService}
                    disabled={isAnyPending}
                  >
                    {startMutation.isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Play className="size-3.5 fill-current" />
                    )}
                    Start Service
                  </Button>
                )}

                {canManage && isServing && (
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 gap-1.5 bg-emerald-600 font-bold text-white shadow-xs hover:bg-emerald-700"
                    onClick={() => {
                      setCompleteRemarks(currentVisit.remarks || "")
                      setActionError(null)
                      setMode("complete")
                    }}
                    disabled={isAnyPending}
                  >
                    <CheckCircle2 className="size-3.5" />
                    End Service
                  </Button>
                )}
              </div>
            </DialogFooter>
          </>
        )}

        {mode === "complete" && (
          <>
            <DialogHeader>
              <div className="flex items-center justify-between pr-4">
                <DialogTitle className="flex items-center gap-2 text-base font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-5" />
                  End Service Visit
                </DialogTitle>
                <Badge
                  variant="outline"
                  className="border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400"
                >
                  Encounter #{currentVisit.hisTransactionId}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                Finalize and complete service for {patient.fullName}.
              </DialogDescription>
            </DialogHeader>

            <form
              id="complete-visit-form"
              onSubmit={handleCompleteSubmit}
              className="space-y-4 pt-1"
            >
              {actionError && (
                <Alert variant="destructive" className="py-2 text-xs">
                  <AlertDescription>{actionError}</AlertDescription>
                </Alert>
              )}

              {/* Summary of Turnaround Time */}
              <div className="grid grid-cols-2 gap-2 rounded-xl border bg-muted/30 p-3 text-xs">
                <div>
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    Wait Time
                  </span>
                  <div className="mt-0.5 font-mono text-base font-bold text-foreground">
                    {formatElapsed(waitSeconds)}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    Service Time
                  </span>
                  <div className="mt-0.5 font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">
                    {formatElapsed(serviceSeconds)}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="completeRemarks"
                  className="text-xs font-semibold"
                >
                  Completion Remarks / Resolution{" "}
                  <span className="font-normal text-muted-foreground">
                    (Optional)
                  </span>
                </Label>
                <Textarea
                  id="completeRemarks"
                  value={completeRemarks}
                  onChange={(e) => setCompleteRemarks(e.target.value)}
                  placeholder="e.g. Guarantee letter issued, assessment completed, slip released..."
                  rows={3}
                  className="text-xs"
                  autoFocus
                />
              </div>

              <DialogFooter className="gap-2 pt-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActionError(null)
                    setMode("status")
                  }}
                  disabled={completeMutation.isPending}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={completeMutation.isPending}
                  className="gap-2 bg-emerald-600 font-bold text-white hover:bg-emerald-700"
                >
                  {completeMutation.isPending && (
                    <Loader2 className="size-3.5 animate-spin" />
                  )}
                  Confirm Complete
                </Button>
              </DialogFooter>
            </form>
          </>
        )}

        {mode === "cancel" && (
          <>
            <DialogHeader>
              <div className="flex items-center justify-between pr-4">
                <DialogTitle className="flex items-center gap-2 text-base font-bold text-destructive">
                  <Ban className="size-5" />
                  Cancel Service Visit
                </DialogTitle>
                <Badge
                  variant="outline"
                  className="border-destructive/30 bg-destructive/10 px-2.5 py-0.5 text-xs font-bold text-destructive"
                >
                  Encounter #{currentVisit.hisTransactionId}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                Cancel visit for {patient.fullName}. Cancelled visits are
                excluded from turnaround time metrics.
              </DialogDescription>
            </DialogHeader>

            <form
              id="cancel-visit-form"
              onSubmit={handleCancelSubmit}
              className="space-y-4 pt-1"
            >
              {actionError && (
                <Alert variant="destructive" className="py-2 text-xs">
                  <AlertDescription>{actionError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="cancelReason" className="text-xs font-semibold">
                  Reason for Cancellation{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="cancelReason"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Patient had to leave, duplicate entry, medical emergency..."
                  rows={3}
                  required
                  className="text-xs"
                  autoFocus
                />
              </div>

              <DialogFooter className="gap-2 pt-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActionError(null)
                    setMode("status")
                  }}
                  disabled={cancelMutation.isPending}
                >
                  Keep Visit
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  size="sm"
                  disabled={cancelMutation.isPending || !cancelReason.trim()}
                  className="gap-2 font-bold"
                >
                  {cancelMutation.isPending && (
                    <Loader2 className="size-3.5 animate-spin" />
                  )}
                  Confirm Cancellation
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
