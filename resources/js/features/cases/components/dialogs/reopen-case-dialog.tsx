import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { AlertCircle, Loader2, RotateCcw } from "lucide-react"
import { ApiError } from "@/lib/api-client"
import { useCaseMutations } from "../../hooks/use-case-mutations"

interface ReopenCaseDialogProps {
  caseId: number | string
  caseCode: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onReopened?: () => void
}

export const ReopenCaseDialog: React.FC<ReopenCaseDialogProps> = ({
  caseId,
  caseCode,
  open,
  onOpenChange,
  onReopened,
}) => {
  const [reason, setReason] = useState<string>("")
  const [error, setError] = useState<string>("")

  const { reopenCase, isReopenPending } = useCaseMutations(caseId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!reason.trim()) {
      setError("Please state why this case episode is being reopened.")
      return
    }

    try {
      await reopenCase({ id: caseId, payload: { reason: reason.trim() } })
      setReason("")
      onOpenChange(false)
      onReopened?.()
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.firstValidationMessage ?? err.message)
      } else {
        setError(err instanceof Error ? err.message : "Failed to reopen case episode.")
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2 text-primary">
            <RotateCcw className="size-5 text-primary shrink-0" />
            Reopen Case Episode
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm font-medium leading-relaxed">
            Reopen case {caseCode} and return it to ongoing. The reason is recorded in the case timeline.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 flex gap-2.5 items-start text-xs font-semibold text-destructive">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider">
              Reason for Reopening <span className="text-destructive">*</span>
            </Label>
            <Textarea
              placeholder="e.g. Patient readmitted, new financial request, referral returned"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-20 text-sm"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isReopenPending}
              className="font-bold text-sm h-10 px-4"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isReopenPending}
              className="font-extrabold text-sm h-10 px-5 shadow-sm transition-all gap-1.5"
            >
              {isReopenPending && <Loader2 className="size-4 animate-spin" />}
              Confirm Reopen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
