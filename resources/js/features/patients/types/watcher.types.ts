/**
 * The backend's PatientWatcher table has no pass-number, expiry or status
 * columns at all (only name/relationship/contact_number/address/is_primary)
 * — so `passNo`/`validUntil` are plain strings that the adapter fills with a
 * "not tracked" placeholder rather than fabricated values, and `status`
 * stays a loose string rather than a fixed union for the same reason.
 */
export type WatcherPassStatus = string

export interface Watcher {
  id: string
  fullName: string
  relationship: string
  contactNo: string
  passNo: string
  validUntil: string
  status: WatcherPassStatus
}
