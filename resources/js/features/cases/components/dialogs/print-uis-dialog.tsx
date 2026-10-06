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
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, ExternalLink, FileText, Loader2, Printer, Sparkles } from "lucide-react"
import { ApiError } from "@/lib/api-client"
import { useCaseUisReadiness, usePrintCaseUis } from "../../hooks/use-uis-prints"
import { MISSING_SECTION_LABELS } from "../../lib/uis-labels"

interface PrintUisDialogProps {
  caseId: number | string
  caseCode?: string
  patientName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onAssessNeeded?: () => void
}

export const PrintUisDialog: React.FC<PrintUisDialogProps> = ({
  caseId,
  caseCode,
  patientName,
  open,
  onOpenChange,
  onAssessNeeded,
}) => {
  const [copies, setCopies] = useState<number>(1)
  const [remarks, setRemarks] = useState<string>("")
  const [error, setError] = useState<string>("")
  const [isNoAssessmentError, setIsNoAssessmentError] = useState<boolean>(false)
  const [activeAction, setActiveAction] = useState<"print" | "preview" | "blank" | null>(null)

  const { data: readiness, isLoading: isReadinessLoading } = useCaseUisReadiness(caseId)
  const printMutation = usePrintCaseUis(caseId, caseCode)

  const handleAction = async (action: "print" | "preview" | "blank") => {
    setError("")
    setIsNoAssessmentError(false)
    setActiveAction(action)

    try {
      await printMutation.mutateAsync({
        copies: Math.min(Math.max(1, copies), 20),
        remarks: remarks.trim() || undefined,
        preview: action === "preview",
        blank: action === "blank",
      })

      if (action !== "preview") {
        onOpenChange(false)
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 409 || err.code === "uis_no_assessment") {
          setIsNoAssessmentError(true)
          setError(err.message || "This case has no intake assessment recorded yet.")
        } else {
          setError(err.firstValidationMessage || err.message)
        }
      } else {
        setError(err instanceof Error ? err.message : "Failed to generate UIS PDF.")
      }
    } finally {
      setActiveAction(null)
    }
  }

  const isSubmitting = printMutation.isPending

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isSubmitting) {
          if (!next) {
            setError("")
            setIsNoAssessmentError(false)
          }
          onOpenChange(next)
        }
      }}
    >
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader className="space-y-1.5 border-b border-border/40 pb-3">
          <DialogTitle className="text-xl font-extrabold flex items-center gap-2 text-foreground">
            <Printer className="size-5.5 text-primary" />
            Print Unified Intake Sheet (ANNEX B)
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground font-medium">
            Generate and log official MSWD Annex B intake document for {caseCode ? `Case ${caseCode}` : "this case"}
            {patientName ? ` (${patientName})` : ""}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Readiness Hints */}
          {!isReadinessLoading && readiness && (
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold text-foreground">
                <span className="flex items-center gap-1.5">
                  <FileText className="size-4 text-primary" />
                  Assessment Status: {readiness.has_assessment ? "Recorded" : "Not yet recorded"}
                </span>
                {readiness.print_count > 0 && (
                  <span className="text-muted-foreground font-medium">
                    Printed {readiness.print_count} time{readiness.print_count === 1 ? "" : "s"}
                  </span>
                )}
              </div>

              {readiness.missing && readiness.missing.length > 0 && (
                <div className="space-y-1 pt-1 border-t border-border/40">
                  <p className="text-muted-foreground font-medium">Unfilled sections (non-blocking hint):</p>
                  <div className="flex flex-wrap gap-1.5">
                    {readiness.missing.map((section) => (
                      <Badge key={section} variant="outline" className="text-[11px] font-semibold">
                        {MISSING_SECTION_LABELS[section] || section}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 409 No Assessment Special Alert */}
          {isNoAssessmentError && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 space-y-2.5 text-amber-900 dark:text-amber-200">
              <div className="flex gap-2 items-start text-xs font-bold">
                <AlertCircle className="size-4.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>Intake Assessment Required for Full Print</span>
              </div>
              <p className="text-xs font-medium leading-relaxed">
                The server requires an intake assessment before generating the populated Unified Intake Sheet. You can create the assessment now, or print a blank template form.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {onAssessNeeded && (
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-xs cursor-pointer"
                    onClick={() => {
                      onOpenChange(false)
                      onAssessNeeded()
                    }}
                  >
                    <Sparkles className="size-3.5" /> Assess Case Now
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isSubmitting}
                  className="h-8 text-xs font-bold gap-1.5 border-amber-500/40 hover:bg-amber-500/15 cursor-pointer"
                  onClick={() => handleAction("blank")}
                >
                  {activeAction === "blank" && <Loader2 className="size-3.5 animate-spin" />}
                  Print Blank Template
                </Button>
              </div>
            </div>
          )}

          {/* Generic Error */}
          {error && !isNoAssessmentError && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 flex gap-2.5 items-start text-xs font-semibold text-destructive">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-1 space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider">Copies</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={copies}
                onChange={(e) => setCopies(parseInt(e.target.value, 10) || 1)}
                className="h-10 text-base font-bold font-mono text-center"
                disabled={isSubmitting}
              />
            </div>

            <div className="sm:col-span-3 space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider">
                Print Remarks <span className="text-muted-foreground font-normal lowercase">(optional, max 255)</span>
              </Label>
              <Textarea
                placeholder="e.g. Issued for PhilHealth verification / GL requirement"
                value={remarks}
                maxLength={255}
                onChange={(e) => setRemarks(e.target.value)}
                className="min-h-[70px] text-xs font-medium resize-none"
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2 pt-3 border-t border-border/40 flex-col sm:flex-row">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleAction("blank")}
            disabled={isSubmitting}
            className="text-xs font-bold h-10 px-3 cursor-pointer sm:mr-auto text-muted-foreground hover:text-foreground"
          >
            {activeAction === "blank" && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
            Print Blank Form
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleAction("preview")}
            disabled={isSubmitting}
            className="font-bold text-xs h-10 px-3.5 gap-1.5 cursor-pointer"
          >
            {activeAction === "preview" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <ExternalLink className="size-3.5" />
            )}
            Preview (New Tab)
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => handleAction("print")}
            disabled={isSubmitting}
            className="font-extrabold text-xs h-10 px-4 gap-1.5 shadow-sm cursor-pointer"
          >
            {activeAction === "print" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Printer className="size-3.5" />
            )}
            Print &amp; Log
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
