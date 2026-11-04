import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ApiError } from "@/lib/api-client"
import { Loader2, UserCog } from "lucide-react"
import { useTakeOverVisit } from "../hooks/use-queue"
import type { ServiceVisit } from "../types"

interface TakeOverVisitDialogProps {
  /** The visit to take over; the dialog is open while one is set. */
  visit: ServiceVisit | null
  onClose: () => void
}

/** Moves a visit in progress to the signed-in user, with a reason (queue.override). */
export const TakeOverVisitDialog: React.FC<TakeOverVisitDialogProps> = ({
  visit,
  onClose,
}) => {
  const mutation = useTakeOverVisit()
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)

  const close = () => {
    setReason("")
    setError(null)
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!visit || !reason.trim()) return
    setError(null)
    try {
      await mutation.mutateAsync({
        visitId: visit.id,
        input: { takeoverReason: reason.trim() },
      })
      close()
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to take over the visit."
      )
    }
  }

  return (
    <Dialog
      open={visit !== null}
      onOpenChange={(next) => {
        if (!next) close()
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <UserCog className="size-5 text-primary" />
            Take Over Service Visit
          </DialogTitle>
          <DialogDescription className="text-xs">
            {visit?.patient?.name || "This patient"} is being served by{" "}
            {visit?.servedBy?.name || "another worker"}. You will become the
            server and the timer keeps running.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {error && (
            <Alert variant="destructive" className="py-2 text-xs">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="takeoverReason" className="text-xs font-semibold">
              Reason for Take Over <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="takeoverReason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Worker went off shift, on emergency leave..."
              rows={3}
              maxLength={255}
              required
              className="text-xs"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={close}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={mutation.isPending || !reason.trim()}
              className="gap-2 font-bold"
            >
              {mutation.isPending && (
                <Loader2 className="size-3.5 animate-spin" />
              )}
              Take Over
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
