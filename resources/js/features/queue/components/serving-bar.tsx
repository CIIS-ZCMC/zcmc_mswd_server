import React, { useEffect, useState } from "react"
import { router } from "@inertiajs/react"
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
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, ExternalLink, Loader2, Timer } from "lucide-react"
import { ApiError } from "@/lib/api-client"
import { usePermission } from "@/features/auth/hooks/use-permission"
import { useCompleteVisit, useMyActiveVisit } from "../hooks/use-queue"
import type { ServiceVisit } from "../types"
import { VisitDarPrompt } from "./visit-dar-prompt"
import { VisitPrintPrompt } from "./visit-print-prompt"

/** Seconds as "1h 05m 09s" / "5m 09s". */
function formatElapsed(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const mins = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60
  const pad = (n: number) => String(n).padStart(2, "0")
  return hours > 0
    ? `${hours}h ${pad(mins)}m ${pad(secs)}s`
    : `${mins}m ${pad(secs)}s`
}

/**
 * Shown on every page while the signed-in worker has a visit in progress, so it
 * can't be forgotten: the patient, a running timer, and Complete / Open.
 */
export const ServingBar: React.FC = () => {
  const visit = useMyActiveVisit()
  const canAddToDar = usePermission("dar.manage")
  const completeMutation = useCompleteVisit()

  // SSR-safe ticker: 0 until mounted on the client.
  const [now, setNow] = useState(0)
  useEffect(() => {
    setNow(Date.now())
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const [completeOpen, setCompleteOpen] = useState(false)
  const [remarks, setRemarks] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [printVisit, setPrintVisit] = useState<ServiceVisit | null>(null)
  const [darVisit, setDarVisit] = useState<ServiceVisit | null>(null)

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!visit) return
    setError(null)
    try {
      const completed = await completeMutation.mutateAsync({
        visitId: visit.id,
        input: { remarks: remarks.trim() || undefined },
      })
      setCompleteOpen(false)
      setRemarks("")
      setPrintVisit(completed)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to complete visit.")
    }
  }

  const elapsed =
    visit?.startedAt && now > 0
      ? Math.max(
          0,
          Math.floor((now - new Date(visit.startedAt).getTime()) / 1000)
        )
      : null
  const overTarget = visit?.withinTarget.processing === false

  return (
    <>
      {visit && (
        <div
          role="status"
          className={`flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-2 text-xs ${
            overTarget
              ? "border-amber-500/40 bg-amber-500/15 text-amber-950 dark:text-amber-100"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100"
          }`}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Timer className="size-4 shrink-0" />
            <span className="truncate">
              <strong className="font-bold">
                Serving {visit.patient?.name ?? "a patient"}
              </strong>{" "}
              · encounter #{visit.hisTransactionId}
              {elapsed !== null && (
                <span className="ml-2 font-mono font-semibold">
                  {formatElapsed(elapsed)}
                </span>
              )}
              {overTarget && (
                <span className="ml-2 font-semibold">(over target)</span>
              )}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.visit(`/patients/${visit.patientId}`)}
              className="h-7 gap-1.5 bg-background/70 text-xs font-semibold"
            >
              <ExternalLink className="size-3.5" />
              Open
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setError(null)
                setCompleteOpen(true)
              }}
              className="h-7 gap-1.5 bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
            >
              <CheckCircle2 className="size-3.5" />
              Complete
            </Button>
          </div>
        </div>
      )}

      <Dialog open={completeOpen && Boolean(visit)} onOpenChange={setCompleteOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleComplete} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">
                Complete service
              </DialogTitle>
              <DialogDescription className="text-xs">
                End the visit for {visit?.patient?.name ?? "this patient"}. The
                server stamps the completion time.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="serving-bar-remarks" className="text-xs font-bold">
                Remarks (optional)
              </Label>
              <Textarea
                id="serving-bar-remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                maxLength={500}
                className="text-xs"
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCompleteOpen(false)}
                disabled={completeMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={completeMutation.isPending}
                className="gap-2 bg-emerald-600 font-bold text-white hover:bg-emerald-700"
              >
                {completeMutation.isPending && (
                  <Loader2 className="size-3.5 animate-spin" />
                )}
                Confirm Complete
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <VisitPrintPrompt
        visit={printVisit}
        onClose={() => {
          if (canAddToDar && printVisit) setDarVisit(printVisit)
          setPrintVisit(null)
        }}
      />
      <VisitDarPrompt visit={darVisit} onClose={() => setDarVisit(null)} />
    </>
  )
}
