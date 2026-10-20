import React from "react"
import type { ServiceVisit } from "../types"

const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })

interface ServiceTimesHintProps {
  /** The encounter's latest served visit (useEncounterServiceTimes). */
  visit: ServiceVisit | null
}

/**
 * The line under a slip's Time Started / Ended inputs: where the prefilled times
 * came from. Blank inputs still print the queue's times (the server falls back).
 */
export const ServiceTimesHint: React.FC<ServiceTimesHintProps> = ({
  visit,
}) => (
  <p className="text-xs text-muted-foreground">
    {visit?.startedAt
      ? `From the queue: service started ${clock(visit.startedAt)}, ${
          visit.completedAt
            ? `completed ${clock(visit.completedAt)}`
            : "not yet completed"
        }. Edit if needed.`
      : "Leave blank to print the queue's start and completion times, if any."}
  </p>
)
