import React, { useState } from "react"
import { useCaseWatcherMutations } from "@/features/cases/hooks/use-case-watcher-mutations"
import { WatcherWaiverDialog } from "./dialogs/watcher-waiver-dialog"
import { WatcherStatusBanner } from "./watcher-status-banner"

interface CaseWatcherRequirementProps {
  caseId: number
  patientId: number
  /** Shown above the banner when a patient has several open cases. */
  caseCode?: string
}

/**
 * The watcher requirement of one case: the status banner plus the waiver dialog
 * and revoke action behind it. Shared by the patient page (one per open case)
 * and the case page.
 */
export const CaseWatcherRequirement: React.FC<CaseWatcherRequirementProps> = ({
  caseId,
  patientId,
  caseCode,
}) => {
  const mutations = useCaseWatcherMutations({ caseId, patientId })
  const [isWaiverOpen, setIsWaiverOpen] = useState(false)

  const handleRevokeWaiver = async () => {
    if (!window.confirm("Are you sure you want to revoke the watcher waiver for this case?")) return
    await mutations.destroyWaiver()
  }

  return (
    <div className="space-y-1">
      {caseCode && <div className="text-[11px] font-semibold text-muted-foreground">Case {caseCode}</div>}
      <WatcherStatusBanner
        caseId={caseId}
        onOpenWaiverDialog={() => setIsWaiverOpen(true)}
        onRevokeWaiver={handleRevokeWaiver}
        isRevokingWaiver={mutations.isDestroyingWaiver}
      />
      <WatcherWaiverDialog
        isOpen={isWaiverOpen}
        onClose={() => setIsWaiverOpen(false)}
        onStoreWaiver={async (payload) => {
          await mutations.storeWaiver(payload)
        }}
        isSubmitting={mutations.isStoringWaiver}
      />
    </div>
  )
}
