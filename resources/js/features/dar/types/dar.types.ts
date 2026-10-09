/** Patient attributes included on a DAR entry line. */
export interface DarPatient {
  id: number
  name: string
  hospital_id: number | string | null
  mswd_id: string | null
  age: number | null
  sex: string | null
  address: string | null
}

/** One record line on the worker's Daily Accomplishment Report. */
export interface DarEntry {
  id: number
  entry_date: string
  served_time: string | null
  activity: string
  activity_label: string
  remarks: string | null
  patient: DarPatient | null
  created_at?: string
  updated_at?: string
}

/** Aggregate metrics for the selected day. */
export interface DarSummary {
  patients_served: number
  entries: number
  by_activity: Record<string, number>
}

/** GET /api/dar response contract. */
export interface DarResponse {
  date: string
  data: DarEntry[]
  summary: DarSummary
  activities: Record<string, string>
}

/** POST /api/dar-entries request payload. */
export interface StoreDarEntryPayload {
  patient_id: number
  entry_date: string
  served_time?: string | null
  activity: string
  remarks?: string | null
}

/** PATCH /api/dar-entries/{id} request payload. */
export interface UpdateDarEntryPayload {
  patient_id?: number
  entry_date?: string
  served_time?: string | null
  activity?: string
  remarks?: string | null
}
