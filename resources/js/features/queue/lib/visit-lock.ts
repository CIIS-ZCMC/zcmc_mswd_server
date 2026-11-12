import type { ServiceVisit, ServiceVisitUser } from "../types"

/**
 * Who holds this visit against the given user: its server while in progress,
 * unless that is the user. A visit with no recorded server is not held, matching
 * ServiceVisitService::ensureNotHeldByAnother.
 */
export function visitLockedBy(
  visit: ServiceVisit,
  userId?: number | null
): ServiceVisitUser | null {
  if (visit.status !== "in_progress" || !visit.servedBy) return null
  return visit.servedBy.id === userId ? null : visit.servedBy
}

/**
 * The open visit to act on. A patient can have open visits on several encounters
 * at once, so prefer the one this user is serving, then any in progress, then one
 * waiting.
 */
export function pickActiveVisit(
  visits: ServiceVisit[],
  userId?: number | null
): ServiceVisit | null {
  const inProgress = visits.filter((v) => v.status === "in_progress")
  return (
    inProgress.find((v) => v.servedBy?.id === userId) ??
    inProgress[0] ??
    visits.find((v) => v.status === "waiting") ??
    null
  )
}
