import React, { useEffect, useState } from "react"
import { router } from "@inertiajs/react"
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
import { Skeleton } from "@/components/ui/skeleton"
import { usePermission } from "@/features/auth/hooks/use-permission"
import { ApiError } from "@/lib/api-client"
import {
  Ban,
  Calendar,
  CheckCircle2,
  Hourglass,
  Loader2,
  Play,
  RefreshCw,
  Search,
  Timer,
} from "lucide-react"
import {
  useCancelVisit,
  useCompleteVisit,
  useQueue,
  useStartVisit,
} from "../hooks/use-queue"
import { QueueCard } from "./queue-card"
import type { ServiceVisit } from "../types"

function getTodayString(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export const QueueBoard: React.FC = () => {
  const canManage = usePermission("queue.manage")
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString)
  const [searchQuery, setSearchQuery] = useState("")

  const {
    data: queueData,
    isLoading,
    isFetching,
    refetch,
  } = useQueue(selectedDate)

  const startMutation = useStartVisit()
  const completeMutation = useCompleteVisit()
  const cancelMutation = useCancelVisit()

  // SSR-safe ticker
  const [now, setNow] = useState<number>(0)
  useEffect(() => {
    setNow(Date.now())
    const interval = setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Modals for actions
  const [activeVisit, setActiveVisit] = useState<ServiceVisit | null>(null)
  const [completeOpen, setCompleteOpen] = useState(false)
  const [completeRemarks, setCompleteRemarks] = useState("")

  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState("")

  const [actionError, setActionError] = useState<string | null>(null)

  const handleStart = async (visit: ServiceVisit) => {
    setActionError(null)
    try {
      await startMutation.mutateAsync(visit.id)
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to start service.")
    }
  }

  const handleOpenComplete = (visit: ServiceVisit) => {
    setActiveVisit(visit)
    setCompleteRemarks("")
    setActionError(null)
    setCompleteOpen(true)
  }

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeVisit) return
    setActionError(null)
    try {
      await completeMutation.mutateAsync({
        visitId: activeVisit.id,
        input: { remarks: completeRemarks.trim() || undefined },
      })
      setCompleteOpen(false)
      setActiveVisit(null)
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "Failed to complete visit."
      )
    }
  }

  const handleOpenCancel = (visit: ServiceVisit) => {
    setActiveVisit(visit)
    setCancelReason("")
    setActionError(null)
    setCancelOpen(true)
  }

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeVisit) return
    if (!cancelReason.trim()) {
      setActionError("Please provide a reason for cancellation.")
      return
    }
    setActionError(null)
    try {
      await cancelMutation.mutateAsync({
        visitId: activeVisit.id,
        input: { cancelReason: cancelReason.trim() },
      })
      setCancelOpen(false)
      setActiveVisit(null)
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "Failed to cancel visit."
      )
    }
  }

  const handleViewEncounter = (visit: ServiceVisit) => {
    // Navigate to patient with the encounter selected
    router.visit(
      `/patients/${visit.patientId}?encounter=${visit.hisTransactionId}`
    )
  }

  // Filter lists based on search
  const filterVisits = (list: ServiceVisit[]) => {
    if (!searchQuery.trim()) return list
    const q = searchQuery.toLowerCase()
    return list.filter(
      (v) =>
        v.patient?.name?.toLowerCase().includes(q) ||
        String(v.hisTransactionId).includes(q) ||
        v.patient?.hospital_no?.toLowerCase().includes(q) ||
        v.purpose?.toLowerCase().includes(q)
    )
  }

  const waitingList = filterVisits(queueData?.waiting || [])
  const inProgressList = filterVisits(queueData?.inProgress || [])
  const completedList = filterVisits(queueData?.completed || [])

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Top Header Bar */}
      <div className="border-b border-border/80 bg-card/70 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-xs">
              <Timer className="size-6" />
            </div>
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
                Service Desk Queue Board
              </h1>
              <p className="text-xs text-muted-foreground">
                Real-time queue monitoring, patient tracking, and turnaround
                time benchmarks.
              </p>
            </div>
          </div>

          {/* Controls: Date Picker, Search & Refresh */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative w-48">
              <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search patient, encounter..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 bg-background pl-8 text-xs"
              />
            </div>

            <div className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-background px-2.5 py-1">
              <Calendar className="size-3.5 text-muted-foreground" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) =>
                  setSelectedDate(e.target.value || getTodayString())
                }
                className="bg-transparent text-xs font-semibold text-foreground focus:outline-none"
              />
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-9 gap-1.5 text-xs font-semibold"
            >
              <RefreshCw
                className={`size-3.5 ${isFetching ? "animate-spin text-primary" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* Summary Metric Counters */}
        <div className="grid grid-cols-3 gap-3 pt-4">
          <div className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Hourglass className="size-4 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                Waiting in Queue
              </span>
            </div>
            <span className="font-mono text-xl font-black text-amber-700 dark:text-amber-300">
              {queueData?.summary.waiting ?? 0}
            </span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Play className="size-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                In Progress
              </span>
            </div>
            <span className="font-mono text-xl font-black text-blue-700 dark:text-blue-300">
              {queueData?.summary.inProgress ?? 0}
            </span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                Served Today
              </span>
            </div>
            <span className="font-mono text-xl font-black text-emerald-700 dark:text-emerald-300">
              {queueData?.summary.completed ?? 0}
            </span>
          </div>
        </div>
      </div>

      {/* 3 Columns Queue Grid */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="grid h-full min-w-[900px] grid-cols-1 gap-5 md:grid-cols-3">
          {/* Column 1: Waiting */}
          <div className="flex flex-col overflow-hidden rounded-xl border border-border/80 bg-muted/20 shadow-2xs">
            <div className="flex items-center justify-between border-b border-border/80 bg-amber-500/10 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-bold text-amber-800 dark:text-amber-200">
                <Hourglass className="size-4 text-amber-600 dark:text-amber-400" />
                <span>Waiting</span>
              </div>
              <Badge
                variant="secondary"
                className="font-mono text-xs font-bold"
              >
                {waitingList.length}
              </Badge>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-3.5">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-xl" />
                ))
              ) : waitingList.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center p-4 text-center text-xs text-muted-foreground">
                  <Hourglass className="mb-2 size-8 text-muted-foreground/40" />
                  <p className="font-medium">No patients waiting in queue.</p>
                </div>
              ) : (
                waitingList.map((visit) => (
                  <QueueCard
                    key={visit.id}
                    visit={visit}
                    now={now}
                    canManage={canManage}
                    onStart={handleStart}
                    onCancel={handleOpenCancel}
                    onViewEncounter={handleViewEncounter}
                  />
                ))
              )}
            </div>
          </div>

          {/* Column 2: In Progress */}
          <div className="flex flex-col overflow-hidden rounded-xl border border-border/80 bg-muted/20 shadow-2xs">
            <div className="flex items-center justify-between border-b border-border/80 bg-blue-500/10 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-bold text-blue-800 dark:text-blue-200">
                <Play className="size-4 text-blue-600 dark:text-blue-400" />
                <span>In Progress</span>
              </div>
              <Badge
                variant="secondary"
                className="font-mono text-xs font-bold"
              >
                {inProgressList.length}
              </Badge>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-3.5">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-xl" />
                ))
              ) : inProgressList.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center p-4 text-center text-xs text-muted-foreground">
                  <Play className="mb-2 size-8 text-muted-foreground/40" />
                  <p className="font-medium">
                    No service visits currently in progress.
                  </p>
                </div>
              ) : (
                inProgressList.map((visit) => (
                  <QueueCard
                    key={visit.id}
                    visit={visit}
                    now={now}
                    canManage={canManage}
                    onComplete={handleOpenComplete}
                    onCancel={handleOpenCancel}
                    onViewEncounter={handleViewEncounter}
                  />
                ))
              )}
            </div>
          </div>

          {/* Column 3: Served Today */}
          <div className="flex flex-col overflow-hidden rounded-xl border border-border/80 bg-muted/20 shadow-2xs">
            <div className="flex items-center justify-between border-b border-border/80 bg-emerald-500/10 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-800 dark:text-emerald-200">
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                <span>Served Today</span>
              </div>
              <Badge
                variant="secondary"
                className="font-mono text-xs font-bold"
              >
                {completedList.length}
              </Badge>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-3.5">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-xl" />
                ))
              ) : completedList.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center p-4 text-center text-xs text-muted-foreground">
                  <CheckCircle2 className="mb-2 size-8 text-muted-foreground/40" />
                  <p className="font-medium">
                    No completed visits recorded for {selectedDate}.
                  </p>
                </div>
              ) : (
                completedList.map((visit) => (
                  <QueueCard
                    key={visit.id}
                    visit={visit}
                    now={now}
                    canManage={canManage}
                    onViewEncounter={handleViewEncounter}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Complete Service */}
      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-emerald-600">
              <CheckCircle2 className="size-5" />
              Complete Service Visit
            </DialogTitle>
            <DialogDescription className="text-xs">
              Conclude service for {activeVisit?.patient?.name || "Patient"}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCompleteSubmit} className="space-y-4 pt-1">
            {actionError && (
              <Alert variant="destructive" className="py-2 text-xs">
                <AlertDescription>{actionError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="remarks" className="text-xs font-semibold">
                Completion Remarks (Optional)
              </Label>
              <Textarea
                id="remarks"
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
                Confirm Complete
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Cancel Visit */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-destructive">
              <Ban className="size-5" />
              Cancel Service Visit
            </DialogTitle>
            <DialogDescription className="text-xs">
              Cancel visit for {activeVisit?.patient?.name || "Patient"}.
              Cancelled visits are excluded from TAT calculations.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCancelSubmit} className="space-y-4 pt-1">
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
