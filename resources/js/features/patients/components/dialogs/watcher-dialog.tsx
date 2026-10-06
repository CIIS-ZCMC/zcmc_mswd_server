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
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useWatcherRelationshipTypes } from "@/features/cases/hooks/use-case-watchers"
import type { CaseWatcher } from "@/features/cases/types/watcher.types"
import type { PatientRecord } from "@/features/patients/types"
import type { CreateCaseWatcherPayload, UpdateCaseWatcherPayload } from "@/features/cases/api/case-watchers-api"

interface WatcherDialogProps {
  isOpen: boolean
  onClose: () => void
  patient?: Partial<PatientRecord> | null
  editingWatcher?: CaseWatcher | null
  onSave: (
    payload: CreateCaseWatcherPayload | UpdateCaseWatcherPayload,
    watcherId?: number,
  ) => Promise<void>
  isSubmitting?: boolean
}

export const WatcherDialog: React.FC<WatcherDialogProps> = ({
  isOpen,
  onClose,
  patient,
  editingWatcher,
  onSave,
  isSubmitting = false,
}) => {
  const { data: relationshipTypes = [], isLoading: isLoadingRelationships } =
    useWatcherRelationshipTypes()

  const [selectedDirectoryId, setSelectedDirectoryId] = useState<string>("new")
  const [formData, setFormData] = useState({
    name: "",
    relationship: "Spouse",
    contactNumber: "",
    address: "",
    isPrimary: false,
    isInformant: false,
    presentFrom: "",
    presentUntil: "",
    notes: "",
  })

  // Known contacts from patient record
  const knownContacts = patient?.watchers ?? []

  const [prevSyncKey, setPrevSyncKey] = useState<string | null>(null)
  const currentSyncKey = `${editingWatcher?.id ?? "new"}-${isOpen}-${relationshipTypes.length}`

  if (currentSyncKey !== prevSyncKey) {
    setPrevSyncKey(currentSyncKey)
    if (editingWatcher) {
      setSelectedDirectoryId(editingWatcher.patientWatcherId ? String(editingWatcher.patientWatcherId) : "new")
      setFormData({
        name: editingWatcher.fullName,
        relationship: editingWatcher.relationship || "Spouse",
        contactNumber: editingWatcher.contactNo || "",
        address: editingWatcher.address || "",
        isPrimary: editingWatcher.isPrimary,
        isInformant: editingWatcher.isInformant,
        presentFrom: editingWatcher.presentFrom ? editingWatcher.presentFrom.substring(0, 10) : "",
        presentUntil: editingWatcher.presentUntil ? editingWatcher.presentUntil.substring(0, 10) : "",
        notes: editingWatcher.notes || "",
      })
    } else {
      setSelectedDirectoryId("new")
      setFormData({
        name: "",
        relationship: relationshipTypes[0]?.name || "Spouse",
        contactNumber: patient?.contactNo || "",
        address: patient?.address || "",
        isPrimary: false,
        isInformant: false,
        presentFrom: "",
        presentUntil: "",
        notes: "",
      })
    }
  }

  const handleDirectorySelect = (contactId: string | null) => {
    if (!contactId) return
    setSelectedDirectoryId(contactId)
    if (contactId === "new") {
      setFormData((prev) => ({
        ...prev,
        name: "",
        contactNumber: patient?.contactNo || "",
        address: patient?.address || "",
      }))
    } else {
      const match = knownContacts.find((c) => String(c.id) === contactId)
      if (match) {
        setFormData((prev) => ({
          ...prev,
          name: match.fullName,
          relationship: match.relationship || prev.relationship,
          contactNumber: match.contactNo || prev.contactNumber,
        }))
      }
    }
  }

  const handleSave = async () => {
    if (!formData.name && selectedDirectoryId === "new") return

    if (editingWatcher) {
      const payload: UpdateCaseWatcherPayload = {
        name: formData.name,
        relationship: formData.relationship,
        contact_number: formData.contactNumber || null,
        address: formData.address || null,
        is_primary: formData.isPrimary,
        is_informant: formData.isInformant,
        present_from: formData.presentFrom || null,
        present_until: formData.presentUntil || null,
        notes: formData.notes || null,
      }
      await onSave(payload, Number(editingWatcher.id))
    } else {
      const payload: CreateCaseWatcherPayload = {
        patient_watcher_id: selectedDirectoryId !== "new" ? Number(selectedDirectoryId) : null,
        name: formData.name,
        relationship: formData.relationship,
        contact_number: formData.contactNumber || null,
        address: formData.address || null,
        is_primary: formData.isPrimary,
        is_informant: formData.isInformant,
        present_from: formData.presentFrom || null,
        present_until: formData.presentUntil || null,
        notes: formData.notes || null,
      }
      await onSave(payload)
    }

    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full max-w-lg overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {editingWatcher ? "Edit Case Watcher" : "Add Case Watcher"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {editingWatcher
              ? "Update watcher details for this admission episode."
              : "Register an authorized watcher or bystander for this admission case."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 text-sm">
          {/* Known Directory Picker (Create Mode Only) */}
          {!editingWatcher && knownContacts.length > 0 && (
            <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
              <Label className="text-xs font-bold text-foreground">
                Select from Known Patient Contacts
              </Label>
              <Select value={selectedDirectoryId} onValueChange={handleDirectorySelect}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Choose a known contact or enter new" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">+ Enter New Person</SelectItem>
                  {knownContacts.map((contact) => (
                    <SelectItem key={contact.id} value={String(contact.id)}>
                      {contact.fullName} ({contact.relationship})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Full Name */}
          <div>
            <Label className="text-xs font-semibold">Watcher Full Name *</Label>
            <Input
              placeholder="e.g. Juan San Juan"
              value={formData.name}
              disabled={selectedDirectoryId !== "new" && !editingWatcher}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="h-10 mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Relationship Select */}
            <div>
              <Label className="text-xs font-semibold">Relationship *</Label>
              {isLoadingRelationships ? (
                <Input placeholder="Loading relationships..." disabled className="h-10 mt-1" />
              ) : (
                <Select
                  value={formData.relationship}
                  onValueChange={(val) => val && setFormData({ ...formData, relationship: val })}
                >
                  <SelectTrigger className="h-10 mt-1">
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    {relationshipTypes.map((type) => (
                      <SelectItem key={type.id} value={type.name}>
                        {type.name}
                      </SelectItem>
                    ))}
                    {/* Fallback if list is empty or current value is custom */}
                    {!relationshipTypes.some((r) => r.name === formData.relationship) && (
                      <SelectItem value={formData.relationship}>{formData.relationship}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Contact Number */}
            <div>
              <Label className="text-xs font-semibold">Contact Number</Label>
              <Input
                placeholder="+63 9XX XXX XXXX"
                value={formData.contactNumber}
                onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                className="h-10 mt-1"
              />
            </div>
          </div>

          {/* Role Switches */}
          <div className="grid grid-cols-2 gap-4 rounded-lg border border-border p-3 bg-muted/20">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-bold">Primary Watcher</Label>
                <p className="text-[11px] text-muted-foreground">Main contact for patient</p>
              </div>
              <Switch
                checked={formData.isPrimary}
                onCheckedChange={(checked) => setFormData({ ...formData, isPrimary: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-bold">Informant</Label>
                <p className="text-[11px] text-muted-foreground">Provided case info</p>
              </div>
              <Switch
                checked={formData.isInformant}
                onCheckedChange={(checked) => setFormData({ ...formData, isInformant: checked })}
              />
            </div>
          </div>

          {/* Presence Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Present From</Label>
              <Input
                type="date"
                value={formData.presentFrom}
                onChange={(e) => setFormData({ ...formData, presentFrom: e.target.value })}
                className="h-10 mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Present Until</Label>
              <Input
                type="date"
                value={formData.presentUntil}
                onChange={(e) => setFormData({ ...formData, presentUntil: e.target.value })}
                className="h-10 mt-1"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs font-semibold">Notes / Remarks</Label>
            <Textarea
              placeholder="Optional remarks regarding this watcher..."
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
          <Button
            size="default"
            className="font-bold px-6"
            onClick={handleSave}
            disabled={isSubmitting || (!formData.name && selectedDirectoryId === "new")}
          >
            {isSubmitting ? "Saving..." : editingWatcher ? "Update Watcher" : "Save Watcher"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


