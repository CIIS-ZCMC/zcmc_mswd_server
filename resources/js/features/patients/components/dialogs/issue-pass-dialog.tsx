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
/** The part of a case watcher the dialog needs, so any assignment can be passed. */
interface PassHolder {
  id: string
  fullName: string
  passValidUntil?: string | null
}

interface IssuePassDialogProps {
  isOpen: boolean
  onClose: () => void
  watcher: PassHolder | null
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
      <DialogContent className="w-full max-w-[480px] rounded-[20px] p-6">
        <DialogHeader>
          <DialogTitle className="text-[18px] font-bold text-[#0c2a5b] dark:text-foreground">Issue Ward Access Pass</DialogTitle>
          <DialogDescription className="text-[12px] text-[#5b6678] dark:text-muted-foreground">
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

        <DialogFooter className="gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            className="h-[36px] cursor-pointer rounded-full border border-[#cfd7e4] px-[16px] text-[13px] font-semibold text-[#0c2a5b] transition-colors hover:bg-[#f4f7fc] active:scale-[0.98] dark:border-border dark:text-foreground dark:hover:bg-muted"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-[36px] cursor-pointer rounded-full bg-[#1f5fd6] px-[20px] text-[13px] font-semibold text-white shadow-xs transition-colors hover:bg-[#1a53bd] active:scale-[0.98]"
            onClick={handleSave}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Issuing..." : "Issue Pass"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
