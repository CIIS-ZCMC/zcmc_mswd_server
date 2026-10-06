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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { ApiError } from "@/lib/api-client"
import { useCaseMutations } from "../../hooks/use-case-mutations"

interface CloseCaseDialogProps {
  caseId: number | string
  caseCode: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onClosed?: () => void
}

export const CloseCaseDialog: React.FC<CloseCaseDialogProps> = ({
  caseId,
  caseCode,
  open,
  onOpenChange,
  onClosed,
}) => {
  const [reason, setReason] = useState<string>("Case objectives completed")
  const [notes, setNotes] = useState<string>("")
  const [error, setError] = useState<string>("")

  const { closeCase, isClosePending } = useCaseMutations(caseId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    try {
      await closeCase({
        id: caseId,
        payload: {
          reason: reason.trim() || undefined,
          notes: notes.trim() || undefined,
        },
      })
      onOpenChange(false)
      onClosed?.()
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.firstValidationMessage ?? err.message)
      } else {
        setError(err instanceof Error ? err.message : "Failed to close case episode.")
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2 text-primary">
            <CheckCircle2 className="size-5 text-primary shrink-0" />
            Close Case Episode
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm font-medium leading-relaxed">
            Formally close case {caseCode}. All required sub-records (assessments and watchers) will be validated by the system.
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
            <Label className="text-xs font-bold uppercase tracking-wider">Closure Reason</Label>
            <Input
              placeholder="e.g. Case objectives completed, Patient discharged, Financial aid disbursed"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-10 text-sm font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider">Final Closure Notes</Label>
            <Input
              placeholder="Summary of social work interventions provided"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-10 text-sm"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isClosePending}
              className="font-bold text-sm h-10 px-4"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isClosePending}
              className="font-extrabold text-sm h-10 px-5 shadow-sm transition-all gap-1.5"
            >
              {isClosePending && <Loader2 className="size-4 animate-spin" />}
              Confirm Close Case
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
