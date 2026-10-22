import React, { createContext, useContext, useMemo } from "react"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { usePatientVisits } from "./use-queue"
import type { ServiceVisit } from "../types"
import { Clock } from "lucide-react"

export type QueueActionState = "waiting" | "in_progress" | "completed" | "none"

export interface QueueActionGateContextValue {
  /**
   * Whether the user can perform write/edit/print actions right now.
   * True if user is exempt (Admin / MSS Head) OR active visit is "in_progress".
   */
  canPerformActions: boolean

  /** Current queue status */
  queueStatus: QueueActionState

  /** The active visit (waiting or in_progress), if any */
  activeVisit: ServiceVisit | null

  /** The latest completed visit, if any */
  latestCompletedVisit: ServiceVisit | null

  /** Human-readable explanation of current permission/lock state */
  reason: string

  /** Whether the user is bypassing via Super Admin / MSS Head role */
  isExempt: boolean

  /** Whether visit queries are currently loading */
  isLoading: boolean

  /** Helper to apply standard disabled and title props to buttons */
  getActionProps: (actionName?: string) => {
    disabled: boolean
    title?: string
    "data-queue-locked"?: boolean
  }
}

const QueueActionGateContext = createContext<QueueActionGateContextValue | null>(
  null
)

export interface QueueActionGateProviderProps {
  patientId?: number | string | null
  transactionId?: number | null
  children: React.ReactNode
}

export const QueueActionGateProvider: React.FC<QueueActionGateProviderProps> = ({
  patientId,
  transactionId,
  children,
}) => {
  const { roles, user } = useAuth()
  const userRoles = roles ?? user?.roles ?? []
  const isExempt =
    userRoles.includes("Super Admin") ||
    userRoles.includes("MSS Head") ||
    userRoles.includes("Admin")

  const { data: visits = [], isLoading } = usePatientVisits(
    patientId,
    transactionId,
    Boolean(patientId)
  )

  const activeVisit = useMemo(
    () =>
      visits.find((v) => v.status === "waiting" || v.status === "in_progress") ??
      null,
    [visits]
  )

  const latestCompletedVisit = useMemo(
    () => visits.find((v) => v.status === "completed") ?? null,
    [visits]
  )

  const queueStatus: QueueActionState = useMemo(() => {
    if (activeVisit) {
      return activeVisit.status as QueueActionState // "waiting" | "in_progress"
    }
    if (latestCompletedVisit) {
      return "completed"
    }
    return "none"
  }, [activeVisit, latestCompletedVisit])

  const canPerformActions = isExempt || queueStatus === "in_progress"

  const reason = useMemo(() => {
    if (isExempt && queueStatus !== "in_progress") {
      return "Administrator override: Actions allowed without active queue session."
    }
    switch (queueStatus) {
      case "in_progress":
        return "Service in progress. Actions and printing are enabled."
      case "waiting":
        return "Patient is waiting in queue. Start service in Queue & TAT to enable editing and printing."
      case "completed":
        return "Service completed for this visit. Records are in view-only mode."
      case "none":
      default:
        return "Service must be in progress to perform this action. Queue the patient to begin."
    }
  }, [isExempt, queueStatus])

  const getActionProps = (actionName?: string) => {
    if (canPerformActions) {
      return { disabled: false }
    }
    const label = actionName ? `Cannot ${actionName}: ` : ""
    return {
      disabled: true,
      title: `${label}${reason}`,
      "data-queue-locked": true,
    }
  }

  const value: QueueActionGateContextValue = {
    canPerformActions,
    queueStatus,
    activeVisit,
    latestCompletedVisit,
    reason,
    isExempt,
    isLoading,
    getActionProps,
  }

  return (
    <QueueActionGateContext.Provider value={value}>
      {children}
    </QueueActionGateContext.Provider>
  )
}

export function useQueueActionGate(): QueueActionGateContextValue {
  const context = useContext(QueueActionGateContext)
  if (context) {
    return context
  }
  return {
    canPerformActions: true,
    queueStatus: "in_progress",
    activeVisit: null,
    latestCompletedVisit: null,
    reason: "",
    isExempt: false,
    isLoading: false,
    getActionProps: () => ({ disabled: false }),
  }
}

export interface QueueStatusBannerProps {
  className?: string
  onNavigateToQueue?: () => void
  onQueuePatient?: () => void
}

export const QueueStatusBanner: React.FC<QueueStatusBannerProps> = ({
  className = "",
  onNavigateToQueue,
  onQueuePatient,
}) => {
  const { queueStatus, isExempt } = useQueueActionGate()

  if (queueStatus === "in_progress") {
    return (
      <div
        className={`flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-900 dark:text-emerald-200 ${className}`}
      >
        <div className="flex items-center gap-2">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
          </span>
          <div>
            <strong className="font-bold">Service In Progress:</strong>{" "}
            Turnaround timer is running. Editing, record creation, and document
            printing are enabled.
          </div>
        </div>
        {isExempt && (
          <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
            Admin
          </span>
        )}
      </div>
    )
  }

  if (queueStatus === "waiting") {
    return (
      <div
        className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-900 dark:text-amber-200 ${className}`}
      >
        <div className="flex items-center gap-2">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-amber-500" />
          </span>
          <div>
            <strong className="font-bold">Patient In Queue (Waiting):</strong>{" "}
            Action buttons (Add, Edit, Delete, Print) are disabled until service
            begins.
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isExempt && (
            <span
              className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300"
              title="Administrator override active"
            >
              Admin Override
            </span>
          )}
          {onNavigateToQueue && (
            <button
              type="button"
              onClick={onNavigateToQueue}
              className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-amber-600/30 bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-900 hover:bg-amber-500/30 dark:text-amber-100"
            >
              Start Service in Queue & TAT &rarr;
            </button>
          )}
        </div>
      </div>
    )
  }

  if (queueStatus === "completed") {
    return (
      <div
        className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border border-muted-foreground/20 bg-muted/40 px-3.5 py-2 text-xs text-muted-foreground ${className}`}
      >
        <div className="flex items-center gap-2">
          <Clock className="size-3.5 text-muted-foreground" />
          <div>
            <strong className="font-semibold text-foreground">
              Service Completed:
            </strong>{" "}
            Turnaround session for this visit has ended. Records are in view-only
            mode.
          </div>
        </div>
        {isExempt && (
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground">
            Admin Override Active
          </span>
        )}
      </div>
    )
  }

  // queueStatus === "none"
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sky-500/20 bg-sky-500/5 px-3.5 py-2 text-xs text-sky-950 dark:text-sky-200 ${className}`}
    >
      <div className="flex items-center gap-2">
        <Clock className="size-3.5 text-sky-600 dark:text-sky-400" />
        <div>
          <strong className="font-semibold text-foreground">View Only:</strong>{" "}
          Patient is not currently in service. Actions are disabled until a
          service visit is started.
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isExempt && (
          <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-800 dark:text-sky-300">
            Admin Override Active
          </span>
        )}
        {onQueuePatient && (
          <button
            type="button"
            onClick={onQueuePatient}
            className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-xs font-bold text-sky-700 hover:bg-sky-500/20 dark:text-sky-300"
          >
            Queue Patient &rarr;
          </button>
        )}
      </div>
    </div>
  )
}
