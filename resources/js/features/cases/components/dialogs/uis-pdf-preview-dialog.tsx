import React, { useEffect, useRef, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  AlertCircle,
  Download,
  ExternalLink,
  FileText,
  Info,
  Loader2,
  Printer,
  Sparkles,
} from "lucide-react"
import {
  downloadUisPdf,
  getUisPreviewBlobUrl,
  logUisPrint,
  uisTargetKey,
  type UisTarget,
} from "../../api/uis-print-api"
import { uisPrintKeys, patientUisKeys } from "../../hooks/use-uis-prints"

interface UisPdfPreviewDialogProps {
  /** A case's intake; ignored when `assessmentId` is given. */
  caseId?: number | string | null
  /** An intake assessment, with or without a case. */
  assessmentId?: number | null
  caseCode?: string
  patientName?: string
  hasAssessment?: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onAssessNeeded?: () => void
}

export const UisPdfPreviewDialog: React.FC<UisPdfPreviewDialogProps> = ({
  caseId,
  assessmentId,
  caseCode,
  patientName,
  hasAssessment,
  open,
  onOpenChange,
  onAssessNeeded,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const isBlank = hasAssessment === false

  const target: UisTarget | null = assessmentId
    ? { assessmentId }
    : caseId
      ? { caseId }
      : null

  const { data, isLoading, error } = useQuery({
    queryKey: [
      "uis-pdf-preview",
      target ? uisTargetKey(target) : "none",
      isBlank ? "blank" : "filled",
    ],
    queryFn: () => getUisPreviewBlobUrl(target!, { blank: isBlank }),
    enabled: open && target !== null,
    staleTime: 0,
    gcTime: 1000 * 60 * 5,
  })

  useEffect(() => {
    return () => {
      if (data?.revoke) {
        data.revoke()
      }
    }
  }, [data])

  const blobUrl = data?.url ?? null
  const errorMessage =
    error instanceof Error
      ? error.message
      : error
        ? "Failed to load PDF preview."
        : null

  const handleDownload = () => {
    if (!target) return
    downloadUisPdf(target, {
      filename: caseCode ? `UIS-${caseCode}.pdf` : undefined,
      blank: isBlank,
    })
  }

  const handleOpenInNewTab = () => {
    if (blobUrl) {
      window.open(blobUrl, "_blank")
    }
  }

  const queryClient = useQueryClient()
  const [isPrinting, setIsPrinting] = useState(false)

  const handlePrint = async () => {
    if (!target) return
    setIsPrinting(true)

    try {
      // 1. Log the official print on the server without triggering a file download
      await logUisPrint(target, {
        blank: isBlank,
      })
      queryClient.invalidateQueries({ queryKey: uisPrintKeys.all })
      queryClient.invalidateQueries({ queryKey: patientUisKeys.all })

      // 2. Open browser system print dialog for the preview iframe
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.focus()
        iframeRef.current.contentWindow.print()
      } else if (blobUrl) {
        const printWin = window.open(blobUrl, "_blank")
        printWin?.print()
      }
    } catch {
      // Fallback: trigger print even if server logging fails
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.focus()
        iframeRef.current.contentWindow.print()
      }
    } finally {
      setIsPrinting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] max-w-4xl flex-col gap-3 p-4 sm:p-6">
        <DialogHeader className="flex flex-col justify-between gap-3 space-y-0 border-b border-border/60 pb-3 sm:flex-row sm:items-center">
          <div>
            <DialogTitle className="flex items-center gap-2 text-base font-bold sm:text-lg">
              <FileText className="size-5 text-primary" />
              Unified Intake Sheet Preview
              {caseCode && (
                <span className="rounded border border-border/60 bg-muted px-2 py-0.5 font-mono text-xs font-bold text-foreground">
                  {caseCode}
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="mt-0.5 text-xs text-muted-foreground">
              Live ANNEX B Document Preview{" "}
              {patientName ? `for ${patientName}` : ""}.
            </DialogDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {blobUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenInNewTab}
                className="hidden h-8 cursor-pointer gap-1.5 text-xs sm:inline-flex"
                title="Open PDF in new browser tab"
              >
                <ExternalLink className="size-3.5" />
                Open in tab
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="h-8 cursor-pointer gap-1.5 text-xs"
            >
              <Download className="size-3.5" />
              Download
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handlePrint}
              disabled={isPrinting || isLoading}
              className="h-8 cursor-pointer gap-1.5 text-xs font-bold shadow-xs"
            >
              {isPrinting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Printer className="size-3.5" />
              )}
              Print Document
            </Button>
          </div>
        </DialogHeader>

        {/* Unassessed Case Warning Banner */}
        {isBlank && (
          <div className="flex flex-col justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 px-3 text-xs text-amber-900 sm:flex-row sm:items-center dark:text-amber-200">
            <span className="flex items-center gap-1.5 font-medium">
              <Info className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              This encounter has no intake assessment recorded yet — previewing
              blank ANNEX B template.
            </span>
            {onAssessNeeded && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false)
                  onAssessNeeded()
                }}
                className="h-7 shrink-0 cursor-pointer gap-1 self-start border-amber-500/40 text-xs font-bold text-amber-900 hover:bg-amber-500/20 sm:self-auto dark:text-amber-200"
              >
                <Sparkles className="size-3" />
                Conduct Assessment
              </Button>
            )}
          </div>
        )}

        {/* Live Iframe PDF Display */}
        <div className="relative max-h-[68vh] min-h-[58vh] flex-1 overflow-hidden rounded-xl border border-border/60 bg-muted/20">
          {isLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/80 backdrop-blur-xs">
              <Loader2 className="size-6 animate-spin text-primary" />
              <p className="text-xs font-medium text-muted-foreground">
                Rendering Unified Intake Sheet PDF…
              </p>
            </div>
          )}

          {errorMessage ? (
            <div className="flex h-full flex-col items-center justify-center space-y-2 p-6 text-center text-destructive">
              <AlertCircle className="size-8 opacity-80" />
              <div className="text-sm font-semibold">
                Unable to Load Preview
              </div>
              <p className="max-w-sm text-xs text-muted-foreground">
                {errorMessage}
              </p>
            </div>
          ) : blobUrl ? (
            <iframe
              ref={iframeRef}
              src={blobUrl}
              title="UIS PDF Preview"
              className="h-full min-h-[58vh] w-full border-0"
            />
          ) : null}
        </div>

        {/* Modal Footer */}
        <DialogFooter className="flex flex-row items-center justify-between gap-2 border-t border-border/60 pt-2 sm:justify-between">
          <div className="font-mono text-xs text-muted-foreground">
            Standard DOH ANNEX B format
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={handlePrint}
              disabled={isPrinting || isLoading}
              className="h-8 cursor-pointer gap-1.5 text-xs font-bold shadow-xs sm:hidden"
            >
              {isPrinting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Printer className="size-3.5" />
              )}
              Print
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 cursor-pointer text-xs"
            >
              Close Preview
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
