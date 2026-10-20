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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useWatcherRelationshipTypes } from "@/features/cases/hooks/use-case-watchers"
import type { CreateWatcherPayload } from "../../api/patients-api"
import type { Watcher } from "../../types/watcher.types"

interface WatcherDialogProps {
  isOpen: boolean
  onClose: () => void
  /** The watcher being edited; null to add a new one. */
  editingWatcher?: Watcher | null
  /** Prefilled for a new watcher, since family often shares the patient's contact and address. */
  defaults?: { contactNo?: string; address?: string }
  onSave: (payload: CreateWatcherPayload, watcherId?: number) => Promise<void>
  isSubmitting?: boolean
}

/**
 * Who a watcher is: name, relationship, contact number, address and notes. It
 * says nothing about any case; assigning the watcher to a case (primary, pass,
 * presence) is the assign dialog's job.
 */
export const WatcherDialog: React.FC<WatcherDialogProps> = ({
  isOpen,
  onClose,
  editingWatcher,
  defaults,
  onSave,
  isSubmitting = false,
}) => {
  const { data: relationshipTypes = [], isLoading: isLoadingRelationships } =
    useWatcherRelationshipTypes()

  const [formData, setFormData] = useState({
    name: "",
    relationshipCode: "",
    contactNumber: "",
    address: "",
    notes: "",
  })
  const [error, setError] = useState<string | null>(null)

  // Reset the form whenever the dialog opens for a different watcher.
  const [prevSyncKey, setPrevSyncKey] = useState<string | null>(null)
  const currentSyncKey = `${editingWatcher?.id ?? "new"}-${isOpen}-${relationshipTypes.length}`

  if (currentSyncKey !== prevSyncKey) {
    setPrevSyncKey(currentSyncKey)
    setError(null)
    setFormData(
      editingWatcher
        ? {
            name: editingWatcher.fullName,
            relationshipCode: editingWatcher.relationshipCode,
            contactNumber: editingWatcher.contactNo,
            address: editingWatcher.address,
            notes: editingWatcher.notes,
          }
        : {
            name: "",
            relationshipCode: relationshipTypes[0]?.code ?? "",
            contactNumber: defaults?.contactNo ?? "",
            address: defaults?.address ?? "",
            notes: "",
          }
    )
  }

  const canSave = formData.name.trim() !== "" && formData.relationshipCode !== ""

  const handleSave = async () => {
    if (!canSave) return

    try {
      setError(null)
      await onSave(
        {
          name: formData.name.trim(),
          relationship_code: formData.relationshipCode,
          contact_number: formData.contactNumber.trim() || null,
          address: formData.address.trim() || null,
          notes: formData.notes.trim() || null,
        },
        editingWatcher ? Number(editingWatcher.id) : undefined
      )
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save watcher")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] w-full max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {editingWatcher ? "Edit Watcher" : "Add Watcher"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {editingWatcher
              ? "Changes show on every case this watcher is assigned to."
              : "Register someone who watches over this patient. Assign them to an open case afterwards."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 text-sm">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </div>
          )}

          <div>
            <Label className="text-xs font-semibold">Full Name *</Label>
            <Input
              placeholder="e.g. Juan San Juan"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 h-10"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Relationship *</Label>
              {isLoadingRelationships ? (
                <Input placeholder="Loading relationships..." disabled className="mt-1 h-10" />
              ) : (
                <Select
                  value={formData.relationshipCode}
                  onValueChange={(code) => code && setFormData({ ...formData, relationshipCode: code })}
                >
                  <SelectTrigger className="mt-1 h-10">
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    {relationshipTypes.map((type) => (
                      <SelectItem key={type.id} value={type.code}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <Label className="text-xs font-semibold">Contact Number</Label>
              <Input
                placeholder="+63 9XX XXX XXXX"
                value={formData.contactNumber}
                onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                className="mt-1 h-10"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold">Address</Label>
            <Input
              placeholder="Street, barangay, city"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="mt-1 h-10"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold">Notes / Remarks</Label>
            <Textarea
              placeholder="Optional remarks about this watcher..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="mt-1 min-h-[60px] text-sm"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button className="px-6 font-bold" onClick={handleSave} disabled={isSubmitting || !canSave}>
            {isSubmitting ? "Saving..." : editingWatcher ? "Update Watcher" : "Save Watcher"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
