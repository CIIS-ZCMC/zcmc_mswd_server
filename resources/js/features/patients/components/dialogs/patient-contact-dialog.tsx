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
import {
  extract10DigitPhPhone,
  formatPhPhonePayload,
  isValidPhPhone10,
} from "@/lib/ph-phone"
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

  const [contactNumber, setContactNumber] = useState(() =>
    extract10DigitPhPhone(patient.contactNo)
  )
  const [present, setPresent] = useState<PsgcAddressValue>(originalPresent)
  const [permanent, setPermanent] = useState<PsgcAddressValue>(originalPermanent)

  useEffect(() => {
    if (isOpen) {
      setContactNumber(extract10DigitPhPhone(patient.contactNo))
      setPresent(patient.presentAddressPsgc ?? EMPTY_PSGC_ADDRESS)
      setPermanent(patient.permanentAddressPsgc ?? EMPTY_PSGC_ADDRESS)
    }
  }, [isOpen, patient])

  const contactOk = isValidPhPhone10(contactNumber, false)
  const canSave = contactOk && isSavable(present) && isSavable(permanent)

  const handleSave = () => {
    if (!canSave) return
    onSave({
      contact_number: contactNumber ? formatPhPhonePayload(contactNumber) : undefined,
      ...addressPayload("present_address", present, originalPresent),
      ...addressPayload("permanent_address", permanent, originalPermanent),
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full max-w-3xl rounded-[20px] p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[18px] font-bold text-[#0c2a5b] dark:text-foreground">Edit Contact &amp; Residence Information</DialogTitle>
          <DialogDescription className="text-[12px] text-[#5b6678] dark:text-muted-foreground">
            Update contact numbers and addresses recorded for {patient.fullName}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-3 text-[13px]">
          <div>
            <Label className="text-[12px] font-semibold text-[#5b6678] dark:text-muted-foreground">Contact Number</Label>
            <div className="mt-1 flex items-stretch">
              <div className="inline-flex items-center rounded-l-[10px] border border-r-0 border-[#c6e8ee] bg-muted/40 px-3 text-[12px] font-semibold text-[#5b6678] select-none">
                +63 -
              </div>
              <Input
                type="tel"
                inputMode="numeric"
                placeholder="9XX XXX XXXX"
                maxLength={10}
                value={contactNumber}
                onChange={(e) =>
                  setContactNumber(extract10DigitPhPhone(e.target.value))
                }
                className="h-[40px] rounded-l-none rounded-r-[10px] border-[#c6e8ee] font-mono text-[13px] font-medium tracking-wider text-[#1b2433] dark:text-foreground"
              />
            </div>
            {contactNumber.length > 0 && !contactOk && (
              <p className="mt-1 text-[11px] text-destructive">
                10-digit PH mobile number starting with 9 required ({contactNumber.length}/10)
              </p>
            )}
          </div>

          <PsgcAddressFields
            label="Present Address"
            value={present}
            onChange={setPresent}
            legacyText={legacyAddressText(patient.presentAddress ?? patient.address, originalPresent)}
            disabled={isSaving}
          />

          <div className="flex flex-col gap-2.5 border-t border-[#e4e9f2] pt-4 dark:border-border">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-semibold text-[#5b6678] dark:text-muted-foreground">Permanent Address</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-[28px] text-[12px] font-medium text-[#1f5fd6] hover:bg-[#edf3fe] dark:text-primary dark:hover:bg-muted"
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
            <p className="text-[11px] text-destructive">
              Pick both a city or municipality and a barangay for each address, or
              clear it.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="h-[36px] rounded-full border border-[#cfd7e4] px-[16px] text-[13px] font-semibold text-[#0c2a5b] transition-colors hover:bg-[#f4f7fc] active:scale-[0.98] dark:border-border dark:text-foreground dark:hover:bg-muted"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-[36px] rounded-full bg-[#1f5fd6] px-[20px] text-[13px] font-semibold text-white shadow-xs transition-colors hover:bg-[#1a53bd] active:scale-[0.98]"
            disabled={isSaving || !canSave}
            onClick={handleSave}
          >
            {isSaving ? <Spinner className="size-4" /> : "Save Contact Info"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
