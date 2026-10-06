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
import { Textarea } from "@/components/ui/textarea"
import {
  CARETAKER_ROLE_LABELS,
  type CaretakerAssignment,
} from "../../types/caretake.types"
import { useUnassignCaretaker } from "../../hooks/use-caretaker-writes"

interface UnassignCaretakerDialogProps {
  isOpen: boolean
  patientId: string
  caretaker: CaretakerAssignment | null
  onClose: () => void
}

export const UnassignCaretakerDialog: React.FC<UnassignCaretakerDialogProps> = ({
  isOpen,
  patientId,
  caretaker,
  onClose,
}) => {
  const unassignMutation = useUnassignCaretaker(patientId)

  const [reason, setReason] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleUnassign = async () => {
    if (!caretaker) return
    setErrorMessage(null)

    try {
      await unassignMutation.mutateAsync({
        caretakerId: caretaker.id,
        payload: {
          unassigned_reason: reason.trim() || undefined,
        },
      })
      onClose()
      setReason("")
    } catch (err: unknown) {
      if (err && typeof err === "object" && "message" in err) {
        setErrorMessage(String((err as { message: string }).message))
      } else {
        setErrorMessage("Failed to unassign caretaker.")
      }
    }
  }

  if (!caretaker) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full max-w-lg p-6 sm:p-8">
        <DialogHeader className="space-y-1.5 text-left">
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
            End Caretaker Custody
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            End active custody assignment without appointing an immediate replacement.
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="rounded-lg bg-destructive/15 border border-destructive/30 p-3 text-xs font-semibold text-destructive">
            {errorMessage}
          </div>
        )}

        <div className="rounded-xl border border-border bg-destructive/5 p-4 text-sm space-y-1">
          <div className="text-xs text-destructive font-semibold">Caretaker to Unassign</div>
          <div className="font-bold text-foreground text-base">{caretaker.user.name}</div>
          <div className="text-xs text-muted-foreground font-semibold">
            Role: {CARETAKER_ROLE_LABELS[caretaker.role]}
          </div>
        </div>

        <div className="grid gap-4 py-2">
          <div>
            <Label className="text-sm font-bold text-foreground mb-1.5 block">
              Termination Reason (Optional)
            </Label>
            <Textarea
              placeholder="e.g. Patient discharged, case closed..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-20 text-sm p-3 rounded-lg"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-11 px-6 text-sm font-semibold rounded-lg"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="default"
            className="h-11 font-bold px-7 text-sm rounded-lg shadow-sm"
            onClick={handleUnassign}
            disabled={unassignMutation.isPending}
          >
            {unassignMutation.isPending ? "Unassigning..." : "Unassign Caretaker"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
