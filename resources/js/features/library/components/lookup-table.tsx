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
import { Skeleton } from "@/components/ui/skeleton"
import {
  CheckCircle2,
  Edit2,
  FilterX,
  Plus,
  Search,
  Trash2,
  XCircle,
} from "lucide-react"
import { DeleteLookupDialog } from "./dialogs/delete-lookup-dialog"
import { LookupItemDialog } from "./dialogs/lookup-item-dialog"
import type { LookupFormItem, LookupType } from "./dialogs/lookup-item-dialog"

export interface LookupTableItem {
  id: number
  name: string
  code?: string | null
  address?: string | null
  sortOrder?: number
  requiresSpecify?: boolean
  isActive: boolean
  usageCount: number
}

interface LookupTableProps {
  type: LookupType
  title: string
  singularTitle: string
  description: string
  items: LookupTableItem[]
  isLoading: boolean
  canManage: boolean
  onSave: (data: LookupFormItem) => Promise<void>
  onDelete: (id: number) => Promise<void>
}

export const LookupTable: React.FC<LookupTableProps> = ({
  type,
  title,
  singularTitle,
  description,
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

  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<LookupTableItem | null>(null)

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deletingItem, setDeletingItem] = useState<LookupTableItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeactivating, setIsDeactivating] = useState(false)

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        search === "" ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.code && item.code.toLowerCase().includes(search.toLowerCase())) ||
        (item.address &&
          item.address.toLowerCase().includes(search.toLowerCase()))

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && item.isActive) ||
        (statusFilter === "inactive" && !item.isActive)

      return matchesSearch && matchesStatus
    })
  }, [items, search, statusFilter])

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

  return (
    <div className="space-y-4">
      {/* Header controls: Search, Filter, Add button (Senior-friendly sizing) */}
      <div className="flex flex-col items-start justify-between gap-3.5 rounded-xl border border-border/80 bg-muted/25 p-4 sm:flex-row sm:items-center">
        <div className="flex w-full flex-1 items-center gap-3 sm:w-auto">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute top-3 left-3 size-4.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${title.toLowerCase()}...`}
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

          <Select
            value={statusFilter}
            onValueChange={(v) => {
              if (v === "all" || v === "active" || v === "inactive") {
                setStatusFilter(v)
              }
            }}
          >
            <SelectTrigger className="h-11 w-40 rounded-lg text-sm font-medium">
              <SelectValue placeholder="Status Filter" />
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
            <Plus className="size-4.5" /> Add {singularTitle}
          </Button>
        )}
      </div>

      {/* Items Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xs">
        <Table>
          <TableHeader className="border-b border-border bg-muted/50">
            <TableRow>
              <TableHead className="w-[32%] py-3.5 text-sm font-bold text-foreground">
                Name
              </TableHead>
              {type !== "guarantor" ? (
                <TableHead className="w-[24%] py-3.5 text-sm font-bold text-foreground">
                  Code
                </TableHead>
              ) : (
                <TableHead className="w-[28%] py-3.5 text-sm font-bold text-foreground">
                  Address
                </TableHead>
              )}
              {(type === "mode_of_assistance" || type === "fund_source") && (
                <TableHead className="w-20 py-3.5 text-center text-sm font-bold text-foreground">
                  Order
                </TableHead>
              )}
              {type === "assistance_source" && (
                <TableHead className="w-28 py-3.5 text-center text-sm font-bold text-foreground">
                  Specify
                </TableHead>
              )}
              <TableHead className="w-28 py-3.5 text-center text-sm font-bold text-foreground">
                Status
              </TableHead>
              <TableHead className="w-28 py-3.5 text-center text-sm font-bold text-foreground">
                Usage
              </TableHead>
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
                  <TableCell className="py-4">
                    <Skeleton className="h-5 w-40" />
                  </TableCell>
                  <TableCell className="py-4">
                    <Skeleton className="h-5 w-32" />
                  </TableCell>
                  {(type === "mode_of_assistance" ||
                    type === "fund_source" ||
                    type === "assistance_source") && (
                    <TableCell className="py-4">
                      <Skeleton className="mx-auto h-5 w-12" />
                    </TableCell>
                  )}
                  <TableCell className="py-4">
                    <Skeleton className="mx-auto h-6 w-20 rounded-full" />
                  </TableCell>
                  <TableCell className="py-4">
                    <Skeleton className="mx-auto h-5 w-16" />
                  </TableCell>
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
                  colSpan={
                    type === "guarantor"
                      ? canManage
                        ? 5
                        : 4
                      : canManage
                        ? 6
                        : 5
                  }
                  className="h-40 text-center text-sm text-muted-foreground"
                >
                  {items.length === 0 ? (
                    <div className="space-y-1.5 py-4">
                      <p className="text-base font-bold text-foreground">
                        No {title.toLowerCase()} found.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {description}
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
              filteredItems.map((item) => (
                <TableRow
                  key={item.id}
                  className="transition-colors hover:bg-muted/35"
                >
                  <TableCell className="py-3.5 text-sm font-semibold text-foreground">
                    {item.name}
                  </TableCell>

                  {type !== "guarantor" ? (
                    <TableCell className="py-3.5 font-mono text-xs text-muted-foreground">
                      <code className="rounded border border-border/50 bg-muted/60 px-2 py-1 text-foreground">
                        {item.code || "—"}
                      </code>
                    </TableCell>
                  ) : (
                    <TableCell className="max-w-xs truncate py-3.5 text-sm text-muted-foreground">
                      {item.address || "—"}
                    </TableCell>
                  )}

                  {(type === "mode_of_assistance" ||
                    type === "fund_source") && (
                    <TableCell className="py-3.5 text-center font-mono text-sm font-semibold text-muted-foreground">
                      {item.sortOrder ?? 0}
                    </TableCell>
                  )}

                  {type === "assistance_source" && (
                    <TableCell className="py-3.5 text-center text-sm">
                      {item.requiresSpecify ? (
                        <Badge
                          variant="outline"
                          className="border-primary/40 px-2.5 py-0.5 text-xs font-bold text-primary"
                        >
                          Required
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  )}

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

                  <TableCell className="py-3.5 text-center font-mono text-xs text-muted-foreground">
                    <span className="inline-flex items-center rounded-md border border-border/40 bg-muted/70 px-2.5 py-1 text-xs font-bold text-foreground">
                      {item.usageCount}{" "}
                      {item.usageCount === 1 ? "record" : "records"}
                    </span>
                  </TableCell>

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
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Item Dialog */}
      <LookupItemDialog
        open={isItemDialogOpen}
        onOpenChange={setIsItemDialogOpen}
        type={type}
        editingItem={editingItem}
        onSave={onSave}
      />

      {/* Delete Dialog */}
      {deletingItem && (
        <DeleteLookupDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          title={`Delete ${singularTitle}`}
          itemName={deletingItem.name}
          usageCount={deletingItem.usageCount}
          isDeleting={isDeleting}
          isDeactivating={isDeactivating}
          onConfirmDelete={handleConfirmDelete}
          onDeactivate={deletingItem.isActive ? handleDeactivate : undefined}
        />
      )}
    </div>
  )
}
