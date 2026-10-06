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
import { AlertCircle, Loader2 } from "lucide-react"

interface AmendSocialCaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (reason: string) => Promise<void> | void
  isSubmitting?: boolean
}

export const AmendSocialCaseDialog: React.FC<AmendSocialCaseDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  isSubmitting = false,
}) => {
  const [reason, setReason] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = reason.trim()
    if (!trimmed) {
      setError("An amendment reason is required.")
      return
    }
    if (trimmed.length > 255) {
      setError("Reason cannot exceed 255 characters.")
      return
    }
    setError("")
    await onConfirm(trimmed)
    setReason("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Amend Social Case Study Report</DialogTitle>
            <DialogDescription>
              Reopening a finalized report allows you to author a new revision. Prior signed PDF documents remain preserved in the Documents tab.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amend-reason" className="font-semibold text-xs uppercase tracking-wider">
                Reason for Amendment <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="amend-reason"
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value)
                  if (error) setError("")
                }}
                placeholder="State the justification or requested changes for this revision (e.g., Updated financial evaluation per new family income document)..."
                rows={4}
                maxLength={255}
                className="text-sm"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{error ? <span className="text-destructive font-medium">{error}</span> : "Max 255 characters"}</span>
                <span>{reason.length}/255</span>
              </div>
            </div>

            <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 flex gap-2.5 items-start text-xs text-amber-800 dark:text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Amending will set the report status back to <strong>Draft</strong> and increments the revision counter.
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="senior"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="border-2 font-bold text-sm h-11 px-5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="senior"
              disabled={isSubmitting || !reason.trim()}
              className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-sm h-11 px-6 shadow-md transition-all"
            >
              {isSubmitting && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
              Reopen & Amend Report
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
