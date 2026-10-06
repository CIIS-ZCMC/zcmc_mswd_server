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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { CaseWatcher } from "@/features/cases/types/watcher.types"

interface IssuePassDialogProps {
  isOpen: boolean
  onClose: () => void
  watcher: CaseWatcher | null
  onIssuePass: (watcherId: number, passValidUntil?: string) => Promise<void>
  isSubmitting?: boolean
}

export const IssuePassDialog: React.FC<IssuePassDialogProps> = ({
  isOpen,
  onClose,
  watcher,
  onIssuePass,
  isSubmitting = false,
}) => {
  const [validUntil, setValidUntil] = useState("")
  const [prevKey, setPrevKey] = useState<string | null>(null)
  const currentKey = `${watcher?.id ?? "none"}-${isOpen}`

  if (currentKey !== prevKey) {
    setPrevKey(currentKey)
    if (watcher?.passValidUntil) {
      setValidUntil(watcher.passValidUntil.substring(0, 10))
    } else {
      const defaultDate = new Date()
      defaultDate.setDate(defaultDate.getDate() + 7)
      setValidUntil(defaultDate.toISOString().substring(0, 10))
    }
  }

  const handleSave = async () => {
    if (!watcher) return
    try {
      await onIssuePass(Number(watcher.id), validUntil || undefined)
      onClose()
    } catch {
      // Error handled by parent toast/mutation
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Issue Ward Access Pass</DialogTitle>
          <DialogDescription className="text-xs">
            Generate and activate an official ZCMC ward access pass for{" "}
            <strong className="text-foreground font-semibold">{watcher?.fullName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-3 text-sm">
          <div>
            <Label className="text-xs font-semibold">Pass Valid Until</Label>
            <Input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="h-10 mt-1"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Select the expiry date for this access pass. Defaults to 7 days.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button size="default" className="font-bold" onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? "Issuing..." : "Issue Pass"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
