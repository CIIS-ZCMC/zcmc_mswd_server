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
import type { PatientRecord } from "../../types"
import type { ServiceVisit } from "@/features/queue"
import { Clock, ExternalLink, Hourglass, Play } from "lucide-react"
import { useNavigate } from "@/lib/inertia-router-hooks"

interface PatientActiveQueueStatusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  patient: PatientRecord
  activeVisit: ServiceVisit | null
}

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
  const [now, setNow] = useState<number>(() => Date.now())

  // SSR-safe live ticker
  useEffect(() => {
    if (!open) return
    setNow(Date.now())
    const interval = setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [open])

  if (!activeVisit) return null

  const isWaiting = activeVisit.status === "waiting"
  const isServing = activeVisit.status === "in_progress"

  const waitSeconds = isWaiting
    ? getElapsedSeconds(activeVisit.arrivedAt, now)
    : activeVisit.waitingMinutes != null
      ? activeVisit.waitingMinutes * 60
      : activeVisit.startedAt
        ? Math.max(
            0,
            Math.floor(
              (new Date(activeVisit.startedAt).getTime() -
                new Date(activeVisit.arrivedAt).getTime()) /
                1000
            )
          )
        : 0

  const serviceSeconds = isServing
    ? getElapsedSeconds(activeVisit.startedAt, now)
    : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full gap-4 p-6 sm:max-w-md">
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
            {patient.fullName} is currently tracked on today&apos;s Service Desk
            queue.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
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
                Arrived: {formatDateTime(activeVisit.arrivedAt)}
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
                  ? `Started: ${formatDateTime(activeVisit.startedAt)}`
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
                #{activeVisit.hisTransactionId}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-border/50 py-1">
              <span className="font-semibold text-muted-foreground">
                Purpose
              </span>
              <span className="max-w-[200px] truncate text-right font-semibold text-foreground">
                {activeVisit.purpose || "General Assistance"}
              </span>
            </div>

            {activeVisit.receivedBy && (
              <div className="flex items-center justify-between border-b border-border/50 py-1">
                <span className="font-semibold text-muted-foreground">
                  Received By
                </span>
                <span className="font-medium text-foreground">
                  {activeVisit.receivedBy.name}
                </span>
              </div>
            )}

            {activeVisit.servedBy && (
              <div className="flex items-center justify-between border-b border-border/50 py-1">
                <span className="font-semibold text-muted-foreground">
                  Handled By
                </span>
                <span className="font-bold text-primary">
                  {activeVisit.servedBy.name}
                </span>
              </div>
            )}

            {activeVisit.remarks && (
              <div className="pt-1">
                <span className="mb-0.5 block font-semibold text-muted-foreground">
                  Remarks
                </span>
                <p className="rounded bg-background p-2 text-muted-foreground italic">
                  &ldquo;{activeVisit.remarks}&rdquo;
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            type="button"
            size="sm"
            className="gap-2 font-bold"
            onClick={() => {
              onOpenChange(false)
              navigate("/queue")
            }}
          >
            <ExternalLink className="size-3.5" />
            Open Queue Board
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
