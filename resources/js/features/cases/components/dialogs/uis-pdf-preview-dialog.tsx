import React, { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertCircle, Download, ExternalLink, FileText, Loader2 } from "lucide-react"
import { downloadCaseUisPdf, getCaseUisPreviewBlobUrl } from "../../api/uis-print-api"

interface UisPdfPreviewDialogProps {
  caseId: number | string
  caseCode?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const UisPdfPreviewDialog: React.FC<UisPdfPreviewDialogProps> = ({
  caseId,
  caseCode,
  open,
  onOpenChange,
}) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["uis-pdf-preview", String(caseId)],
    queryFn: () => getCaseUisPreviewBlobUrl(caseId),
    enabled: open && Boolean(caseId),
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
  const errorMessage = error instanceof Error ? error.message : error ? "Failed to load PDF preview." : null

  const handleDownload = () => {
    downloadCaseUisPdf(caseId, { filename: caseCode ? `UIS-${caseCode}.pdf` : undefined })
  }

  const handleOpenInNewTab = () => {
    if (blobUrl) {
      window.open(blobUrl, "_blank")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-border/60">
          <div>
            <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
              <FileText className="size-5 text-primary" />
              UIS Document Preview
              {caseCode && (
                <span className="text-xs font-mono font-medium text-muted-foreground px-2 py-0.5 rounded bg-muted">
                  {caseCode}
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Unified Intake Sheet (ANNEX B) live preview. No print log is created for previews.
            </DialogDescription>
          </div>

          <div className="flex items-center gap-2">
            {blobUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenInNewTab}
                className="h-8 text-xs gap-1.5 hidden sm:inline-flex"
              >
                <ExternalLink className="size-3.5" />
                Open in tab
              </Button>
            )}
            <Button
              variant="default"
              size="sm"
              onClick={handleDownload}
              className="h-8 text-xs gap-1.5"
            >
              <Download className="size-3.5" />
              Download PDF
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-[60vh] max-h-[72vh] my-2 bg-muted/20 rounded-lg overflow-hidden relative border border-border/60">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 backdrop-blur-xs z-10">
              <Loader2 className="size-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground font-medium">Generating preview…</p>
            </div>
          )}

          {errorMessage ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-2 text-destructive">
              <AlertCircle className="size-8 opacity-80" />
              <div className="text-sm font-semibold">Unable to Load Preview</div>
              <p className="text-xs text-muted-foreground max-w-sm">{errorMessage}</p>
            </div>
          ) : blobUrl ? (
            <iframe
              src={blobUrl}
              title="UIS PDF Preview"
              className="w-full h-full border-0 min-h-[60vh]"
            />
          ) : null}
        </div>

        <DialogFooter className="pt-2 border-t border-border/60 sm:justify-between flex items-center">
          <div className="text-xs text-muted-foreground hidden sm:block">
            Standard DOH ANNEX B format.
          </div>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close Preview
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
