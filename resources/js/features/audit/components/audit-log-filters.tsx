import React from "react"
import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/ui/native-select"
import { DatePicker } from "@/components/ui/date-picker"
import { FilterX } from "lucide-react"
import { userDisplayName } from "@/features/auth/api/auth-api"
import { useUsers } from "@/features/auth/hooks/use-users"
import type { ActivityLogFilters } from "../api/activity-log-api"

interface AuditLogFiltersProps {
  filters: ActivityLogFilters
  onFilterChange: (updated: Partial<ActivityLogFilters>) => void
  onClearFilters: () => void
}

export const AuditLogFiltersView: React.FC<AuditLogFiltersProps> = ({
  filters,
  onFilterChange,
  onClearFilters,
}) => {
  const usersQuery = useUsers()

  const parseDate = (val?: string) => (val ? new Date(val) : undefined)
  const formatDate = (date?: Date) => {
    if (!date) return undefined
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const hasActiveFilters =
    Boolean(filters.userId) ||
    Boolean(filters.event) ||
    Boolean(filters.subjectType) ||
    Boolean(filters.dateFrom) ||
    Boolean(filters.dateTo)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 bg-card p-4 rounded-xl border border-border">
      {/* User Filter */}
      <div>
        <label className="text-xs font-bold text-muted-foreground mb-1 block">Staff User</label>
        <NativeSelect
          size="sm"
          value={filters.userId ? String(filters.userId) : ""}
          onChange={(e) =>
            onFilterChange({ userId: e.target.value ? Number(e.target.value) : undefined, page: 1 })
          }
          className="h-9 text-xs w-full"
        >
          <option value="">All Users</option>
          {usersQuery.data?.map((u) => (
            <option key={u.id} value={u.id}>
              {userDisplayName(u)}
            </option>
          ))}
        </NativeSelect>
      </div>

      {/* Event Filter */}
      <div>
        <label className="text-xs font-bold text-muted-foreground mb-1 block">Event Action</label>
        <NativeSelect
          size="sm"
          value={filters.event || ""}
          onChange={(e) =>
            onFilterChange({
              event: (e.target.value as "created" | "updated" | "deleted" | "restored") || undefined,
              page: 1,
            })
          }
          className="h-9 text-xs w-full"
        >
          <option value="">All Events</option>
          <option value="created">Created</option>
          <option value="updated">Updated</option>
          <option value="deleted">Deleted</option>
          <option value="restored">Restored</option>
        </NativeSelect>
      </div>

      {/* Date From */}
      <div>
        <label className="text-xs font-bold text-muted-foreground mb-1 block">From Date</label>
        <DatePicker
          date={parseDate(filters.dateFrom)}
          setDate={(d) => onFilterChange({ dateFrom: formatDate(d), page: 1 })}
          placeholder="Start date"
          className="h-9 text-xs w-full"
        />
      </div>

      {/* Date To */}
      <div>
        <label className="text-xs font-bold text-muted-foreground mb-1 block">To Date</label>
        <DatePicker
          date={parseDate(filters.dateTo)}
          setDate={(d) => onFilterChange({ dateTo: formatDate(d), page: 1 })}
          placeholder="End date"
          className="h-9 text-xs w-full"
        />
      </div>

      {/* Clear Button */}
      <div className="flex items-end">
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="h-9 w-full gap-1.5 text-xs font-semibold"
          >
            <FilterX className="size-4 text-muted-foreground" /> Clear Filters
          </Button>
        )}
      </div>
    </div>
  )
}
