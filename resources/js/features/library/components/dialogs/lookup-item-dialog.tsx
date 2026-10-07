import React, { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Check, Loader2, Lock } from "lucide-react"
import { ApiError } from "@/lib/api-client"

export type LookupType =
  "mode_of_assistance" | "fund_source" | "guarantor" | "assistance_source"

export interface LookupFormItem {
  id?: number
  name: string
  code?: string | null
  address?: string | null
  sortOrder?: number
  requiresSpecify?: boolean
  isActive: boolean
  usageCount?: number
}

interface LookupItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: LookupType
  editingItem: LookupFormItem | null
  onSave: (data: LookupFormItem) => Promise<void>
}

export const LookupItemDialog: React.FC<LookupItemDialogProps> = ({
  open,
  onOpenChange,
  type,
  editingItem,
  onSave,
}) => {
  const isEditing = Boolean(editingItem?.id)

  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [address, setAddress] = useState("")
  const [sortOrder, setSortOrder] = useState<number>(0)
  const [requiresSpecify, setRequiresSpecify] = useState(false)
  const [isActive, setIsActive] = useState(true)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverErrors, setServerErrors] = useState<Record<string, string[]>>({})
  const [generalError, setGeneralError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      if (editingItem) {
        setName(editingItem.name || "")
        setCode(editingItem.code || "")
        setAddress(editingItem.address || "")
        setSortOrder(editingItem.sortOrder ?? 0)
        setRequiresSpecify(Boolean(editingItem.requiresSpecify))
        setIsActive(editingItem.isActive ?? true)
      } else {
        setName("")
        setCode("")
        setAddress("")
        setSortOrder(0)
        setRequiresSpecify(false)
        setIsActive(true)
      }
      setServerErrors({})
      setGeneralError(null)
    }
  }, [open, editingItem])

  const isCodeLocked = isEditing && (editingItem?.usageCount ?? 0) > 0

  const getTitle = () => {
    const action = isEditing ? "Edit" : "Add"
    switch (type) {
      case "guarantor":
        return `${action} Guarantor`
      case "mode_of_assistance":
        return `${action} Mode of Assistance`
      case "fund_source":
        return `${action} Fund Source`
      case "assistance_source":
        return `${action} Assistance Source (Breakdown Type)`
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setServerErrors({})
    setGeneralError(null)

    try {
      await onSave({
        id: editingItem?.id,
        name,
        code: type !== "guarantor" ? code : undefined,
        address: type === "guarantor" ? address : undefined,
        sortOrder:
          type === "mode_of_assistance" || type === "fund_source"
            ? Number(sortOrder)
            : undefined,
        requiresSpecify:
          type === "assistance_source" ? requiresSpecify : undefined,
        isActive,
        usageCount: editingItem?.usageCount,
      })
      onOpenChange(false)
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.errors && Object.keys(err.errors).length > 0) {
          setServerErrors(err.errors)
        } else {
          setGeneralError(
            err.message || "Failed to save. Please review the inputs."
          )
        }
      } else if (err instanceof Error) {
        setGeneralError(err.message)
      } else {
        setGeneralError("An unexpected error occurred.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !isSubmitting && onOpenChange(v)}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {getTitle()}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {isEditing
                ? "Update details for this lookup option."
                : "Create a new lookup option to be available in system dropdowns."}
            </DialogDescription>
          </DialogHeader>

          {generalError && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="size-4" />
              <AlertDescription className="text-xs">
                {generalError}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4 py-4">
            {/* Name Field */}
            <div className="space-y-1.5">
              <Label
                htmlFor="name"
                className="text-xs font-bold tracking-wider uppercase"
              >
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  // Auto-generate code if adding new item and code not manually modified
                  if (
                    !isEditing &&
                    type !== "guarantor" &&
                    (!code ||
                      code ===
                        name
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "_")
                          .replace(/^_+|_+$/g, ""))
                  ) {
                    setCode(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "_")
                        .replace(/^_+|_+$/g, "")
                    )
                  }
                }}
                placeholder="e.g. Financial Assistance"
                required
                className={serverErrors.name ? "border-destructive" : ""}
              />
              {serverErrors.name && (
                <p className="text-xs text-destructive">
                  {serverErrors.name[0]}
                </p>
              )}
            </div>

            {/* Code Field (for Mode of Assistance, Fund Source, Assistance Source) */}
            {type !== "guarantor" && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="code"
                    className="text-xs font-bold tracking-wider uppercase"
                  >
                    Unique Code <span className="text-destructive">*</span>
                  </Label>
                  {isCodeLocked && (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                      <Lock className="size-3" /> Locked (used in records)
                    </span>
                  )}
                </div>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. financial_assistance"
                  disabled={isCodeLocked}
                  required={type !== "assistance_source"}
                  className={serverErrors.code ? "border-destructive" : ""}
                />
                <p className="text-[11px] text-muted-foreground">
                  Alphanumeric identifier with underscores (e.g.{" "}
                  <code>financial_assistance</code>).
                </p>
                {serverErrors.code && (
                  <p className="text-xs text-destructive">
                    {serverErrors.code[0]}
                  </p>
                )}
              </div>
            )}

            {/* Address Field (for Guarantor) */}
            {type === "guarantor" && (
              <div className="space-y-1.5">
                <Label
                  htmlFor="address"
                  className="text-xs font-bold tracking-wider uppercase"
                >
                  Address / Location (Optional)
                </Label>
                <Textarea
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Regional Office IX, Zamboanga City"
                  rows={2}
                  className={serverErrors.address ? "border-destructive" : ""}
                />
                {serverErrors.address && (
                  <p className="text-xs text-destructive">
                    {serverErrors.address[0]}
                  </p>
                )}
              </div>
            )}

            {/* Sort Order (for Mode of Assistance & Fund Source) */}
            {(type === "mode_of_assistance" || type === "fund_source") && (
              <div className="space-y-1.5">
                <Label
                  htmlFor="sort_order"
                  className="text-xs font-bold tracking-wider uppercase"
                >
                  Display Order
                </Label>
                <Input
                  id="sort_order"
                  type="number"
                  value={sortOrder}
                  onChange={(e) =>
                    setSortOrder(parseInt(e.target.value, 10) || 0)
                  }
                  placeholder="0"
                  className={
                    serverErrors.sort_order ? "border-destructive" : ""
                  }
                />
                <p className="text-[11px] text-muted-foreground">
                  Lower numbers appear first in dropdown menus.
                </p>
                {serverErrors.sort_order && (
                  <p className="text-xs text-destructive">
                    {serverErrors.sort_order[0]}
                  </p>
                )}
              </div>
            )}

            {/* Requires Specify (for Assistance Source) */}
            {type === "assistance_source" && (
              <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 p-3">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="requires_specify"
                    className="text-xs font-bold"
                  >
                    Requires Specification
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Prompts staff to enter custom specification details when
                    chosen in guarantee breakdowns.
                  </p>
                </div>
                <Switch
                  id="requires_specify"
                  checked={requiresSpecify}
                  onCheckedChange={setRequiresSpecify}
                />
              </div>
            )}

            {/* Active Status Switch */}
            <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 p-3">
              <div className="space-y-0.5">
                <Label htmlFor="is_active" className="text-xs font-bold">
                  Active Status
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Inactive items remain intact on past records but are hidden
                  from new entry dropdowns.
                </p>
              </div>
              <Switch
                id="is_active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              ) : (
                <Check className="mr-1.5 size-4" />
              )}
              {isEditing ? "Save Changes" : "Create Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
