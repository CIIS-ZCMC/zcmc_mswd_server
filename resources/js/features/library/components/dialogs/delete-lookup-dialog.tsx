import React from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle, Loader2, PowerOff, Trash2 } from "lucide-react"

interface DeleteLookupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  itemName: string
  usageCount: number
  isDeleting: boolean
  isDeactivating?: boolean
  onConfirmDelete: () => void
  onDeactivate?: () => void
}

export const DeleteLookupDialog: React.FC<DeleteLookupDialogProps> = ({
  open,
  onOpenChange,
  title,
  itemName,
  usageCount,
  isDeleting,
  isDeactivating = false,
  onConfirmDelete,
  onDeactivate,
}) => {
  const isBusy = isDeleting || isDeactivating

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg p-6 sm:p-7">
        <AlertDialogHeader className="space-y-2 border-b border-border/60 pb-3">
          <AlertDialogTitle className="flex items-center gap-2.5 text-xl font-bold text-destructive">
            <AlertTriangle className="size-6" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription
            render={<div />}
            className="space-y-4 pt-2 text-base leading-relaxed text-foreground"
          >
            <p>
              Are you sure you want to delete{" "}
              <strong className="font-bold text-foreground underline">
                "{itemName}"
              </strong>
              ?
            </p>

            {usageCount > 0 && (
              <Alert
                variant="destructive"
                className="rounded-xl border-amber-500/40 bg-amber-500/10 p-4 text-amber-950 dark:text-amber-200"
              >
                <AlertTriangle className="mt-0.5 size-5 text-amber-600 dark:text-amber-400" />
                <AlertTitle className="text-sm font-bold">
                  Warning: Item is currently used in {usageCount} record
                  {usageCount === 1 ? "" : "s"}
                </AlertTitle>
                <AlertDescription className="mt-1.5 text-xs leading-relaxed font-medium">
                  Deleting this option removes it from every dropdown. Records
                  that already use it keep showing it. If you only want to stop
                  new records from selecting it, click{" "}
                  <strong>Deactivate Instead</strong>.
                </AlertDescription>
              </Alert>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-col gap-3 pt-3 sm:flex-row sm:justify-end">
          <AlertDialogCancel
            disabled={isBusy}
            className="h-11 rounded-lg px-5 text-sm font-bold"
          >
            Cancel
          </AlertDialogCancel>

          {usageCount > 0 && onDeactivate && (
            <Button
              type="button"
              variant="outline"
              onClick={onDeactivate}
              disabled={isBusy}
              className="h-11 gap-2 rounded-lg border-amber-500/50 px-5 text-sm font-bold text-amber-800 hover:bg-amber-100/50 dark:text-amber-300 dark:hover:bg-amber-950/50"
            >
              {isDeactivating ? (
                <Loader2 className="size-4.5 animate-spin" />
              ) : (
                <PowerOff className="size-4.5" />
              )}
              Deactivate Instead
            </Button>
          )}

          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              onConfirmDelete()
            }}
            disabled={isBusy}
            className="text-destructive-foreground h-11 gap-2 rounded-lg bg-destructive px-5 text-sm font-bold shadow-xs hover:bg-destructive/90"
          >
            {isDeleting ? (
              <Loader2 className="size-4.5 animate-spin" />
            ) : (
              <Trash2 className="size-4.5" />
            )}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
