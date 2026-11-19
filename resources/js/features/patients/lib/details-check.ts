import type { PatientRecord } from "../types"

function isRecorded(value?: string | null): boolean {
  if (!value) return false
  const lower = value.trim().toLowerCase()
  return (
    lower !== "" &&
    lower !== "n/a" &&
    lower !== "not on file" &&
    lower !== "not recorded" &&
    lower !== "none" &&
    lower !== "—"
  )
}

/**
 * What a worker confirms with the patient when a visit starts: the things the
 * registry is most often missing or holds in an old free-text form.
 */
export function detailsToCheck(patient: PatientRecord): string[] {
  const items: string[] = []

  if (!isRecorded(patient.contactNo)) items.push("Contact number")
  if (!isRecorded(patient.philHealthNo)) items.push("PhilHealth number")

  const present = patient.presentAddressPsgc
  const hasAddress = isRecorded(patient.presentAddress ?? patient.address)
  if (!hasAddress) {
    items.push("Present address")
  } else if (!present?.cityCode) {
    // A free-text address that was never matched to a city and barangay.
    items.push("Address not matched to PSGC")
  }

  return items
}

/** "3 to check" / "Checked", for the visit stepper. */
export function detailsToCheckLabel(items: string[], checked: boolean): string {
  if (checked) return "Checked"
  return items.length === 0 ? "Confirm" : `${items.length} to check`
}
