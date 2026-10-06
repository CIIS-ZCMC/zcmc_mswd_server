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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AlertCircle, ClipboardCheck, Loader2 } from "lucide-react"
import { ApiError } from "@/lib/api-client"
import { useAssessEncounter, useAssignableCases } from "../../hooks/use-hospital-encounters"

interface AssessEncounterDialogProps {
  encounterId: number
  hospitalNumber: string | number | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
  onAssessed?: () => void
}

export const AssessEncounterDialog: React.FC<AssessEncounterDialogProps> = ({
  encounterId,
  hospitalNumber,
  open,
  onOpenChange,
  onAssessed,
}) => {
  const [caseId, setCaseId] = useState<string>("")
  const [error, setError] = useState("")

  const { data: cases = [], isLoading } = useAssignableCases(encounterId, open)
  const assess = useAssessEncounter(encounterId, hospitalNumber)

  const handleConfirm = async () => {
    if (!caseId) {
      setError("Select a case to attach this encounter to.")
      return
    }
    setError("")
    try {
      await assess.mutateAsync(Number(caseId))
      setCaseId("")
      onOpenChange(false)
      onAssessed?.()
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.firstValidationMessage ?? err.message)
      } else {
        setError(err instanceof Error ? err.message : "Could not attach the encounter.")
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2 text-primary">
            <ClipboardCheck className="w-5 h-5 text-primary shrink-0" />
            Assess Hospital Encounter
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm font-medium leading-relaxed">
            Attach encounter #{encounterId} to one of the patient's open social cases.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="font-bold text-xs uppercase tracking-wider text-foreground">
              Attach to Social Case <span className="text-destructive">*</span>
            </Label>

            {isLoading ? (
              <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground font-medium border rounded-lg bg-muted/30">
                <Loader2 className="w-4 h-4 animate-spin text-primary" /> Loading open cases…
              </div>
            ) : cases.length === 0 ? (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 flex gap-2.5 items-start text-xs sm:text-sm font-medium text-amber-900 dark:text-amber-200">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <span>This patient has no open case. Open a case first, then assess the encounter into it.</span>
              </div>
            ) : (
              <Select
                value={caseId}
                onValueChange={(value) => {
                  setCaseId(value || "")
                  if (error) setError("")
                }}
              >
                <SelectTrigger className="h-10 text-sm font-medium px-3 border">
                  <SelectValue placeholder="Select an open case" />
                </SelectTrigger>
                <SelectContent>
                  {cases.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)} className="text-sm font-medium py-2">
                      Case #{c.caseCode} · {c.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {error && <p className="text-xs text-destructive font-semibold pt-0.5">{error}</p>}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={assess.isPending}
            className="border font-bold text-sm h-10 px-4"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={assess.isPending || cases.length === 0 || !caseId}
            className="font-extrabold text-sm h-10 px-5 shadow-sm transition-all gap-1.5"
          >
            {assess.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
            Attach to Case
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

