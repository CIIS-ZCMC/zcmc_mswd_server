/**
 * The cross-patient audit trail. Separate from
 * `getPatientHistory` in the patients feature, which stays on the
 * unpaginated `GET /patients/{id}/history` — this module is the paginated,
 * server-filtered endpoint the global audit page and the per-record popover
 * both read.
 */
import { apiClient } from "@/lib/api-client"
import type { ApiActivityLogPage } from "@/features/patients/types/api.types"

export interface ActivityLogFilters {
  page?: number
  perPage?: number
  /** Causer user ID. */
  userId?: number
  patientId?: number
  caseId?: number
  event?: "created" | "updated" | "deleted" | "restored"
  subjectType?: string
  subjectId?: number
  /** Inclusive `YYYY-MM-DD` bounds. */
  dateFrom?: string
  dateTo?: string
}

/**
 * GET /activity-log.
 *
 * Protective-case rows are withheld server-side for users lacking
 * `audit.view_protective`. Do not add a client-side equivalent: filtering
 * here would mean the rows still crossed the wire.
 */
export function getActivityLog(filters: ActivityLogFilters = {}) {
  return apiClient.get<ApiActivityLogPage>("/activity-log", {
    params: {
      page: filters.page ?? 1,
      per_page: filters.perPage ?? 25,
      user_id: filters.userId,
      patient_id: filters.patientId,
      case_id: filters.caseId,
      event: filters.event,
      subject_type: filters.subjectType,
      subject_id: filters.subjectId,
      date_from: filters.dateFrom,
      date_to: filters.dateTo,
    },
  })
}

/**
 * The trail for one record — the same endpoint under a narrow filter, so
 * the popover and the page share caching, pagination and permission
 * behaviour rather than growing a second code path.
 */
export function getRecordHistory(subjectType: string, subjectId: number, limit = 5) {
  return getActivityLog({ subjectType, subjectId, perPage: limit })
}
