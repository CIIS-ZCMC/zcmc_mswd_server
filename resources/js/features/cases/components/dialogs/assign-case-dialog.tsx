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
import { AlertCircle, Loader2, UserCheck } from "lucide-react"
import { ApiError } from "@/lib/api-client"
import { useCaseMutations } from "../../hooks/use-case-mutations"

interface AssignCaseDialogProps {
  caseId: number | string
  caseCode: string
  currentAssignedId?: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAssigned?: () => void
}

export const AssignCaseDialog: React.FC<AssignCaseDialogProps> = ({
  caseId,
  caseCode,
  currentAssignedId,
  open,
  onOpenChange,
  onAssigned,
}) => {
  const [assignedUserId, setAssignedUserId] = useState<string>(
    currentAssignedId ? String(currentAssignedId) : ""
  )
  const [notes, setNotes] = useState<string>("")
  const [error, setError] = useState<string>("")

  const { assignCase, isAssignPending } = useCaseMutations(caseId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const userId = Number(assignedUserId)
    if (!userId) {
      setError("Please enter or select a valid Social Worker ID.")
      return
    }

    try {
      await assignCase({
        id: caseId,
        payload: {
          assigned_user_id: userId,
          notes: notes.trim() || undefined,
        },
      })
      onOpenChange(false)
      onAssigned?.()
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.firstValidationMessage ?? err.message)
      } else {
        setError(err instanceof Error ? err.message : "Failed to assign case.")
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2 text-primary">
            <UserCheck className="size-5 text-primary shrink-0" />
            Assign Case Episode
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm font-medium leading-relaxed">
            Assign {caseCode} to a designated Medical Social Worker.
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
              Social Worker ID / User ID <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number"
              placeholder="Enter User ID (e.g. 1)"
              value={assignedUserId}
              onChange={(e) => setAssignedUserId(e.target.value)}
              className="h-10 text-sm font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider">Assignment Notes</Label>
            <Input
              placeholder="Optional notes or instructions for the worker"
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
              disabled={isAssignPending}
              className="font-bold text-sm h-10 px-4"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isAssignPending}
              className="font-extrabold text-sm h-10 px-5 shadow-sm transition-all gap-1.5"
            >
              {isAssignPending && <Loader2 className="size-4 animate-spin" />}
              Save Assignment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
