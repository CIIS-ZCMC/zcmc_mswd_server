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
import { PsgcAddressFields } from "@/features/reference/components/psgc-address-fields"
import {
  isPsgcAddressComplete,
  isPsgcAddressEmpty,
  legacyAddressText,
  toPsgcPayload,
} from "@/features/reference/lib/psgc-address"
import {
  EMPTY_PSGC_ADDRESS,
  type PsgcAddressValue,
} from "@/features/reference/types/psgc.types"
import {
  extractSuffixFromNameParts,
  NAME_SUFFIX_OPTIONS,
  NONE_SUFFIX_VALUE,
  normalizeNameSuffix,
} from "@/lib/name-suffix"
import {
  extract10DigitPhPhone,
  formatPhPhonePayload,
  isValidPhPhone10,
} from "@/lib/ph-phone"
import type { CreateWatcherPayload } from "../../api/patients-api"
import type { Watcher } from "../../types/watcher.types"

interface WatcherDialogProps {
  isOpen: boolean
  onClose: () => void
  /** The watcher being edited; null to add a new one. */
  editingWatcher?: Watcher | null
  /** Prefilled for a new watcher, since family often shares the patient's contact and address. */
  defaults?: { contactNo?: string; address?: PsgcAddressValue }
  onSave: (payload: CreateWatcherPayload, watcherId?: number) => Promise<void>
  isSubmitting?: boolean
}

function parseWatcherFullName(fullName: string): {
  lastName: string
  firstName: string
  middleName: string
  extensionName: string
} {
  if (!fullName)
    return { lastName: "", firstName: "", middleName: "", extensionName: "" }
  const trimmed = fullName.trim()
  if (trimmed.includes(",")) {
    const [lastPart, restPart] = trimmed.split(",")
    const rawRest = (restPart || "").trim().split(/\s+/).filter(Boolean)
    const { remaining: rest, extensionName } =
      extractSuffixFromNameParts(rawRest)
    return {
      lastName: lastPart.trim(),
      firstName: rest[0] || "",
      middleName: rest.slice(1).join(" "),
      extensionName,
    }
  }
  const rawParts = trimmed.split(/\s+/).filter(Boolean)
  const { remaining: parts, extensionName } =
    extractSuffixFromNameParts(rawParts)
  if (parts.length === 1) {
    return {
      lastName: parts[0],
      firstName: "",
      middleName: "",
      extensionName,
    }
  }
  if (parts.length === 2) {
    return {
      firstName: parts[0],
      middleName: "",
      lastName: parts[1],
      extensionName,
    }
  }
  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(" "),
    lastName: parts[parts.length - 1],
    extensionName,
  }
}

/**
 * Who a watcher is: name (last, first, middle), relationship, contact number,
 * address and notes.
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

  const relationshipMap = React.useMemo(() => {
    const map: Record<string, string> = {}
    for (const t of relationshipTypes) {
      map[t.code] = t.name
    }
    return map
  }, [relationshipTypes])

  const formatRelationshipLabel = React.useCallback(
    (code: string | null) => {
      if (!code) return ""
      const match = relationshipMap[code]
      if (match) {
        return match.replace(/_/g, " ")
      }
      return code
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    },
    [relationshipMap]
  )

  const [formData, setFormData] = useState({
    lastName: "",
    firstName: "",
    middleName: "",
    extensionName: "",
    relationshipCode: "",
    contactNumber: "",
    address: { ...EMPTY_PSGC_ADDRESS } as PsgcAddressValue,
    notes: "",
  })
  const [error, setError] = useState<string | null>(null)

  // Reset the form whenever the dialog opens for a different watcher.
  const [prevSyncKey, setPrevSyncKey] = useState<string | null>(null)
  const currentSyncKey = `${editingWatcher?.id ?? "new"}-${isOpen}-${relationshipTypes.length}`

  if (currentSyncKey !== prevSyncKey) {
    setPrevSyncKey(currentSyncKey)
    setError(null)
    if (editingWatcher) {
      const parsed = parseWatcherFullName(editingWatcher.fullName)
      setFormData({
        lastName: editingWatcher.lastName || parsed.lastName,
        firstName: editingWatcher.firstName || parsed.firstName,
        middleName: editingWatcher.middleName || parsed.middleName,
        extensionName: normalizeNameSuffix(
          editingWatcher.extensionName || parsed.extensionName
        ),
        relationshipCode: editingWatcher.relationshipCode,
        contactNumber: extract10DigitPhPhone(editingWatcher.contactNo),
        address: editingWatcher.addressPsgc ?? { ...EMPTY_PSGC_ADDRESS },
        notes: editingWatcher.notes,
      })
    } else {
      setFormData({
        lastName: "",
        firstName: "",
        middleName: "",
        extensionName: "",
        relationshipCode: relationshipTypes[0]?.code ?? "",
        contactNumber: extract10DigitPhPhone(defaults?.contactNo ?? ""),
        address: defaults?.address ?? { ...EMPTY_PSGC_ADDRESS },
        notes: "",
      })
    }
  }

  // The address is picked from PSGC. A watcher still on free text can be
  // edited without touching it; the old text stays until an area is picked.
  const keepsOldAddress =
    !!editingWatcher &&
    editingWatcher.address.trim() !== "" &&
    isPsgcAddressEmpty(formData.address)
  const addressOk = isPsgcAddressComplete(formData.address) || keepsOldAddress

  const canSave =
    formData.lastName.trim() !== "" &&
    formData.firstName.trim() !== "" &&
    formData.relationshipCode !== "" &&
    isValidPhPhone10(formData.contactNumber, true) &&
    addressOk

  const handleSave = async () => {
    if (!canSave) return

    try {
      setError(null)
      const ext = normalizeNameSuffix(formData.extensionName)
      const fullName = [
        formData.firstName.trim(),
        formData.middleName.trim(),
        formData.lastName.trim(),
        ext,
      ]
        .filter(Boolean)
        .join(" ")

      const formattedContact = formatPhPhonePayload(formData.contactNumber)

      await onSave(
        {
          name: fullName,
          first_name: formData.firstName.trim(),
          middle_name: formData.middleName.trim() || null,
          last_name: formData.lastName.trim(),
          extension_name: ext || null,
          relationship_code: formData.relationshipCode,
          contact_number: formattedContact,
          ...(isPsgcAddressComplete(formData.address)
            ? toPsgcPayload("address", formData.address)
            : {}),
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

          {/* Four Name Inputs: Last Name, First Name, Middle Name, Extension */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs font-semibold">Last Name *</Label>
              <Input
                placeholder="e.g. San Juan"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="mt-1 h-10"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">First Name *</Label>
              <Input
                placeholder="e.g. Juan"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="mt-1 h-10"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Middle Name</Label>
              <Input
                placeholder="e.g. Santos"
                value={formData.middleName}
                onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                className="mt-1 h-10"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Suffix</Label>
              <Select
                value={formData.extensionName || NONE_SUFFIX_VALUE}
                onValueChange={(val) =>
                  setFormData({
                    ...formData,
                    extensionName: !val || val === NONE_SUFFIX_VALUE ? "" : val,
                  })
                }
              >
                <SelectTrigger className="mt-1 h-10 w-full">
                  <SelectValue placeholder="None">
                    {(val: string) =>
                      !val || val === NONE_SUFFIX_VALUE ? "None" : val
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_SUFFIX_VALUE}>None</SelectItem>
                  {NAME_SUFFIX_OPTIONS.map((suffix) => (
                    <SelectItem key={suffix} value={suffix}>
                      {suffix}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    <SelectValue placeholder="Select relationship">
                      {(val: string | null) =>
                        val ? formatRelationshipLabel(val) : "Select relationship"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {relationshipTypes.map((type) => (
                      <SelectItem key={type.id} value={type.code}>
                        {formatRelationshipLabel(type.code) || type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <Label className="text-xs font-semibold">Contact Number *</Label>
              <div className="mt-1 flex items-stretch">
                <div className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted/40 px-3 text-xs font-bold text-muted-foreground select-none">
                  +63 -
                </div>
                <Input
                  type="tel"
                  inputMode="numeric"
                  placeholder="9XX XXX XXXX"
                  maxLength={10}
                  value={formData.contactNumber}
                  onChange={(e) => {
                    const cleaned = extract10DigitPhPhone(e.target.value)
                    setFormData({ ...formData, contactNumber: cleaned })
                  }}
                  className="h-10 rounded-l-none font-mono tracking-wider"
                />
              </div>
              {formData.contactNumber.length > 0 && !isValidPhPhone10(formData.contactNumber, true) && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  10-digit PH mobile number starting with 9 required ({formData.contactNumber.length}/10)
                </p>
              )}
            </div>
          </div>

          <PsgcAddressFields
            label="Address *"
            value={formData.address}
            onChange={(address) => setFormData({ ...formData, address })}
            legacyText={legacyAddressText(editingWatcher?.address, editingWatcher?.addressPsgc)}
            required
            disabled={isSubmitting}
          />

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
