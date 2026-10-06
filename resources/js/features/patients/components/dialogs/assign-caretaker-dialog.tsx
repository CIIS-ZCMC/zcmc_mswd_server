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
  CARETAKER_ROLES,
  CARETAKER_ROLE_LABELS,
  type CaretakerAssignment,
  type CaretakerRole,
} from "../../types/caretake.types"
import { useAssignCaretaker } from "../../hooks/use-caretaker-writes"

interface AssignCaretakerDialogProps {
  isOpen: boolean
  patientId: string
  activeCaretakers: CaretakerAssignment[]
  onClose: () => void
}

export const AssignCaretakerDialog: React.FC<AssignCaretakerDialogProps> = ({
  isOpen,
  patientId,
  activeCaretakers,
  onClose,
}) => {
  const usersQuery = useUsers()
  const assignMutation = useAssignCaretaker(patientId)

  const [userId, setUserId] = useState<string>("")
  const [role, setRole] = useState<CaretakerRole | "">("")
  const [reason, setReason] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const activeRoles = new Set(
    activeCaretakers.filter((c) => c.isActive).map((c) => c.role)
  )

  const handleAssign = async () => {
    if (!userId || !role) return
    setErrorMessage(null)

    try {
      await assignMutation.mutateAsync({
        user_id: Number(userId),
        role: role as CaretakerRole,
        assigned_date: new Date().toISOString().split("T")[0],
        reason: reason.trim() || undefined,
      })
      onClose()
      setUserId("")
      setRole("")
      setReason("")
    } catch (err: unknown) {
      if (err && typeof err === "object" && "message" in err) {
        setErrorMessage(String((err as { message: string }).message))
      } else {
        setErrorMessage("Failed to assign caretaker. Please check constraints.")
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full max-w-lg p-6 sm:p-8">
        <DialogHeader className="space-y-1.5 text-left">
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
            Assign Caretaker
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Assign standing custody of this patient to a clinical or social work staff member.
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="rounded-lg bg-destructive/15 border border-destructive/30 p-3 text-xs font-semibold text-destructive">
            {errorMessage}
          </div>
        )}

        <div className="grid gap-5 py-3">
          <div>
            <Label className="text-sm font-bold text-foreground mb-1.5 block">
              Staff User <span className="text-destructive">*</span>
            </Label>
            <NativeSelect
              size="lg"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              disabled={usersQuery.isPending || usersQuery.isError}
              className="w-full rounded-lg"
            >
              <option value="">
                {usersQuery.isPending ? "Loading staff…" : "— Select Staff Member —"}
              </option>
              {usersQuery.data?.map((u) => (
                <option key={u.id} value={u.id}>
                  {userDisplayName(u)}
                </option>
              ))}
            </NativeSelect>
            {/* /users is gated on users.view. Saying so beats an empty list. */}
            {usersQuery.isError && (
              <p className="text-xs text-destructive font-semibold mt-1.5">
                Could not load staff. You may not have permission to view users —
                ask an administrator to assign this caretaker.
              </p>
            )}
          </div>

          <div>
            <Label className="text-sm font-bold text-foreground mb-1.5 block">
              Caretaker Role <span className="text-destructive">*</span>
            </Label>
            <NativeSelect
              size="lg"
              value={role}
              onChange={(e) => setRole(e.target.value as CaretakerRole)}
              className="w-full rounded-lg"
            >
              <option value="">— Select Role —</option>
              {CARETAKER_ROLES.map((r) => {
                const isActiveRole = activeRoles.has(r)
                return (
                  <option key={r} value={r} disabled={isActiveRole}>
                    {CARETAKER_ROLE_LABELS[r]} {isActiveRole ? "(Already Assigned)" : ""}
                  </option>
                )
              })}
            </NativeSelect>
            <p className="text-xs text-muted-foreground mt-1.5">
              Only one active caretaker is allowed per role.
            </p>
          </div>

          <div>
            <Label className="text-sm font-bold text-foreground mb-1.5 block">
              Assignment Reason / Context
            </Label>
            <Textarea
              placeholder="e.g. Assigned as primary social worker for ward custody..."
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
            size="default"
            className="h-11 font-bold px-7 text-sm rounded-lg shadow-sm"
            onClick={handleAssign}
            disabled={!userId || !role || assignMutation.isPending}
          >
            {assignMutation.isPending ? "Assigning..." : "Assign Caretaker"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
