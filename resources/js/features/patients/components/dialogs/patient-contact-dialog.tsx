import React, { useState, useEffect } from "react"
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
import { Spinner } from "@/components/ui/spinner"
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
import type { UpdatePatientBackgroundPayload } from "../../api/patients-api"
import type { PatientRecord } from "../../types"

interface PatientContactDialogProps {
  isOpen: boolean
  onClose: () => void
  patient: PatientRecord
  onSave: (payload: UpdatePatientBackgroundPayload) => void
  isSaving: boolean
}

/**
 * What to send for one address. A complete address is saved; clearing one that
 * was picked from PSGC clears it; an address still in free text that nobody
 * touched is left alone.
 */
function addressPayload(
  base: string,
  value: PsgcAddressValue,
  original: PsgcAddressValue
): Record<string, string | null> {
  if (isPsgcAddressComplete(value)) return toPsgcPayload(base, value)
  if (isPsgcAddressEmpty(value) && original.cityCode !== null) {
    return toPsgcPayload(base, value)
  }
  return {}
}

/** Complete, or left empty: a half-picked address cannot be saved. */
const isSavable = (value: PsgcAddressValue) =>
  isPsgcAddressComplete(value) || isPsgcAddressEmpty(value)

export const PatientContactDialog: React.FC<PatientContactDialogProps> = ({
  isOpen,
  onClose,
  patient,
  onSave,
  isSaving,
}) => {
  const originalPresent = patient.presentAddressPsgc ?? EMPTY_PSGC_ADDRESS
  const originalPermanent = patient.permanentAddressPsgc ?? EMPTY_PSGC_ADDRESS

  const [contactNumber, setContactNumber] = useState(patient.contactNo ?? "")
  const [present, setPresent] = useState<PsgcAddressValue>(originalPresent)
  const [permanent, setPermanent] = useState<PsgcAddressValue>(originalPermanent)

  useEffect(() => {
    if (isOpen) {
      setContactNumber(patient.contactNo ?? "")
      setPresent(patient.presentAddressPsgc ?? EMPTY_PSGC_ADDRESS)
      setPermanent(patient.permanentAddressPsgc ?? EMPTY_PSGC_ADDRESS)
    }
  }, [isOpen, patient])

  const canSave = isSavable(present) && isSavable(permanent)

  const handleSave = () => {
    onSave({
      contact_number: contactNumber || undefined,
      ...addressPayload("present_address", present, originalPresent),
      ...addressPayload("permanent_address", permanent, originalPermanent),
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full max-w-3xl p-7 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Edit Contact &amp; Residence Information</DialogTitle>
          <DialogDescription className="text-sm">
            Update contact numbers and addresses recorded for {patient.fullName}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4 text-base">
          <div>
            <Label className="text-sm font-bold">Contact Number</Label>
            <Input
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              className="h-11 text-base mt-1 font-mono"
              placeholder="e.g. 09171234567"
            />
          </div>

          <PsgcAddressFields
            label="Present Address"
            value={present}
            onChange={setPresent}
            legacyText={legacyAddressText(patient.presentAddress ?? patient.address, originalPresent)}
            disabled={isSaving}
          />

          <div className="flex flex-col gap-2.5 border-t pt-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium">Permanent Address</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isSaving || isPsgcAddressEmpty(present)}
                onClick={() => setPermanent({ ...present })}
              >
                Same as present address
              </Button>
            </div>
            <PsgcAddressFields
              value={permanent}
              onChange={setPermanent}
              legacyText={legacyAddressText(patient.permanentAddress, originalPermanent)}
              disabled={isSaving}
            />
          </div>

          {!canSave && (
            <p className="text-xs text-destructive">
              Pick both a city or municipality and a barangay for each address, or
              clear it.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            size="lg"
            className="h-11 text-base font-bold px-8"
            disabled={isSaving || !canSave}
            onClick={handleSave}
          >
            {isSaving ? <Spinner className="size-5" /> : "Save Contact Info"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
