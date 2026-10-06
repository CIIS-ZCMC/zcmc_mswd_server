import { apiClient } from "@/lib/api-client"
import type { ApiEnvelope } from "@/features/patients/types/api.types"
import type { ApiWatcherRelationshipType } from "@/features/cases/types/api.types"
import type { WatcherRelationshipType } from "@/features/cases/types/watcher.types"

/** GET /watcher-relationship-types */
export function listWatcherRelationshipTypes(): Promise<WatcherRelationshipType[]> {
  return apiClient
    .get<ApiEnvelope<ApiWatcherRelationshipType[]>>("/watcher-relationship-types")
    .then((res) =>
      res.data.map((item) => ({
        id: String(item.id),
        name: item.name,
        code: item.code,
      })),
    )
}
