import React from "react"
import { Button } from "@/components/ui/button"
import { usePermission } from "@/features/auth/hooks/use-permission"
import { useWatcherStatus } from "@/features/cases/hooks/use-case-watchers"
import { AlertTriangle, FileCheck2, ShieldAlert } from "lucide-react"

interface WatcherStatusBannerProps {
  caseId?: number
  onOpenWaiverDialog: () => void
  onRevokeWaiver?: () => void
  isRevokingWaiver?: boolean
}

const REQUIRED_TEXT: Record<string, string> = {
  minor: "This patient is a minor, so a registered primary watcher is required.",
  incapacitated: "This patient cannot speak for themselves, so a registered primary watcher is required.",
  inpatient: "This inpatient admission requires a registered primary watcher.",
}

const WAIVER_REASONS: Record<string, string> = {
  unidentified_patient: "Unidentified patient",
  abandoned: "Abandoned",
  unaccompanied: "Unaccompanied",
  patient_refused: "Patient refused a watcher",
  under_protective_custody: "Under protective custody",
  other: "Other",
}

const formatDate = (iso: string | null) => (iso ? iso.substring(0, 10) : null)

export const WatcherStatusBanner: React.FC<WatcherStatusBannerProps> = ({
  caseId,
  onOpenWaiverDialog,
  onRevokeWaiver,
  isRevokingWaiver = false,
}) => {
  const { data: status } = useWatcherStatus(caseId)
  const canWaiveWatcher = usePermission("cases.waive_watcher")

  if (!caseId || !status) return null

  // Case 1: Requirement is Required and no primary watcher registered
  if (status.requirement === "required" && !status.hasPrimary) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-destructive shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <ShieldAlert className="size-5 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold tracking-tight">Primary Watcher Required</h4>
            <p className="text-xs text-destructive/90 mt-0.5">
              {REQUIRED_TEXT[status.requirementReason] ?? REQUIRED_TEXT.inpatient} Some actions are blocked until one is
              assigned or a waiver is filed.
            </p>
          </div>
        </div>
        {canWaiveWatcher && (
          <Button
            variant="destructive"
            size="sm"
            className="h-8 text-xs font-bold shrink-0 self-end sm:self-center"
            onClick={onOpenWaiverDialog}
          >
            File Watcher Waiver
          </Button>
        )}
      </div>
    )
  }

  // Case 2: Requirement is Recommended (e.g. ER cases) and no watcher
  if (status.requirement === "recommended" && !status.hasPrimary) {
    return (
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-800 dark:text-amber-300 shadow-2xs flex items-start gap-3">
        <AlertTriangle className="size-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold tracking-tight">Watcher Recommended</h4>
          <p className="text-xs opacity-90 mt-0.5">
            No primary watcher is assigned to this case. Recommended for ER and observation cases.
          </p>
        </div>
      </div>
    )
  }

  // Case 3: Requirement is Waived
  if (status.requirement === "waived") {
    return (
      <div className="rounded-xl border border-border bg-muted/60 p-3.5 text-muted-foreground shadow-2xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <FileCheck2 className="size-5 text-primary shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              Watcher Requirement Waived
            </h4>
            <p className="text-[11px] text-muted-foreground">
              {status.requirementReason === "legacy"
                ? "This case predates the watcher requirement."
                : status.waiver
                  ? `${WAIVER_REASONS[status.waiver.reason] ?? status.waiver.reason}${
                      status.waiver.waivedBy ? ` · waived by ${status.waiver.waivedBy}` : ""
                    }${formatDate(status.waiver.waivedAt) ? ` on ${formatDate(status.waiver.waivedAt)}` : ""}${
                      status.waiver.note ? ` · ${status.waiver.note}` : ""
                    }`
                  : "An official waiver has been approved for this admission episode."}
            </p>
          </div>
        </div>
        {canWaiveWatcher && onRevokeWaiver && status.requirementReason !== "legacy" && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs font-semibold shrink-0"
            onClick={onRevokeWaiver}
            disabled={isRevokingWaiver}
          >
            {isRevokingWaiver ? "Revoking..." : "Revoke Waiver"}
          </Button>
        )}
      </div>
    )
  }

  return null
}
