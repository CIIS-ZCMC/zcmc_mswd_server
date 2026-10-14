import React, { useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { usePermission } from "@/features/auth/hooks/use-permission"
import { ApiError } from "@/lib/api-client"
import {
  Ban,
  CheckCircle2,
  Clock,
  Hourglass,
  Loader2,
  LogIn,
  Play,
  Timer,
} from "lucide-react"
import {
  useCancelVisit,
  useCompleteVisit,
  usePatientVisits,
  useStartVisit,
  useTimeInVisit,
} from "../hooks/use-queue"

interface ServiceVisitPanelProps {
  patientId: number | string
  transactionId: number
}

function formatElapsed(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}m ${secs < 10 ? "0" : ""}${secs}s`
}

function getElapsedSeconds(fromIso: string): number {
  const fromMs = new Date(fromIso).getTime()
  const nowMs = Date.now()
  return Math.max(0, Math.floor((nowMs - fromMs) / 1000))
}

export const ServiceVisitPanel: React.FC<ServiceVisitPanelProps> = ({
  patientId,
  transactionId,
}) => {
  const canManage = usePermission("queue.manage")
  const { data: visits = [], isLoading } = usePatientVisits(
    patientId,
    transactionId,
    canManage
  )

  const timeInMutation = useTimeInVisit()
  const startMutation = useStartVisit()
  const completeMutation = useCompleteVisit()
  const cancelMutation = useCancelVisit()

  // SSR-safe live ticker
  const [now, setNow] = useState<number>(0)
  useEffect(() => {
    setNow(Date.now())
    const interval = setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Dialog states
  const [timeInOpen, setTimeInOpen] = useState(false)
  const [purpose, setPurpose] = useState("Guarantee letter / Assistance")
  const [remarks, setRemarks] = useState("")

  const [completeOpen, setCompleteOpen] = useState(false)
  const [completeRemarks, setCompleteRemarks] = useState("")

  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState("")

  const [dialogError, setDialogError] = useState<string | null>(null)

  // Find active open visit (waiting or in_progress)
  const openVisit = useMemo(
    () =>
      visits.find(
        (v) => v.status === "waiting" || v.status === "in_progress"
      ) ?? null,
    [visits]
  )

  const handleTimeInSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setDialogError(null)
    try {
      await timeInMutation.mutateAsync({
        patientId,
        input: {
          hisTransactionId: transactionId,
          purpose: purpose.trim() || undefined,
          remarks: remarks.trim() || undefined,
        },
      })
      setTimeInOpen(false)
      setPurpose("Guarantee letter / Assistance")
      setRemarks("")
    } catch (err) {
      setDialogError(
        err instanceof ApiError ? err.message : "Failed to time in patient."
      )
    }
  }

  const handleStartSubmit = async () => {
    if (!openVisit) return
    setDialogError(null)
    try {
      await startMutation.mutateAsync(openVisit.id)
    } catch (err) {
      setDialogError(
        err instanceof ApiError ? err.message : "Failed to start service."
      )
    }
  }

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!openVisit) return
    setDialogError(null)
    try {
      await completeMutation.mutateAsync({
        visitId: openVisit.id,
        input: {
          remarks: completeRemarks.trim() || undefined,
        },
      })
      setCompleteOpen(false)
      setCompleteRemarks("")
    } catch (err) {
      setDialogError(
        err instanceof ApiError ? err.message : "Failed to complete visit."
      )
    }
  }

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!openVisit) return
    if (!cancelReason.trim()) {
      setDialogError("Please provide a reason for cancellation.")
      return
    }
    setDialogError(null)
    try {
      await cancelMutation.mutateAsync({
        visitId: openVisit.id,
        input: {
          cancelReason: cancelReason.trim(),
        },
      })
      setCancelOpen(false)
      setCancelReason("")
    } catch (err) {
      setDialogError(
        err instanceof ApiError ? err.message : "Failed to cancel visit."
      )
    }
  }

  // Elapsed computation for the open visit
  const openElapsedSeconds = useMemo(() => {
    if (!openVisit || !now) return 0
    if (openVisit.status === "waiting") {
      return getElapsedSeconds(openVisit.arrivedAt)
    }
    if (openVisit.status === "in_progress" && openVisit.startedAt) {
      return getElapsedSeconds(openVisit.startedAt)
    }
    return 0
  }, [openVisit, now])

  // Every service-visit endpoint needs queue.manage; without it there is nothing to show.
  if (!canManage) return null

  return (
    <div className="space-y-4">
      {/* Top Banner / Card */}
      <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              <Timer className="size-4.5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">
                Service Visit & Turnaround Time
              </h4>
              <p className="text-xs text-muted-foreground">
                MSWD service desk queue, elapsed timings, and Citizen&apos;s
                Charter compliance.
              </p>
            </div>
          </div>

          {canManage && !openVisit && (
            <Button
              size="sm"
              onClick={() => {
                setDialogError(null)
                setTimeInOpen(true)
              }}
              className="h-8 gap-1.5 text-xs font-bold shadow-xs"
            >
              <LogIn className="size-3.5" />
              Time In Patient
            </Button>
          )}
        </div>

        {/* Active Open Visit Card */}
        {openVisit ? (
          <div
            className={`mt-4 rounded-xl border p-4 transition-all ${
              openVisit.status === "waiting"
                ? openVisit.withinTarget.waiting === false
                  ? "border-destructive/40 bg-destructive/5"
                  : "border-amber-500/40 bg-amber-500/5"
                : openVisit.withinTarget.processing === false
                  ? "border-destructive/40 bg-destructive/5"
                  : "border-blue-500/40 bg-blue-500/5"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    className={
                      openVisit.status === "waiting"
                        ? "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300"
                        : "border-blue-500/30 bg-blue-500/15 text-blue-700 dark:text-blue-300"
                    }
                  >
                    {openVisit.status === "waiting" ? (
                      <span className="flex items-center gap-1.5 font-bold">
                        <Hourglass className="size-3 animate-pulse" /> Waiting
                        in Queue
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 font-bold">
                        <Play className="size-3 animate-pulse" /> Serving in
                        Progress
                      </span>
                    )}
                  </Badge>

                  {/* Over Target Indicator */}
                  {((openVisit.status === "waiting" &&
                    openVisit.withinTarget.waiting === false) ||
                    (openVisit.status === "in_progress" &&
                      openVisit.withinTarget.processing === false)) && (
                    <Badge
                      variant="destructive"
                      className="animate-pulse text-[11px] font-bold"
                    >
                      Over Target Threshold
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                  <span>
                    Arrived at:{" "}
                    <strong className="text-foreground">
                      {new Date(openVisit.arrivedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </strong>
                  </span>
                  {openVisit.receivedBy && (
                    <>
                      <span>•</span>
                      <span>
                        Received by:{" "}
                        <strong className="text-foreground">
                          {openVisit.receivedBy.name}
                        </strong>
                      </span>
                    </>
                  )}
                  {openVisit.servedBy && (
                    <>
                      <span>•</span>
                      <span>
                        Serving worker:{" "}
                        <strong className="text-foreground">
                          {openVisit.servedBy.name}
                        </strong>
                      </span>
                    </>
                  )}
                </div>

                {openVisit.purpose && (
                  <p className="text-xs text-muted-foreground">
                    Purpose:{" "}
                    <span className="font-semibold text-foreground">
                      {openVisit.purpose}
                    </span>
                  </p>
                )}
              </div>

              {/* Live Timer Display */}
              <div className="text-right">
                <div className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                  {openVisit.status === "waiting"
                    ? "Waiting Elapsed"
                    : "Service Elapsed"}
                </div>
                <div className="flex items-center justify-end gap-1.5 font-mono text-xl font-black text-foreground sm:text-2xl">
                  <Clock className="size-5 animate-pulse text-primary" />
                  {formatElapsed(openElapsedSeconds)}
                </div>
              </div>
            </div>

            {/* Quick Actions for Open Visit */}
            {canManage && (
              <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-border/60 pt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDialogError(null)
                    setCancelReason("")
                    setCancelOpen(true)
                  }}
                  className="h-8 gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Ban className="size-3.5" />
                  Cancel Visit
                </Button>

                {openVisit.status === "waiting" && (
                  <Button
                    size="sm"
                    onClick={handleStartSubmit}
                    disabled={startMutation.isPending}
                    className="h-8 gap-1.5 bg-blue-600 text-xs font-bold text-white hover:bg-blue-700"
                  >
                    {startMutation.isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Play className="size-3.5" />
                    )}
                    Start Service
                  </Button>
                )}

                {openVisit.status === "in_progress" && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setDialogError(null)
                      setCompleteRemarks("")
                      setCompleteOpen(true)
                    }}
                    className="h-8 gap-1.5 bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="size-3.5" />
                    Complete Service
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="py-4 text-center text-xs text-muted-foreground">
            No active open visit in queue for this encounter.
          </div>
        )}
      </div>

      {/* Past Visits History Table */}
      <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-2xs">
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-4 py-2.5">
          <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
            Encounter Visit History ({visits.length})
          </span>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="border-border/60">
              <TableHead className="text-xs">Time In</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-center text-xs">Waiting</TableHead>
              <TableHead className="text-center text-xs">Processing</TableHead>
              <TableHead className="text-center text-xs">Total TAT</TableHead>
              <TableHead className="text-xs">Served By</TableHead>
              <TableHead className="text-xs">Remarks / Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="mx-auto h-5 w-12" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="mx-auto h-5 w-12" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="mx-auto h-5 w-12" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                </TableRow>
              ))
            ) : visits.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-6 text-center text-xs text-muted-foreground"
                >
                  No visits recorded for this encounter yet.
                </TableCell>
              </TableRow>
            ) : (
              visits.map((visit) => (
                <TableRow key={visit.id} className="text-xs hover:bg-muted/20">
                  <TableCell className="font-semibold text-foreground">
                    {new Date(visit.arrivedAt).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[11px] font-bold ${
                        visit.status === "completed"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          : visit.status === "cancelled"
                            ? "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-400"
                            : visit.status === "in_progress"
                              ? "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                              : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                      }`}
                    >
                      {visit.status.replace("_", " ")}
                    </Badge>
                  </TableCell>

                  {/* Waiting Minutes */}
                  <TableCell className="text-center font-mono">
                    {visit.waitingMinutes !== null ? (
                      <span
                        className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                          visit.withinTarget.waiting === true
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            : visit.withinTarget.waiting === false
                              ? "bg-destructive/15 font-bold text-destructive"
                              : "text-muted-foreground"
                        }`}
                      >
                        {visit.waitingMinutes}m
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>

                  {/* Processing Minutes */}
                  <TableCell className="text-center font-mono">
                    {visit.processingMinutes !== null ? (
                      <span
                        className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                          visit.withinTarget.processing === true
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            : visit.withinTarget.processing === false
                              ? "bg-destructive/15 font-bold text-destructive"
                              : "text-muted-foreground"
                        }`}
                      >
                        {visit.processingMinutes}m
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>

                  {/* Total Minutes */}
                  <TableCell className="text-center font-mono">
                    {visit.totalMinutes !== null ? (
                      <span
                        className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-bold ${
                          visit.withinTarget.total === true
                            ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                            : visit.withinTarget.total === false
                              ? "bg-destructive/20 text-destructive"
                              : "text-muted-foreground"
                        }`}
                      >
                        {visit.totalMinutes}m
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>

                  <TableCell className="text-foreground">
                    {visit.servedBy?.name || visit.receivedBy?.name || "—"}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">
                    {visit.status === "cancelled"
                      ? `Cancelled: ${visit.cancelReason || "No reason given"}`
                      : visit.remarks || visit.purpose || "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog: Time In */}
      <Dialog open={timeInOpen} onOpenChange={setTimeInOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <LogIn className="size-4.5 text-primary" />
              Time In Patient for Encounter #{transactionId}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Record patient or watcher arrival at MSWD. Starts the waiting
              timer stamped with the server clock.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleTimeInSubmit} className="space-y-4 pt-1">
            {dialogError && (
              <Alert variant="destructive" className="py-2 text-xs">
                <AlertDescription>{dialogError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="purpose" className="text-xs font-semibold">
                Purpose of Visit
              </Label>
              <Input
                id="purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="e.g. Guarantee letter, Assessment, Counseling"
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="remarks" className="text-xs font-semibold">
                Initial Remarks (Optional)
              </Label>
              <Textarea
                id="remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Watcher details, desk notes..."
                rows={2}
                className="text-xs"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTimeInOpen(false)}
                disabled={timeInMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={timeInMutation.isPending}
                className="gap-2 font-bold"
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

      {/* Dialog: Complete Service */}
      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <CheckCircle2 className="size-4.5 text-emerald-600" />
              Complete Service Visit
            </DialogTitle>
            <DialogDescription className="text-xs">
              Conclude the visit and freeze turnaround durations stamped with
              the server clock.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCompleteSubmit} className="space-y-4 pt-1">
            {dialogError && (
              <Alert variant="destructive" className="py-2 text-xs">
                <AlertDescription>{dialogError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label
                htmlFor="completeRemarks"
                className="text-xs font-semibold"
              >
                Completion Remarks (Optional)
              </Label>
              <Textarea
                id="completeRemarks"
                value={completeRemarks}
                onChange={(e) => setCompleteRemarks(e.target.value)}
                placeholder="Slip released, GL approved, assessment signed..."
                rows={2}
                className="text-xs"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCompleteOpen(false)}
                disabled={completeMutation.isPending}
              >
                Cancel
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
                Complete Service
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Cancel Visit */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-destructive">
              <Ban className="size-4.5" />
              Cancel Service Visit
            </DialogTitle>
            <DialogDescription className="text-xs">
              Cancel the current visit. A cancellation reason is required.
              Cancelled visits are excluded from turnaround time figures.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCancelSubmit} className="space-y-4 pt-1">
            {dialogError && (
              <Alert variant="destructive" className="py-2 text-xs">
                <AlertDescription>{dialogError}</AlertDescription>
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
                placeholder="Patient had to leave, duplicate entry, medical emergency..."
                rows={3}
                required
                className="text-xs"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCancelOpen(false)}
                disabled={cancelMutation.isPending}
              >
                Keep Visit
              </Button>
              <Button
                type="submit"
                variant="destructive"
                size="sm"
                disabled={cancelMutation.isPending}
                className="gap-2 font-bold"
              >
                {cancelMutation.isPending && (
                  <Loader2 className="size-3.5 animate-spin" />
                )}
                Confirm Cancellation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
