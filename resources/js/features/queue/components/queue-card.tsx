import React, { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Ban,
  CheckCircle2,
  Clock,
  ExternalLink,
  Play,
  User,
  UserCheck,
} from "lucide-react"
import type { ServiceVisit } from "../types"

interface QueueCardProps {
  visit: ServiceVisit
  now: number
  canManage: boolean
  onStart?: (visit: ServiceVisit) => void
  onComplete?: (visit: ServiceVisit) => void
  onCancel?: (visit: ServiceVisit) => void
  onViewEncounter?: (visit: ServiceVisit) => void
}

function formatElapsed(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}m ${secs < 10 ? "0" : ""}${secs}s`
}

function getElapsedSeconds(fromIso: string, nowMs: number): number {
  if (!nowMs) return 0
  const fromMs = new Date(fromIso).getTime()
  return Math.max(0, Math.floor((nowMs - fromMs) / 1000))
}

export const QueueCard: React.FC<QueueCardProps> = ({
  visit,
  now,
  canManage,
  onStart,
  onComplete,
  onCancel,
  onViewEncounter,
}) => {
  const isWaiting = visit.status === "waiting"
  const isInProgress = visit.status === "in_progress"
  const isCompleted = visit.status === "completed"

  // Live seconds calculation
  const elapsedSeconds = useMemo(() => {
    if (isWaiting) {
      return getElapsedSeconds(visit.arrivedAt, now)
    }
    if (isInProgress && visit.startedAt) {
      return getElapsedSeconds(visit.startedAt, now)
    }
    return 0
  }, [isWaiting, isInProgress, visit.arrivedAt, visit.startedAt, now])

  // Is this visit currently over target?
  const isOverTarget =
    (isWaiting && visit.withinTarget.waiting === false) ||
    (isInProgress && visit.withinTarget.processing === false) ||
    (isCompleted && visit.withinTarget.total === false)

  const isWithinTarget =
    (isWaiting && visit.withinTarget.waiting === true) ||
    (isInProgress && visit.withinTarget.processing === true) ||
    (isCompleted && visit.withinTarget.total === true)

  return (
    <Card
      className={`group relative overflow-hidden border shadow-2xs transition-all duration-200 hover:shadow-xs ${
        isOverTarget
          ? "border-destructive/50 bg-destructive/5 dark:bg-destructive/10"
          : isWaiting
            ? "border-amber-500/30 bg-card hover:border-amber-500/50"
            : isInProgress
              ? "border-blue-500/40 bg-card hover:border-blue-500/60"
              : "border-border/80 bg-card hover:border-emerald-500/40"
      }`}
    >
      {/* Top Accent Strip */}
      <div
        className={`h-1 w-full ${
          isOverTarget
            ? "animate-pulse bg-destructive"
            : isWaiting
              ? "bg-amber-500"
              : isInProgress
                ? "bg-blue-500"
                : "bg-emerald-500"
        }`}
      />

      <CardContent className="space-y-3 p-3.5">
        {/* Header: Patient Info & Encounter No */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <h5 className="line-clamp-1 text-sm leading-snug font-bold text-foreground">
              {visit.patient?.name || `Patient #${visit.patientId}`}
            </h5>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <span>
                Hospital No:{" "}
                <strong className="font-mono text-foreground">
                  {visit.patient?.hospitalNo ||
                    visit.patient?.hospital_no ||
                    "—"}
                </strong>
              </span>
              <span>•</span>
              <span className="font-semibold text-primary">
                Encounter #{visit.hisTransactionId}
              </span>
            </div>
          </div>

          <Badge
            variant="outline"
            className={`shrink-0 text-[10px] font-bold tracking-wider uppercase ${
              isWaiting
                ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                : isInProgress
                  ? "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            }`}
          >
            {visit.status.replace("_", " ")}
          </Badge>
        </div>

        {/* Purpose / Remarks */}
        {visit.purpose && (
          <p className="line-clamp-1 text-xs text-muted-foreground">
            Purpose:{" "}
            <span className="font-medium text-foreground">{visit.purpose}</span>
          </p>
        )}

        {/* Timers & Compliance Block */}
        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              {isWaiting
                ? "Waiting Elapsed"
                : isInProgress
                  ? "Serving Elapsed"
                  : "Total Turnaround"}
            </span>

            <div className="flex items-center gap-1.5 font-mono text-base font-black text-foreground">
              <Clock className="size-3.5 text-primary" />
              {isCompleted ? (
                <span>
                  {visit.totalMinutes !== null ? `${visit.totalMinutes}m` : "—"}
                </span>
              ) : (
                <span>{formatElapsed(elapsedSeconds)}</span>
              )}
            </div>
          </div>

          {/* Target Compliance Chip */}
          <div>
            {isOverTarget ? (
              <Badge
                variant="destructive"
                className="animate-pulse gap-1 text-[10px] font-bold"
              >
                Over Target
              </Badge>
            ) : isWithinTarget ? (
              <Badge
                variant="outline"
                className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300"
              >
                Within Target
              </Badge>
            ) : null}
          </div>
        </div>

        {/* Additional Duration Stats for Completed */}
        {isCompleted && (
          <div className="grid grid-cols-2 gap-2 pt-0.5 text-[11px]">
            <div className="rounded border border-border/60 bg-muted/10 p-1.5 text-center">
              <span className="block text-[10px] text-muted-foreground">
                Waiting
              </span>
              <span className="font-mono font-bold text-foreground">
                {visit.waitingMinutes !== null
                  ? `${visit.waitingMinutes}m`
                  : "—"}
              </span>
            </div>
            <div className="rounded border border-border/60 bg-muted/10 p-1.5 text-center">
              <span className="block text-[10px] text-muted-foreground">
                Processing
              </span>
              <span className="font-mono font-bold text-foreground">
                {visit.processingMinutes !== null
                  ? `${visit.processingMinutes}m`
                  : "—"}
              </span>
            </div>
          </div>
        )}

        {/* Staff Attribution Footer */}
        <div className="flex items-center justify-between border-t border-border/50 pt-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5 truncate">
            {isInProgress ? (
              <>
                <UserCheck className="size-3 shrink-0 text-blue-500" />
                <span className="truncate">
                  Serving:{" "}
                  <strong className="text-foreground">
                    {visit.servedBy?.name || "Worker"}
                  </strong>
                </span>
              </>
            ) : isCompleted ? (
              <>
                <CheckCircle2 className="size-3 shrink-0 text-emerald-500" />
                <span className="truncate">
                  Served by:{" "}
                  <strong className="text-foreground">
                    {visit.servedBy?.name ||
                      visit.completedBy?.name ||
                      "Worker"}
                  </strong>
                </span>
              </>
            ) : (
              <>
                <User className="size-3 shrink-0 text-muted-foreground" />
                <span className="truncate">
                  Received by:{" "}
                  <strong className="text-foreground">
                    {visit.receivedBy?.name || "Desk"}
                  </strong>
                </span>
              </>
            )}
          </div>

          <span className="shrink-0 font-mono text-[10px]">
            {new Date(visit.arrivedAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        {/* Interactive Action Buttons */}
        <div className="flex items-center justify-between gap-1.5 border-t border-border/40 pt-1">
          {onViewEncounter && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onViewEncounter(visit)}
              className="h-7 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="size-3" />
              Encounter
            </Button>
          )}

          {canManage && (
            <div className="ml-auto flex items-center gap-1.5">
              {(isWaiting || isInProgress) && onCancel && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onCancel(visit)}
                  className="h-7 gap-1 px-2 text-[11px] text-destructive hover:bg-destructive/10"
                >
                  <Ban className="size-3" />
                  Cancel
                </Button>
              )}

              {isWaiting && onStart && (
                <Button
                  size="sm"
                  onClick={() => onStart(visit)}
                  className="h-7 gap-1 bg-blue-600 px-2.5 text-[11px] font-bold text-white hover:bg-blue-700"
                >
                  <Play className="size-3" />
                  Start
                </Button>
              )}

              {isInProgress && onComplete && (
                <Button
                  size="sm"
                  onClick={() => onComplete(visit)}
                  className="h-7 gap-1 bg-emerald-600 px-2.5 text-[11px] font-bold text-white hover:bg-emerald-700"
                >
                  <CheckCircle2 className="size-3" />
                  Complete
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
