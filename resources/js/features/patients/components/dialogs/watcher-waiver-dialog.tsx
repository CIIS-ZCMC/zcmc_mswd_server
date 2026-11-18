import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { StoreWatcherWaiverPayload } from "@/features/cases/api/case-watchers-api"

type WaiverReason = StoreWatcherWaiverPayload["watcher_waiver_reason"]

interface WatcherWaiverDialogProps {
  isOpen: boolean
  onClose: () => void
  onStoreWaiver: (payload: StoreWatcherWaiverPayload) => Promise<void>
  isSubmitting?: boolean
}

const WAIVER_REASONS: Array<{ value: WaiverReason; label: string }> = [
  { value: "unidentified_patient", label: "Unidentified / Jane or John Doe Patient" },
  { value: "abandoned", label: "Abandoned Patient" },
  { value: "unaccompanied", label: "Unaccompanied Patient" },
  { value: "patient_refused", label: "Patient Refused Watcher" },
  { value: "under_protective_custody", label: "Under Protective Custody" },
  { value: "other", label: "Other (Specify Reason Below)" },
]

export const WatcherWaiverDialog: React.FC<WatcherWaiverDialogProps> = ({
  isOpen,
  onClose,
  onStoreWaiver,
  isSubmitting = false,
}) => {
  const [reason, setReason] = useState<WaiverReason>("unaccompanied")
  const [notes, setNotes] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSave = async () => {
    if (reason === "other" && !notes.trim()) {
      setErrorMessage("Please provide a note/justification when selecting 'Other'.")
      return
    }

    try {
      setErrorMessage(null)
      await onStoreWaiver({
        watcher_waiver_reason: reason,
        watcher_waiver_note: notes.trim() || null,
      })
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to file watcher waiver"
      setErrorMessage(msg)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full max-w-[480px] rounded-[20px] p-6">
        <DialogHeader>
          <DialogTitle className="text-[18px] font-bold text-[#0c2a5b] dark:text-foreground">File Watcher Requirement Waiver</DialogTitle>
          <DialogDescription className="text-[12px] text-[#5b6678] dark:text-muted-foreground">
            Officially waive the mandatory watcher requirement for this admission case.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 text-sm">
          {errorMessage && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {errorMessage}
            </div>
          )}

          <div>
            <Label className="text-xs font-semibold">Waiver Reason *</Label>
            <Select
              value={reason}
              onValueChange={(val) => val && setReason(val as WaiverReason)}
            >
              <SelectTrigger className="h-10 mt-1">
                <SelectValue placeholder="Select official waiver reason" />
              </SelectTrigger>
              <SelectContent>
                {WAIVER_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-semibold">
              Waiver Notes / Justification {reason === "other" && "*"}
            </Label>
            <Textarea
              placeholder="Provide detailed clinical or administrative justification..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 min-h-[80px] text-sm"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            className="h-[36px] cursor-pointer rounded-full border border-[#cfd7e4] px-[16px] text-[13px] font-semibold text-[#0c2a5b] transition-colors hover:bg-[#f4f7fc] active:scale-[0.98] dark:border-border dark:text-foreground dark:hover:bg-muted"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-[36px] cursor-pointer rounded-full bg-[#1f5fd6] px-[20px] text-[13px] font-semibold text-white shadow-xs transition-colors hover:bg-[#1a53bd] active:scale-[0.98]"
            onClick={handleSave}
            disabled={isSubmitting || (reason === "other" && !notes.trim())}
          >
            {isSubmitting ? "Filing Waiver..." : "Confirm Waiver"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
