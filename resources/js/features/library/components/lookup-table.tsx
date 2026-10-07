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
import { Edit2, FilterX, Plus, Search, Trash2 } from "lucide-react"
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
      {/* Header controls: Search, Filter, Add button */}
      <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 p-3.5 sm:flex-row sm:items-center">
        <div className="flex w-full flex-1 items-center gap-2.5 sm:w-auto">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${title.toLowerCase()}...`}
              className="h-9 pl-8 text-xs"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-foreground"
              >
                <FilterX className="size-3.5" />
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
            <SelectTrigger className="h-9 w-32 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All Status
              </SelectItem>
              <SelectItem value="active" className="text-xs">
                Active Only
              </SelectItem>
              <SelectItem value="inactive" className="text-xs">
                Inactive Only
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {canManage && (
          <Button
            onClick={handleOpenAdd}
            size="sm"
            className="h-9 shrink-0 gap-1.5 text-xs font-bold"
          >
            <Plus className="size-4" /> Add {singularTitle}
          </Button>
        )}
      </div>

      {/* Items Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-[35%] text-xs font-bold">Name</TableHead>
              {type !== "guarantor" ? (
                <TableHead className="w-[25%] text-xs font-bold">
                  Code
                </TableHead>
              ) : (
                <TableHead className="w-[30%] text-xs font-bold">
                  Address
                </TableHead>
              )}
              {(type === "mode_of_assistance" || type === "fund_source") && (
                <TableHead className="w-20 text-center text-xs font-bold">
                  Order
                </TableHead>
              )}
              {type === "assistance_source" && (
                <TableHead className="w-28 text-center text-xs font-bold">
                  Specify
                </TableHead>
              )}
              <TableHead className="w-24 text-center text-xs font-bold">
                Status
              </TableHead>
              <TableHead className="w-24 text-center text-xs font-bold">
                Usage
              </TableHead>
              {canManage && (
                <TableHead className="w-24 pr-4 text-right text-xs font-bold">
                  Actions
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-36" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  {(type === "mode_of_assistance" ||
                    type === "fund_source" ||
                    type === "assistance_source") && (
                    <TableCell>
                      <Skeleton className="mx-auto h-4 w-12" />
                    </TableCell>
                  )}
                  <TableCell>
                    <Skeleton className="mx-auto h-5 w-16 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="mx-auto h-4 w-12" />
                  </TableCell>
                  {canManage && (
                    <TableCell className="pr-4 text-right">
                      <Skeleton className="ml-auto h-8 w-16" />
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
                  className="h-32 text-center text-xs text-muted-foreground"
                >
                  {items.length === 0 ? (
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">
                        No {title.toLowerCase()} configured.
                      </p>
                      <p className="text-[11px]">{description}</p>
                    </div>
                  ) : (
                    <p>No matches found for your filter criteria.</p>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/30">
                  <TableCell className="text-xs font-medium text-foreground">
                    {item.name}
                  </TableCell>

                  {type !== "guarantor" ? (
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      <code>{item.code || "—"}</code>
                    </TableCell>
                  ) : (
                    <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                      {item.address || "—"}
                    </TableCell>
                  )}

                  {(type === "mode_of_assistance" ||
                    type === "fund_source") && (
                    <TableCell className="text-center font-mono text-xs text-muted-foreground">
                      {item.sortOrder ?? 0}
                    </TableCell>
                  )}

                  {type === "assistance_source" && (
                    <TableCell className="text-center text-xs">
                      {item.requiresSpecify ? (
                        <Badge
                          variant="outline"
                          className="border-primary/40 text-[10px] text-primary"
                        >
                          Required
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  )}

                  <TableCell className="text-center">
                    <Badge
                      variant={item.isActive ? "default" : "outline"}
                      className={`text-[10px] font-bold ${
                        item.isActive
                          ? "bg-emerald-600 text-white hover:bg-emerald-600"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {item.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-center font-mono text-xs text-muted-foreground">
                    {item.usageCount > 0 ? (
                      <span className="font-bold text-foreground">
                        {item.usageCount}
                      </span>
                    ) : (
                      "0"
                    )}
                  </TableCell>

                  {canManage && (
                    <TableCell className="pr-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-foreground"
                          onClick={() => handleOpenEdit(item)}
                          title="Edit"
                        >
                          <Edit2 className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleOpenDelete(item)}
                          title="Delete / Deactivate"
                        >
                          <Trash2 className="size-3.5" />
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
