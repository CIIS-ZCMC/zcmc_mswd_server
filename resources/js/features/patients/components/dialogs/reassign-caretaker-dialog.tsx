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
import { NativeSelect } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { userDisplayName } from "@/features/auth/api/auth-api"
import { useUsers } from "@/features/auth/hooks/use-users"
import {
  CARETAKER_ROLE_LABELS,
  type CaretakerAssignment,
} from "../../types/caretake.types"
import { useReassignCaretaker } from "../../hooks/use-caretaker-writes"

interface ReassignCaretakerDialogProps {
  isOpen: boolean
  patientId: string
  caretaker: CaretakerAssignment | null
  onClose: () => void
}

export const ReassignCaretakerDialog: React.FC<ReassignCaretakerDialogProps> = ({
  isOpen,
  patientId,
  caretaker,
  onClose,
}) => {
  const usersQuery = useUsers()
  const reassignMutation = useReassignCaretaker(patientId)

  const [newUserId, setNewUserId] = useState<string>("")
  const [reason, setReason] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleReassign = async () => {
    if (!caretaker || !newUserId || !reason.trim()) return
    setErrorMessage(null)

    try {
      await reassignMutation.mutateAsync({
        caretakerId: caretaker.id,
        payload: {
          user_id: Number(newUserId),
          reason: reason.trim(),
        },
      })
      onClose()
      setNewUserId("")
      setReason("")
    } catch (err: unknown) {
      if (err && typeof err === "object" && "message" in err) {
        setErrorMessage(String((err as { message: string }).message))
      } else {
        setErrorMessage("Failed to reassign caretaker.")
      }
    }
  }

  if (!caretaker) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full max-w-lg p-6 sm:p-8">
        <DialogHeader className="space-y-1.5 text-left">
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
            Reassign Caretaker Handover
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Hand over custody to another staff member. This links the previous and new caretaker in the handover chain.
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="rounded-lg bg-destructive/15 border border-destructive/30 p-3 text-xs font-semibold text-destructive">
            {errorMessage}
          </div>
        )}

        <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm space-y-1">
          <div className="text-xs text-muted-foreground font-semibold">Outgoing Caretaker</div>
          <div className="font-bold text-foreground text-base">{caretaker.user.name}</div>
          <div className="text-xs text-primary font-semibold">
            Role: {CARETAKER_ROLE_LABELS[caretaker.role]}
          </div>
        </div>

        <div className="grid gap-5 py-2">
          <div>
            <Label className="text-sm font-bold text-foreground mb-1.5 block">
              Replacement Staff Member <span className="text-destructive">*</span>
            </Label>
            <NativeSelect
              size="lg"
              value={newUserId}
              onChange={(e) => setNewUserId(e.target.value)}
              disabled={usersQuery.isPending || usersQuery.isError}
              className="w-full rounded-lg"
            >
              <option value="">
                {usersQuery.isPending ? "Loading staff…" : "— Select Replacement Staff —"}
              </option>
              {usersQuery.data
                ?.filter((u) => String(u.id) !== caretaker.user.id)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {userDisplayName(u)}
                  </option>
                ))}
            </NativeSelect>
            {/* /users is gated on users.view. Saying so beats an empty list. */}
            {usersQuery.isError && (
              <p className="text-xs text-destructive font-semibold mt-1.5">
                Could not load staff. You may not have permission to view users —
                ask an administrator to perform this handover.
              </p>
            )}
          </div>

          <div>
            <Label className="text-sm font-bold text-foreground mb-1.5 block">
              Handover Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              placeholder="State why custody is being transferred (e.g. End of shift handover, re-allocation of caseload)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-24 text-sm p-3 rounded-lg"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Handover reason is required to maintain accountability log audit standards.
            </p>
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
            size="default"
            className="h-11 font-bold px-7 text-sm rounded-lg shadow-sm"
            onClick={handleReassign}
            disabled={!newUserId || !reason.trim() || reassignMutation.isPending}
          >
            {reassignMutation.isPending ? "Reassigning..." : "Confirm Handover"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
