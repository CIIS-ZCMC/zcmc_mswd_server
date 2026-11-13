import React, { useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  DarEntryDialog,
  type DarEntryPrefill,
} from "@/features/dar/components/dar-entry-dialog"
import { FileCheck } from "lucide-react"
import { queueKeys, toTimeInput } from "../hooks/use-queue"
import type { ServiceVisit } from "../types"

/** An ISO timestamp as the local "YYYY-MM-DD" a DAR line is dated with. */
function toDateInput(iso: string): string {
  const date = new Date(iso)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

interface VisitDarPromptProps {
  /**
   * The completed visit to offer. Hold it in state: the DAR form resets when its
   * prefill changes, and the screens using this re-render on a one-second ticker.
   */
  visit: ServiceVisit | null
  /** Skip the question and open the form, for the card's Add to DAR button. */
  skipQuestion?: boolean
  onClose: () => void
}

/** After a visit is completed: asks whether to add it to the DAR, then opens the form pre-filled. */
export const VisitDarPrompt: React.FC<VisitDarPromptProps> = ({
  visit,
  skipQuestion = false,
  onClose,
}) => {
  const queryClient = useQueryClient()
  const [accepted, setAccepted] = useState(false)

  const prefill = useMemo<DarEntryPrefill | undefined>(
    () =>
      visit?.patient
        ? {
            patient: visit.patient,
            servedTime: toTimeInput(visit.startedAt),
            remarks: visit.remarks ?? "",
            serviceVisitId: visit.id,
          }
        : undefined,
    [visit]
  )

  const canFile = Boolean(prefill)
  const formOpen = canFile && (skipQuestion || accepted)

  const close = () => {
    setAccepted(false)
    onClose()
  }

  return (
    <>
      <Dialog
        open={canFile && !formOpen}
        onOpenChange={(next) => {
          if (!next) close()
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <FileCheck className="size-5 text-primary" />
              Add to your DAR?
            </DialogTitle>
            <DialogDescription className="text-xs">
              Service for {visit?.patient?.name || "this patient"} is complete.
              Add it to your Daily Accomplishment Report?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" size="sm" onClick={close}>
              Not now
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setAccepted(true)}
              className="font-bold"
            >
              Add to DAR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DarEntryDialog
        open={formOpen}
        onOpenChange={(next) => {
          if (!next) close()
        }}
        currentDate={
          visit ? toDateInput(visit.completedAt ?? visit.arrivedAt) : ""
        }
        prefill={prefill}
        onSaved={() =>
          queryClient.invalidateQueries({ queryKey: queueKeys.all })
        }
      />
    </>
  )
}
