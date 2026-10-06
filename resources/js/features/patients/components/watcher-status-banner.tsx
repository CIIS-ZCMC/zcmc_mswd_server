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
              This inpatient admission requires a registered primary watcher. Some actions are blocked until one is added or a waiver is filed.
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
            No primary watcher recorded for this episode. Recommended for ER and observation cases.
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
              An official waiver has been approved for this admission episode.
            </p>
          </div>
        </div>
        {canWaiveWatcher && onRevokeWaiver && (
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
