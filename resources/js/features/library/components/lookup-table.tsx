import React, { useMemo, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Skeleton } from "@/components/ui/skeleton"
import {
  CheckCircle2,
  Edit2,
  FilterX,
  Lock,
  Plus,
  Search,
  Trash2,
  XCircle,
} from "lucide-react"
import { DeleteLookupDialog } from "./dialogs/delete-lookup-dialog"
import { LookupItemDialog } from "./dialogs/lookup-item-dialog"
import type { LookupFormItem } from "./dialogs/lookup-item-dialog"
import {
  ASSISTANT_TYPE_CATEGORIES,
  getCategoryConfig,
  type LibraryTabDefinition,
} from "../lib/library-tabs"

// Base UI's Select.Value shows the raw value unless given a formatter.
const STATUS_FILTER_LABELS: Record<string, string> = {
  all: "All Statuses",
  active: "Active Only",
  inactive: "Inactive Only",
}

export interface LookupTableItem {
  id: number
  name: string
  code?: string | null
  address?: string | null
  category?: string | null
  categoryLabel?: string | null
  description?: string | null
  sortOrder?: number | null
  requiresSpecify?: boolean | null
  codeLocked?: boolean
  isActive: boolean
  usageCount: number
  usage?: {
    assessments?: number
    guaranteeLines?: number
    assistanceRecords?: number
  }
}

interface LookupTableProps {
  tabConfig: LibraryTabDefinition
  items: LookupTableItem[]
  isLoading: boolean
  canManage: boolean
  onSave: (data: LookupFormItem) => Promise<void>
  onDelete: (id: number) => Promise<void>
}

export const LookupTable: React.FC<LookupTableProps> = ({
  tabConfig,
  items,
  isLoading,
  canManage,
  onSave,
  onDelete,
}) => {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")

  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<LookupTableItem | null>(null)

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deletingItem, setDeletingItem] = useState<LookupTableItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeactivating, setIsDeactivating] = useState(false)

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        const matchesSearch =
          search === "" ||
          item.name.toLowerCase().includes(search.toLowerCase()) ||
          (item.code &&
            item.code.toLowerCase().includes(search.toLowerCase())) ||
          (item.address &&
            item.address.toLowerCase().includes(search.toLowerCase())) ||
          (item.description &&
            item.description.toLowerCase().includes(search.toLowerCase())) ||
          (item.category &&
            item.category.toLowerCase().includes(search.toLowerCase()))

        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "active" && item.isActive) ||
          (statusFilter === "inactive" && !item.isActive)

        const matchesCategory =
          categoryFilter === "all" ||
          !tabConfig.showCategory ||
          item.category?.toLowerCase() === categoryFilter.toLowerCase()

        return matchesSearch && matchesStatus && matchesCategory
      })
      .sort((a, b) => {
        if (tabConfig.defaultSort === "sortOrder") {
          const orderDiff = (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
          if (orderDiff !== 0) return orderDiff
        }
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      })
  }, [items, search, statusFilter, categoryFilter, tabConfig])

  const handleOpenAdd = () => {
    setEditingItem(null)
    setIsItemDialogOpen(true)
  }

  const handleOpenEdit = (item: LookupTableItem) => {
    setEditingItem(item)
    setIsItemDialogOpen(true)
  }

  const handleOpenDelete = (item: LookupTableItem) => {
    setDeletingItem(item)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deletingItem) return
    setIsDeleting(true)
    try {
      await onDelete(deletingItem.id)
      setIsDeleteDialogOpen(false)
      setDeletingItem(null)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeactivate = async () => {
    if (!deletingItem) return
    setIsDeactivating(true)
    try {
      await onSave({
        ...deletingItem,
        isActive: false,
      })
      setIsDeleteDialogOpen(false)
      setDeletingItem(null)
    } finally {
      setIsDeactivating(false)
    }
  }

  const renderUsageTooltipContent = (item: LookupTableItem) => {
    if (item.usage) {
      const parts: string[] = []
      if (item.usage.assessments !== undefined && item.usage.assessments > 0) {
        parts.push(
          `${item.usage.assessments} intake assessment${item.usage.assessments === 1 ? "" : "s"}`
        )
      }
      if (
        item.usage.guaranteeLines !== undefined &&
        item.usage.guaranteeLines > 0
      ) {
        parts.push(
          `${item.usage.guaranteeLines} guarantee breakdown line${item.usage.guaranteeLines === 1 ? "" : "s"}`
        )
      }
      if (
        item.usage.assistanceRecords !== undefined &&
        item.usage.assistanceRecords > 0
      ) {
        parts.push(
          `${item.usage.assistanceRecords} patient assistance record${item.usage.assistanceRecords === 1 ? "" : "s"}`
        )
      }
      if (parts.length > 0) {
        return (
          <div className="space-y-1 text-xs">
            <p className="font-semibold text-foreground">Usage Details:</p>
            <ul className="list-disc pl-4 text-muted-foreground">
              {parts.map((p, idx) => (
                <li key={idx}>{p}</li>
              ))}
            </ul>
          </div>
        )
      }
    }
    return (
      <p className="text-xs">
        {item.usageCount === 0
          ? "Not used in any records yet."
          : `Used across ${item.usageCount} record${item.usageCount === 1 ? "" : "s"}.`}
      </p>
    )
  }

  return (
    <TooltipProvider delay={150}>
      <div className="space-y-4">
        {/* Header controls: Search, Filters, Add button */}
        <div className="flex flex-col items-start justify-between gap-3.5 rounded-xl border border-border/80 bg-muted/25 p-4 sm:flex-row sm:items-center">
          <div className="flex w-full flex-1 flex-wrap items-center gap-3 sm:w-auto">
            <div className="relative max-w-sm min-w-[240px] flex-1">
              <Search className="absolute top-3 left-3 size-4.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${tabConfig.label.toLowerCase()}...`}
                className="h-11 rounded-lg pl-10 text-sm font-medium"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <FilterX className="size-4" />
                </button>
              )}
            </div>

            {/* Category Filter for Types of Assistance */}
            {tabConfig.showCategory && (
              <Select
                value={categoryFilter}
                onValueChange={(v) => setCategoryFilter(v ?? "all")}
              >
                <SelectTrigger className="h-11 w-44 rounded-lg text-sm font-medium">
                  <SelectValue placeholder="All Categories">
                    {(value: string | null) =>
                      !value || value === "all"
                        ? "All Categories"
                        : getCategoryConfig(value).label
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="py-2 text-sm">
                    All Categories
                  </SelectItem>
                  {ASSISTANT_TYPE_CATEGORIES.map((cat) => (
                    <SelectItem
                      key={cat.value}
                      value={cat.value}
                      className="py-2 text-sm"
                    >
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                if (v === "all" || v === "active" || v === "inactive") {
                  setStatusFilter(v)
                }
              }}
            >
              <SelectTrigger className="h-11 w-40 rounded-lg text-sm font-medium">
                <SelectValue placeholder="Status Filter">
                  {(value: string | null) =>
                    STATUS_FILTER_LABELS[value ?? "all"] ?? "All Statuses"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="py-2 text-sm">
                  All Statuses
                </SelectItem>
                <SelectItem value="active" className="py-2 text-sm">
                  Active Only
                </SelectItem>
                <SelectItem value="inactive" className="py-2 text-sm">
                  Inactive Only
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {canManage && (
            <Button
              onClick={handleOpenAdd}
              className="h-11 shrink-0 gap-2 rounded-lg px-5 text-sm font-bold shadow-xs"
            >
              <Plus className="size-4.5" /> Add {tabConfig.singularLabel}
            </Button>
          )}
        </div>

        {/* Config-driven Items Table */}
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-2xs">
          <Table>
            <TableHeader className="border-b border-border bg-muted/50">
              <TableRow>
                {tabConfig.showSortOrder && (
                  <TableHead className="w-16 py-3.5 text-center text-sm font-bold text-foreground">
                    Order
                  </TableHead>
                )}
                <TableHead className="min-w-[180px] py-3.5 text-sm font-bold text-foreground">
                  Name
                </TableHead>
                {tabConfig.showCode && (
                  <TableHead className="w-48 py-3.5 text-sm font-bold text-foreground">
                    Code
                  </TableHead>
                )}
                {tabConfig.showCategory && (
                  <TableHead className="w-36 py-3.5 text-center text-sm font-bold text-foreground">
                    Category
                  </TableHead>
                )}
                {tabConfig.showCategory && (
                  <TableHead className="min-w-[200px] py-3.5 text-sm font-bold text-foreground">
                    Description
                  </TableHead>
                )}
                {tabConfig.showAddress && (
                  <TableHead className="min-w-[220px] py-3.5 text-sm font-bold text-foreground">
                    Address
                  </TableHead>
                )}
                {tabConfig.showRequiresSpecify && (
                  <TableHead className="w-28 py-3.5 text-center text-sm font-bold text-foreground">
                    Specify
                  </TableHead>
                )}
                <TableHead className="w-28 py-3.5 text-center text-sm font-bold text-foreground">
                  Status
                </TableHead>
                {tabConfig.showUsageCount && (
                  <TableHead className="w-32 py-3.5 text-center text-sm font-bold text-foreground">
                    Used In
                  </TableHead>
                )}
                {canManage && (
                  <TableHead className="w-44 py-3.5 pr-5 text-right text-sm font-bold text-foreground">
                    Actions
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {tabConfig.showSortOrder && (
                      <TableCell className="py-4">
                        <Skeleton className="mx-auto h-5 w-8" />
                      </TableCell>
                    )}
                    <TableCell className="py-4">
                      <Skeleton className="h-5 w-40" />
                    </TableCell>
                    {tabConfig.showCode && (
                      <TableCell className="py-4">
                        <Skeleton className="h-5 w-28" />
                      </TableCell>
                    )}
                    {tabConfig.showCategory && (
                      <TableCell className="py-4">
                        <Skeleton className="mx-auto h-6 w-20 rounded-full" />
                      </TableCell>
                    )}
                    {tabConfig.showCategory && (
                      <TableCell className="py-4">
                        <Skeleton className="h-5 w-36" />
                      </TableCell>
                    )}
                    {tabConfig.showAddress && (
                      <TableCell className="py-4">
                        <Skeleton className="h-5 w-40" />
                      </TableCell>
                    )}
                    {tabConfig.showRequiresSpecify && (
                      <TableCell className="py-4">
                        <Skeleton className="mx-auto h-5 w-16" />
                      </TableCell>
                    )}
                    <TableCell className="py-4">
                      <Skeleton className="mx-auto h-6 w-20 rounded-full" />
                    </TableCell>
                    {tabConfig.showUsageCount && (
                      <TableCell className="py-4">
                        <Skeleton className="mx-auto h-5 w-20" />
                      </TableCell>
                    )}
                    {canManage && (
                      <TableCell className="py-4 pr-5 text-right">
                        <Skeleton className="ml-auto h-9 w-32" />
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={12}
                    className="h-40 text-center text-sm text-muted-foreground"
                  >
                    {items.length === 0 ? (
                      <div className="space-y-1.5 py-4">
                        <p className="text-base font-bold text-foreground">
                          No {tabConfig.label.toLowerCase()} found.
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {tabConfig.description}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm">
                        No matches found for your search/filter criteria.
                      </p>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => {
                  const catConfig = item.category
                    ? getCategoryConfig(item.category)
                    : null

                  return (
                    <TableRow
                      key={item.id}
                      className={`transition-colors hover:bg-muted/35 ${
                        !item.isActive ? "opacity-75" : ""
                      }`}
                    >
                      {/* Sort Order */}
                      {tabConfig.showSortOrder && (
                        <TableCell className="py-3.5 text-center font-mono text-sm font-semibold text-muted-foreground">
                          {item.sortOrder ?? 0}
                        </TableCell>
                      )}

                      {/* Name */}
                      <TableCell className="py-3.5 text-sm font-semibold text-foreground">
                        {item.name}
                      </TableCell>

                      {/* Code */}
                      {tabConfig.showCode && (
                        <TableCell className="py-3.5 font-mono text-xs text-muted-foreground">
                          <div className="inline-flex items-center gap-1.5 rounded border border-border/50 bg-muted/60 px-2 py-1 text-foreground">
                            <code>{item.code || "—"}</code>
                            {item.codeLocked && (
                              <Tooltip>
                                <TooltipTrigger
                                  render={<span className="inline-flex" />}
                                  aria-label="Code locked"
                                >
                                  <Lock className="size-3 text-amber-600 dark:text-amber-400" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  Code is locked because it is referenced in
                                  saved assessments.
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                      )}

                      {/* Category Badge */}
                      {tabConfig.showCategory && (
                        <TableCell className="py-3.5 text-center">
                          {catConfig ? (
                            <Badge
                              variant="outline"
                              className={`border px-2.5 py-0.5 text-xs font-bold ${catConfig.badgeClass}`}
                            >
                              {catConfig.label}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                      )}

                      {/* Description */}
                      {tabConfig.showCategory && (
                        <TableCell className="max-w-xs truncate py-3.5 text-xs text-muted-foreground">
                          {item.description || "—"}
                        </TableCell>
                      )}

                      {/* Address */}
                      {tabConfig.showAddress && (
                        <TableCell className="max-w-xs truncate py-3.5 text-sm text-muted-foreground">
                          {item.address || "—"}
                        </TableCell>
                      )}

                      {/* Requires Specify */}
                      {tabConfig.showRequiresSpecify && (
                        <TableCell className="py-3.5 text-center text-sm">
                          {item.requiresSpecify ? (
                            <Badge
                              variant="outline"
                              className="border-primary/40 bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary"
                            >
                              Required
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                      )}

                      {/* Active Status */}
                      <TableCell className="py-3.5 text-center">
                        <Badge
                          variant={item.isActive ? "default" : "outline"}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold shadow-2xs ${
                            item.isActive
                              ? "bg-emerald-600 text-white hover:bg-emerald-600"
                              : "border-amber-500/50 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                          }`}
                        >
                          {item.isActive ? (
                            <>
                              <CheckCircle2 className="size-3.5" /> Active
                            </>
                          ) : (
                            <>
                              <XCircle className="size-3.5" /> Inactive
                            </>
                          )}
                        </Badge>
                      </TableCell>

                      {/* Usage Count with Tooltip */}
                      {tabConfig.showUsageCount && (
                        <TableCell className="py-3.5 text-center font-mono text-xs text-muted-foreground">
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <span className="inline-flex cursor-help items-center rounded-md border border-border/40 bg-muted/70 px-2.5 py-1 text-xs font-bold text-foreground hover:border-primary/40" />
                              }
                            >
                              {item.usageCount}{" "}
                              {item.usageCount === 1 ? "record" : "records"}
                            </TooltipTrigger>
                            <TooltipContent className="bg-popover text-popover-foreground shadow-md">
                              {renderUsageTooltipContent(item)}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                      )}

                      {/* Actions */}
                      {canManage && (
                        <TableCell className="py-3.5 pr-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 gap-1.5 rounded-lg border-border px-3 text-xs font-bold hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                              onClick={() => handleOpenEdit(item)}
                            >
                              <Edit2 className="size-3.5 text-primary" /> Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 gap-1.5 rounded-lg border-destructive/30 px-3 text-xs font-bold text-destructive hover:border-destructive hover:bg-destructive/10"
                              onClick={() => handleOpenDelete(item)}
                            >
                              <Trash2 className="size-3.5 text-destructive" />{" "}
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Item Dialog */}
        <LookupItemDialog
          open={isItemDialogOpen}
          onOpenChange={setIsItemDialogOpen}
          tabConfig={tabConfig}
          editingItem={editingItem}
          onSave={onSave}
        />

        {/* Delete Dialog */}
        {deletingItem && (
          <DeleteLookupDialog
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
            title={`Delete ${tabConfig.singularLabel}`}
            itemName={deletingItem.name}
            usageCount={deletingItem.usageCount}
            isDeleting={isDeleting}
            isDeactivating={isDeactivating}
            onConfirmDelete={handleConfirmDelete}
            onDeactivate={deletingItem.isActive ? handleDeactivate : undefined}
          />
        )}
      </div>
    </TooltipProvider>
  )
}
