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
    const action = isEditing ? "Edit" : "Add New"
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
      <DialogContent className="max-w-lg p-6 sm:p-7">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader className="space-y-1.5 border-b border-border/60 pb-3">
            <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
              {getTitle()}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {isEditing
                ? "Update details for this lookup option."
                : "Fill in the details below to add a new option to system dropdowns."}
            </DialogDescription>
          </DialogHeader>

          {generalError && (
            <Alert
              variant="destructive"
              className="border-destructive/40 bg-destructive/10"
            >
              <AlertCircle className="size-5" />
              <AlertDescription className="text-sm font-medium">
                {generalError}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4.5 pt-1">
            {/* Name Field */}
            <div className="space-y-2">
              <Label
                htmlFor="name"
                className="text-sm font-bold text-foreground"
              >
                Display Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
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
                className={`h-12 rounded-lg text-sm font-medium ${serverErrors.name ? "border-destructive" : ""}`}
              />
              {serverErrors.name && (
                <p className="text-xs font-semibold text-destructive">
                  {serverErrors.name[0]}
                </p>
              )}
            </div>

            {/* Code Field */}
            {type !== "guarantor" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="code"
                    className="text-sm font-bold text-foreground"
                  >
                    System Identifier Code{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  {isCodeLocked && (
                    <span className="flex items-center gap-1.5 rounded border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                      <Lock className="size-3.5" /> Locked (Used in{" "}
                      {editingItem?.usageCount} records)
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
                  className={`h-12 rounded-lg font-mono text-sm ${serverErrors.code ? "border-destructive" : ""}`}
                />
                <p className="text-xs text-muted-foreground">
                  Lower-case letters, numbers and underscores only (e.g.{" "}
                  <code>medical_assistance</code>).
                </p>
                {serverErrors.code && (
                  <p className="text-xs font-semibold text-destructive">
                    {serverErrors.code[0]}
                  </p>
                )}
              </div>
            )}

            {/* Address Field (Guarantor) */}
            {type === "guarantor" && (
              <div className="space-y-2">
                <Label
                  htmlFor="address"
                  className="text-sm font-bold text-foreground"
                >
                  Office Address / Location (Optional)
                </Label>
                <Textarea
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Regional Office IX, Zamboanga City"
                  rows={2}
                  className={`rounded-lg text-sm font-medium ${serverErrors.address ? "border-destructive" : ""}`}
                />
                {serverErrors.address && (
                  <p className="text-xs font-semibold text-destructive">
                    {serverErrors.address[0]}
                  </p>
                )}
              </div>
            )}

            {/* Sort Order */}
            {(type === "mode_of_assistance" || type === "fund_source") && (
              <div className="space-y-2">
                <Label
                  htmlFor="sort_order"
                  className="text-sm font-bold text-foreground"
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
                  className={`h-12 rounded-lg text-sm font-medium ${serverErrors.sort_order ? "border-destructive" : ""}`}
                />
                <p className="text-xs text-muted-foreground">
                  Controls ordering in dropdowns. Lower numbers appear first.
                </p>
                {serverErrors.sort_order && (
                  <p className="text-xs font-semibold text-destructive">
                    {serverErrors.sort_order[0]}
                  </p>
                )}
              </div>
            )}

            {/* Requires Specify (Assistance Source) */}
            {type === "assistance_source" && (
              <div className="flex items-center justify-between rounded-xl border border-border/80 bg-muted/20 p-4">
                <div className="space-y-1">
                  <Label
                    htmlFor="requires_specify"
                    className="cursor-pointer text-sm font-bold text-foreground"
                  >
                    Requires Specification
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Prompts staff to enter custom description when selected in
                    guarantee items.
                  </p>
                </div>
                <Switch
                  id="requires_specify"
                  checked={requiresSpecify}
                  onCheckedChange={setRequiresSpecify}
                  className="scale-110"
                />
              </div>
            )}

            {/* Active Status Switch */}
            <div className="flex items-center justify-between rounded-xl border border-border/80 bg-muted/20 p-4">
              <div className="space-y-1">
                <Label
                  htmlFor="is_active"
                  className="cursor-pointer text-sm font-bold text-foreground"
                >
                  Active Status
                </Label>
                <p className="text-xs text-muted-foreground">
                  Active options appear in dropdown menus. Inactive ones remain
                  visible on historical records.
                </p>
              </div>
              <Switch
                id="is_active"
                checked={isActive}
                onCheckedChange={setIsActive}
                className="scale-110"
              />
            </div>
          </div>

          <DialogFooter className="gap-2.5 border-t border-border/60 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="h-11 rounded-lg px-5 text-sm font-bold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-11 rounded-lg px-6 text-sm font-bold shadow-xs"
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 size-4.5 animate-spin" />
              ) : (
                <Check className="mr-2 size-4.5" />
              )}
              {isEditing ? "Save Changes" : "Create Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
