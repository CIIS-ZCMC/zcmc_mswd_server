import React, { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Ban,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck,
  Play,
  User,
  UserCheck,
  UserCog,
} from "lucide-react"
import { visitLockedBy } from "../lib/visit-lock"
import type { ServiceVisit } from "../types"

interface QueueCardProps {
  visit: ServiceVisit
  now: number
  canManage: boolean
  currentUserId?: number | null
  canOverride?: boolean
  canAddToDar?: boolean
  /** The visit the signed-in worker is serving; Start and Take Over wait for it to end. */
  myActiveVisit?: ServiceVisit | null
  onStart?: (visit: ServiceVisit) => void
  onComplete?: (visit: ServiceVisit) => void
  onCancel?: (visit: ServiceVisit) => void
  onTakeOver?: (visit: ServiceVisit) => void
  onAddToDar?: (visit: ServiceVisit) => void
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
  currentUserId,
  canOverride = false,
  canAddToDar = false,
  myActiveVisit = null,
  onStart,
  onComplete,
  onCancel,
  onTakeOver,
  onAddToDar,
  onViewEncounter,
}) => {
  const isWaiting = visit.status === "waiting"
  const isInProgress = visit.status === "in_progress"
  const isCompleted = visit.status === "completed"
  const lockedBy = visitLockedBy(visit, currentUserId)
  // One visit at a time: the server refuses a second Start or Take Over.
  const busyHint =
    myActiveVisit && myActiveVisit.id !== visit.id
      ? `Complete ${myActiveVisit.patient?.name ?? "your current patient"} first`
      : null
  // A DAR is its owner's, so only the worker who finished the visit can file it.
  const canFileDar =
    canAddToDar && isCompleted && visit.completedBy?.id === currentUserId

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
      className={`group relative gap-0 overflow-hidden border py-0 shadow-2xs transition-all duration-200 hover:shadow-xs ${
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
        className={`h-0.5 w-full ${
          isOverTarget
            ? "animate-pulse bg-destructive"
            : isWaiting
              ? "bg-amber-500"
              : isInProgress
                ? "bg-blue-500"
                : "bg-emerald-500"
        }`}
      />

      <CardContent className="space-y-2 p-2.5">
        {/* Header: Patient Info & Encounter No */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-0.5">
            <h5 className="line-clamp-1 text-xs leading-tight font-bold text-foreground sm:text-[13px]">
              {visit.patient?.name || `Patient #${visit.patientId}`}
            </h5>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] leading-none text-muted-foreground">
              <span>
                Hosp:{" "}
                <strong className="font-mono text-foreground">
                  {visit.patient?.hospital_id ?? "—"}
                </strong>
              </span>
              <span>•</span>
              <span className="font-semibold text-primary">
                #{visit.hisTransactionId}
              </span>
            </div>
          </div>

          <Badge
            variant="outline"
            className={`h-4.5 shrink-0 px-1.5 py-0 text-[9px] font-bold tracking-wider uppercase ${
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
          <p className="line-clamp-1 text-[11px] leading-tight text-muted-foreground">
            Purpose:{" "}
            <span className="font-medium text-foreground">{visit.purpose}</span>
          </p>
        )}

        {/* Compact Single-Line Timers & Compliance Block */}
        <div className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/20 px-2.5 py-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Clock className="size-3 shrink-0 text-primary" />
            <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              {isWaiting ? "Wait:" : isInProgress ? "Serving:" : "Total:"}
            </span>
            <span className="font-mono text-xs font-black text-foreground sm:text-sm">
              {isCompleted
                ? visit.totalMinutes !== null
                  ? `${visit.totalMinutes}m`
                  : "—"
                : formatElapsed(elapsedSeconds)}
            </span>
            {isCompleted && (
              <span className="text-[10px] text-muted-foreground">
                (W:{" "}
                <strong className="font-mono text-foreground">
                  {visit.waitingMinutes !== null
                    ? `${visit.waitingMinutes}m`
                    : "—"}
                </strong>{" "}
                · P:{" "}
                <strong className="font-mono text-foreground">
                  {visit.processingMinutes !== null
                    ? `${visit.processingMinutes}m`
                    : "—"}
                </strong>
                )
              </span>
            )}
          </div>

          {/* Target Compliance Chip */}
          {isOverTarget ? (
            <Badge
              variant="destructive"
              className="h-4.5 shrink-0 animate-pulse px-1.5 py-0 text-[9px] font-bold"
            >
              Over Target
            </Badge>
          ) : isWithinTarget ? (
            <Badge
              variant="outline"
              className="h-4.5 shrink-0 border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0 text-[9px] font-semibold text-emerald-700 dark:text-emerald-300"
            >
              Within Target
            </Badge>
          ) : null}
        </div>

        {/* Staff Attribution Footer */}
        <div className="flex items-center justify-between pt-0.5 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1 truncate">
            {isInProgress ? (
              <>
                <UserCheck className="size-3 shrink-0 text-blue-500" />
                <span className="truncate">
                  Serving:{" "}
                  <strong className="text-foreground">
                    {visit.servedBy?.name || "Worker"}
                  </strong>
                  {visit.takenOverBy && (
                    <span title={visit.takeoverReason ?? undefined}>
                      {" "}
                      (took over)
                    </span>
                  )}
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
        <div className="flex items-center justify-between gap-1 border-t border-border/40 pt-1.5">
          {onViewEncounter && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onViewEncounter(visit)}
              className="h-6 gap-1 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="size-3" />
              Encounter
            </Button>
          )}

          {canManage && (
            <div className="ml-auto flex items-center gap-1">
              {(isWaiting || (isInProgress && !lockedBy)) && onCancel && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onCancel(visit)}
                  className="h-6 gap-1 px-1.5 text-[10px] text-destructive hover:bg-destructive/10"
                >
                  <Ban className="size-3" />
                  Cancel
                </Button>
              )}

              {isWaiting && onStart && (
                <Button
                  size="sm"
                  onClick={() => onStart(visit)}
                  disabled={busyHint !== null}
                  title={busyHint ?? undefined}
                  className="h-6 gap-1 bg-blue-600 px-2 text-[10px] font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Play className="size-2.5" />
                  Start
                </Button>
              )}

              {isInProgress && !lockedBy && onComplete && (
                <Button
                  size="sm"
                  onClick={() => onComplete(visit)}
                  className="h-6 gap-1 bg-emerald-600 px-2 text-[10px] font-bold text-white hover:bg-emerald-700"
                >
                  <CheckCircle2 className="size-3" />
                  Complete
                </Button>
              )}

              {lockedBy && canOverride && onTakeOver && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onTakeOver(visit)}
                  disabled={busyHint !== null}
                  title={busyHint ?? undefined}
                  className="h-6 gap-1 px-2 text-[10px] font-bold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <UserCog className="size-3" />
                  Take Over
                </Button>
              )}

              {canFileDar &&
                (visit.darEntryId !== null ? (
                  <Badge
                    variant="outline"
                    className="h-5 gap-1 border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0 text-[9px] font-semibold text-emerald-700 dark:text-emerald-300"
                  >
                    <FileCheck className="size-2.5" />
                    In DAR
                  </Badge>
                ) : (
                  onAddToDar && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onAddToDar(visit)}
                      className="h-6 gap-1 px-2 text-[10px] font-bold"
                    >
                      <FileCheck className="size-3" />
                      Add to DAR
                    </Button>
                  )
                ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
