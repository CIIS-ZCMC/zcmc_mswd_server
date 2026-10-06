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
import { AlertCircle, ArrowUpRight, Loader2 } from "lucide-react"
import { ApiError } from "@/lib/api-client"
import { useCaseMutations } from "../../hooks/use-case-mutations"

interface ReferCaseDialogProps {
  caseId: number | string
  caseCode: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onReferred?: () => void
}

export const ReferCaseDialog: React.FC<ReferCaseDialogProps> = ({
  caseId,
  caseCode,
  open,
  onOpenChange,
  onReferred,
}) => {
  const [referredTo, setReferredTo] = useState<string>("")
  const [reason, setReason] = useState<string>("")
  const [notes, setNotes] = useState<string>("")
  const [error, setError] = useState<string>("")

  const { referCase, isReferPending } = useCaseMutations(caseId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!referredTo.trim()) {
      setError("Please specify the recipient agency, department, or unit.")
      return
    }
    if (!reason.trim()) {
      setError("Please state the clinical or social reason for referral.")
      return
    }

    try {
      await referCase({
        id: caseId,
        payload: {
          referred_to: referredTo.trim(),
          reason: reason.trim(),
          notes: notes.trim() || undefined,
        },
      })
      onOpenChange(false)
      onReferred?.()
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.firstValidationMessage ?? err.message)
      } else {
        setError(err instanceof Error ? err.message : "Failed to refer case episode.")
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2 text-primary">
            <ArrowUpRight className="size-5 text-primary shrink-0" />
            Refer Case Episode
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm font-medium leading-relaxed">
            Formally refer {caseCode} to an external agency, specialty unit, or government assistance program.
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
              Referred To (Agency / Dept) <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="e.g. DSWD Field Office IX, PCSO, Malasakit Center"
              value={referredTo}
              onChange={(e) => setReferredTo(e.target.value)}
              className="h-10 text-sm font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider">
              Reason for Referral <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="e.g. Financial assistance for chemotherapy, LGU transport"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-10 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider">Referral Notes</Label>
            <Input
              placeholder="Additional clinical notes, endorsement details"
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
              disabled={isReferPending}
              className="font-bold text-sm h-10 px-4"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isReferPending}
              className="font-extrabold text-sm h-10 px-5 shadow-sm transition-all gap-1.5"
            >
              {isReferPending && <Loader2 className="size-4 animate-spin" />}
              Complete Referral
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
