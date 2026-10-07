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
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription
            render={<div />}
            className="space-y-3 pt-2 text-sm"
          >
            <p>
              Are you sure you want to delete{" "}
              <strong className="text-foreground">"{itemName}"</strong>?
            </p>

            {usageCount > 0 && (
              <Alert
                variant="destructive"
                className="border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200"
              >
                <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
                <AlertTitle className="text-xs font-bold">
                  Item is currently in use
                </AlertTitle>
                <AlertDescription className="mt-1 text-xs leading-relaxed">
                  This item is linked to <strong>{usageCount}</strong>{" "}
                  record(s). Deleting it may cause historical records to lose
                  their reference. We strongly recommend deactivating it
                  instead.
                </AlertDescription>
              </Alert>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-col gap-2 pt-2 sm:flex-row">
          <AlertDialogCancel disabled={isBusy}>Cancel</AlertDialogCancel>

          {usageCount > 0 && onDeactivate && (
            <Button
              type="button"
              variant="outline"
              onClick={onDeactivate}
              disabled={isBusy}
              className="border-amber-500/40 text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/40"
            >
              {isDeactivating ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              ) : (
                <PowerOff className="mr-1.5 size-4" />
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
            className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
          >
            {isDeleting ? (
              <Loader2 className="mr-1.5 size-4 animate-spin" />
            ) : (
              <Trash2 className="mr-1.5 size-4" />
            )}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
