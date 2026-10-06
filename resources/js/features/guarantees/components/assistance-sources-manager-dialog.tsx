import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertCircle,
  AlertTriangle,
  Check,
  Edit2,
  Loader2,
  Plus,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react"
import { usePermission } from "@/features/auth/hooks/use-permission"
import { ApiError } from "@/lib/api-client"
import {
  useAssistanceSources,
  useCreateAssistanceSource,
  useDeleteAssistanceSource,
  useUpdateAssistanceSource,
} from "../hooks/use-assistance-sources"
import type { AssistanceSource } from "../types"

interface AssistanceSourcesManagerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const AssistanceSourcesManagerDialog: React.FC<
  AssistanceSourcesManagerDialogProps
> = ({ open, onOpenChange }) => {
  const canManage = usePermission("guarantee.create")

  const { data: sources = [], isLoading } = useAssistanceSources(false, open)
  const createMutation = useCreateAssistanceSource()
  const updateMutation = useUpdateAssistanceSource()
  const deleteMutation = useDeleteAssistanceSource()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingSource, setEditingSource] = useState<AssistanceSource | null>(
    null
  )
  const [deletingSource, setDeletingSource] = useState<AssistanceSource | null>(
    null
  )

  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [requiresSpecify, setRequiresSpecify] = useState(false)
  const [isActive, setIsActive] = useState(true)

  const [serverErrors, setServerErrors] = useState<Record<string, string[]>>({})
  const [generalError, setGeneralError] = useState<string | null>(null)

  const isPending = createMutation.isPending || updateMutation.isPending

  const resetForm = () => {
    setEditingSource(null)
    setName("")
    setCode("")
    setRequiresSpecify(false)
    setIsActive(true)
    setServerErrors({})
    setGeneralError(null)
    setIsFormOpen(false)
  }

  const handleStartAdd = () => {
    resetForm()
    setIsFormOpen(true)
  }

  const handleStartEdit = (src: AssistanceSource) => {
    setEditingSource(src)
    setName(src.name)
    setCode(src.code ?? "")
    setRequiresSpecify(src.requiresSpecify)
    setIsActive(src.isActive)
    setServerErrors({})
    setGeneralError(null)
    setIsFormOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerErrors({})
    setGeneralError(null)

    const trimmedName = name.trim()
    if (!trimmedName) {
      setServerErrors({ name: ["The name field is required."] })
      return
    }

    const payload = {
      name: trimmedName,
      code: code.trim() || null,
      requiresSpecify,
      isActive,
    }

    try {
      if (editingSource) {
        await updateMutation.mutateAsync({
          id: editingSource.id,
          input: payload,
        })
      } else {
        await createMutation.mutateAsync(payload)
      }
      resetForm()
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        setServerErrors(err.errors)
      } else if (err instanceof Error) {
        setGeneralError(err.message)
      } else {
        setGeneralError(
          "An unexpected error occurred while saving the breakdown type."
        )
      }
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingSource) return
    try {
      await deleteMutation.mutateAsync(deletingSource.id)
      setDeletingSource(null)
    } catch {
      // The dialog stays open and shows deleteMutation.error.
    }
  }

  if (!canManage) {
    return null
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            resetForm()
          }
          onOpenChange(isOpen)
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto p-6">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <DialogTitle className="flex items-center gap-2 text-lg font-bold text-primary sm:text-xl">
                  <SlidersHorizontal className="size-5 shrink-0 text-primary" />
                  Manage Breakdown Types
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground sm:text-sm">
                  Configure assistance sources and breakdown types used in
                  guarantor coverage.
                </DialogDescription>
              </div>

              {!isFormOpen && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleStartAdd}
                  className="h-8 gap-1.5 px-3 text-xs font-bold shadow-2xs"
                >
                  <Plus className="size-3.5" />
                  Add Type
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Inline Add / Edit Form Card */}
            {isFormOpen && (
              <Card className="border border-primary/40 bg-muted/20 shadow-xs">
                <CardHeader className="border-b bg-muted/40 px-4 py-3">
                  <CardTitle className="flex items-center justify-between text-xs font-bold text-foreground sm:text-sm">
                    <span>
                      {editingSource
                        ? `Edit Type: ${editingSource.name}`
                        : "Add New Breakdown Type"}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={resetForm}
                      disabled={isPending}
                      className="size-6 text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <form onSubmit={handleSave} className="space-y-4">
                    {generalError && (
                      <Alert variant="destructive" className="py-2 text-xs">
                        <AlertCircle className="size-4" />
                        <AlertDescription>{generalError}</AlertDescription>
                      </Alert>
                    )}

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {/* Name */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">
                          Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. City Mayor Assistance"
                          disabled={isPending}
                          className="h-9 text-xs"
                          autoFocus
                        />
                        {serverErrors.name?.map((msg, idx) => (
                          <p
                            key={idx}
                            className="text-[11px] font-medium text-destructive"
                          >
                            {msg}
                          </p>
                        ))}
                      </div>

                      {/* Code */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">
                          Code{" "}
                          <span className="text-[10px] text-muted-foreground">
                            (Optional / Unique)
                          </span>
                        </Label>
                        <Input
                          value={code}
                          onChange={(e) => setCode(e.target.value)}
                          placeholder="e.g. CITY_MAYOR"
                          disabled={isPending}
                          className="h-9 font-mono text-xs"
                        />
                        {serverErrors.code?.map((msg, idx) => (
                          <p
                            key={idx}
                            className="text-[11px] font-medium text-destructive"
                          >
                            {msg}
                          </p>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 pt-1 sm:grid-cols-2">
                      {/* Requires Specify Switch */}
                      <div className="flex items-center justify-between rounded-lg border bg-background p-3">
                        <div className="space-y-0.5">
                          <Label className="cursor-pointer text-xs font-semibold text-foreground">
                            Requires Specify
                          </Label>
                          <p className="text-[11px] text-muted-foreground">
                            Prompts for specific details (e.g.
                            &quot;Others&quot;).
                          </p>
                        </div>
                        <Switch
                          checked={requiresSpecify}
                          onCheckedChange={setRequiresSpecify}
                          disabled={isPending}
                        />
                      </div>

                      {/* Active Switch */}
                      <div className="flex items-center justify-between rounded-lg border bg-background p-3">
                        <div className="space-y-0.5">
                          <Label className="cursor-pointer text-xs font-semibold text-foreground">
                            Active Status
                          </Label>
                          <p className="text-[11px] text-muted-foreground">
                            Active types can be selected for new guarantees.
                          </p>
                        </div>
                        <Switch
                          checked={isActive}
                          onCheckedChange={setIsActive}
                          disabled={isPending}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={resetForm}
                        disabled={isPending}
                        className="h-8 text-xs font-semibold"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={isPending}
                        className="h-8 gap-1.5 px-3.5 text-xs font-bold shadow-2xs"
                      >
                        {isPending ? (
                          <>
                            <Loader2 className="size-3.5 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Check className="size-3.5" />
                            {editingSource ? "Update Type" : "Save Type"}
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Types Table */}
            {isLoading ? (
              <div className="space-y-2 py-4">
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-12 w-full rounded-md" />
                <Skeleton className="h-12 w-full rounded-md" />
              </div>
            ) : sources.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-muted/10 py-8 text-center text-xs font-medium text-muted-foreground sm:text-sm">
                No breakdown types defined yet. Click &quot;Add Type&quot; to
                create one.
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="text-xs font-bold text-foreground">
                        Name
                      </TableHead>
                      <TableHead className="text-xs font-bold text-foreground">
                        Code
                      </TableHead>
                      <TableHead className="text-xs font-bold text-foreground">
                        Requires Specify
                      </TableHead>
                      <TableHead className="text-xs font-bold text-foreground">
                        Status
                      </TableHead>
                      <TableHead className="text-xs font-bold text-foreground">
                        Used In
                      </TableHead>
                      <TableHead className="text-right text-xs font-bold text-foreground">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sources.map((src) => (
                      <TableRow
                        key={src.id}
                        className="transition-colors hover:bg-muted/30"
                      >
                        <TableCell className="text-xs font-bold text-foreground sm:text-sm">
                          {src.name}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {src.code ? (
                            <span className="rounded bg-muted px-1.5 py-0.5 font-semibold text-foreground">
                              {src.code}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {src.requiresSpecify ? (
                            <Badge
                              variant="secondary"
                              className="bg-blue-500/10 text-blue-700 dark:text-blue-300"
                            >
                              Yes
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">No</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {src.isActive ? (
                            <Badge
                              variant="secondary"
                              className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            >
                              Active
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-muted-foreground"
                            >
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-muted-foreground">
                          {src.usageCount > 0 ? (
                            <span className="font-semibold text-foreground">
                              {src.usageCount}{" "}
                              {src.usageCount === 1 ? "line" : "lines"}
                            </span>
                          ) : (
                            "0 lines"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleStartEdit(src)}
                              className="size-7 text-muted-foreground hover:text-foreground"
                              title="Edit breakdown type"
                            >
                              <Edit2 className="size-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingSource(src)}
                              className="size-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              title="Delete breakdown type"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={Boolean(deletingSource)}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setDeletingSource(null)
            deleteMutation.reset()
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              Delete Breakdown Type
            </AlertDialogTitle>
            <AlertDialogDescription render={<div />}>
              <div className="space-y-3 pt-1 text-sm text-muted-foreground">
                <p>
                  Are you sure you want to delete the breakdown type{" "}
                  <strong className="text-foreground">
                    {deletingSource?.name}
                  </strong>
                  ?
                </p>

                {deletingSource && deletingSource.usageCount > 0 && (
                  <div className="space-y-1 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
                    <p className="flex items-center gap-1.5 font-bold">
                      <AlertCircle className="size-4 text-amber-600 dark:text-amber-400" />
                      Warning: Breakdown type is currently in use
                    </p>
                    <p>
                      This source is referenced by{" "}
                      <strong>{deletingSource.usageCount}</strong> guarantee
                      breakdown line(s). Existing records will retain the name,
                      but new records will not be able to select it. Consider
                      deactivating it instead if you want to prevent future
                      selection without deleting.
                    </p>
                  </div>
                )}

                {deleteMutation.error && (
                  <p className="text-xs font-medium text-destructive">
                    {deleteMutation.error.message}
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="text-destructive-foreground bg-destructive font-bold hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Type"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
