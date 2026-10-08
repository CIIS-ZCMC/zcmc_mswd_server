import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { ApiError } from "@/lib/api-client"
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import {
  useCreateSignatory,
  useDeleteSignatory,
  useSignatories,
  useUpdateSignatory,
} from "../hooks/use-library"
import type { Signatory } from "../types"
import { SIGNATORY_ROLES } from "../lib/library-tabs"

interface SignatoriesPanelProps {
  canManage: boolean
}

/**
 * Officers printed on MSWD forms. Not a LookupTable: a signatory has a multi-line
 * title and a role, and each role has at most one active officer (the server
 * rejects a second, and the message shows on the Active switch).
 */
export const SignatoriesPanel: React.FC<SignatoriesPanelProps> = ({
  canManage,
}) => {
  const { data: signatories = [], isLoading } = useSignatories()
  const deleteMut = useDeleteSignatory()
  const [editing, setEditing] = useState<Signatory | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<Signatory | null>(null)

  const openForm = (item: Signatory | null) => {
    setEditing(item)
    setIsFormOpen(true)
  }

  return (
    <div className="space-y-3">
      {canManage && (
        <div className="flex justify-end">
          <Button
            size="sm"
            className="gap-1.5 font-bold"
            onClick={() => openForm(null)}
          >
            <Plus className="size-4" /> Add Signatory
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border/80 bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              {canManage && (
                <TableHead className="text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <Skeleton className="h-10 w-full" />
                </TableCell>
              </TableRow>
            ) : signatories.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  No signatories yet. Printed forms leave the approver blank.
                </TableCell>
              </TableRow>
            ) : (
              signatories.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-semibold">{s.name}</TableCell>
                  <TableCell className="text-xs whitespace-pre-line text-muted-foreground">
                    {s.title || "—"}
                  </TableCell>
                  <TableCell className="text-xs">{s.roleLabel}</TableCell>
                  <TableCell>
                    <Badge variant={s.isActive ? "default" : "outline"}>
                      {s.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="icon-sm"
                          aria-label={`Edit ${s.name}`}
                          onClick={() => openForm(s)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          aria-label={`Delete ${s.name}`}
                          onClick={() => setDeleting(s)}
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {isFormOpen && (
        <SignatoryFormDialog
          signatory={editing}
          onClose={() => setIsFormOpen(false)}
        />
      )}

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete signatory?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.name} will no longer print on forms. Forms already
              printed are unaffected. To hand over to a new officer, you can
              also just deactivate them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMut.isPending}
              onClick={async () => {
                if (!deleting) return
                await deleteMut.mutateAsync(deleting.id)
                setDeleting(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

interface SignatoryFormDialogProps {
  signatory: Signatory | null
  onClose: () => void
}

const SignatoryFormDialog: React.FC<SignatoryFormDialogProps> = ({
  signatory,
  onClose,
}) => {
  const createMut = useCreateSignatory()
  const updateMut = useUpdateSignatory()
  const [name, setName] = useState(signatory?.name ?? "")
  const [title, setTitle] = useState(signatory?.title ?? "")
  const [role, setRole] = useState(
    signatory?.role ?? Object.keys(SIGNATORY_ROLES)[0]
  )
  const [isActive, setIsActive] = useState(signatory?.isActive ?? true)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [generalError, setGeneralError] = useState<string | null>(null)
  const isSubmitting = createMut.isPending || updateMut.isPending

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setGeneralError(null)
    const input = { name, title, role, isActive }

    try {
      if (signatory) {
        await updateMut.mutateAsync({ id: signatory.id, input })
      } else {
        await createMut.mutateAsync(input)
      }
      onClose()
    } catch (err: unknown) {
      if (err instanceof ApiError && err.errors) {
        setErrors(err.errors)
      } else {
        setGeneralError(
          err instanceof Error ? err.message : "Failed to save the signatory."
        )
      }
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              {signatory ? "Edit Signatory" : "Add Signatory"}
            </DialogTitle>
            <DialogDescription>
              The name and title print on forms for this role.
            </DialogDescription>
          </DialogHeader>

          {generalError && (
            <Alert variant="destructive">
              <AlertDescription>{generalError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="signatory-name">Name</Label>
            <Input
              id="signatory-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. DR. JUAN DELA CRUZ, MPH"
              required
            />
            {errors.name && (
              <p className="text-xs font-semibold text-destructive">
                {errors.name[0]}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="signatory-title">Title</Label>
            <Textarea
              id="signatory-title"
              rows={2}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. OIC Designate - Chief of Allied Health Professional Services"
            />
            <p className="text-xs text-muted-foreground">
              Printed under the name. Line breaks are kept.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="signatory-role">Role</Label>
            <Select value={role} onValueChange={(v) => v && setRole(v)}>
              <SelectTrigger id="signatory-role">
                <SelectValue>
                  {(value: string | null) =>
                    value ? (SIGNATORY_ROLES[value] ?? value) : "Select role"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SIGNATORY_ROLES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="signatory-active">Active</Label>
              <p className="text-xs text-muted-foreground">
                One active signatory per role.
              </p>
              {errors.is_active && (
                <p className="mt-1 text-xs font-semibold text-destructive">
                  {errors.is_active[0]}
                </p>
              )}
            </div>
            <Switch
              id="signatory-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-1.5">
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
