import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { ApiError } from "@/lib/api-client"
import {
  CheckCircle2,
  Clock,
  Loader2,
  Pencil,
  Timer,
  XCircle,
} from "lucide-react"
import {
  useTurnaroundTargets,
  useUpdateTurnaroundTarget,
} from "../hooks/use-library"
import type { TurnaroundTarget } from "../types"

interface TurnaroundTargetsPanelProps {
  canManage: boolean
}

function formatMinutes(mins: number): string {
  if (mins < 60) {
    return `${mins} min${mins === 1 ? "" : "s"}`
  }
  const hours = Math.floor(mins / 60)
  const remaining = mins % 60
  if (remaining === 0) {
    return `${hours} hr${hours === 1 ? "" : "s"}`
  }
  return `${hours} hr${hours === 1 ? "" : "s"} ${remaining} min${remaining === 1 ? "" : "s"}`
}

export const TurnaroundTargetsPanel: React.FC<TurnaroundTargetsPanelProps> = ({
  canManage,
}) => {
  const { data: targets = [], isLoading } = useTurnaroundTargets()
  const updateMutation = useUpdateTurnaroundTarget()

  const [editingTarget, setEditingTarget] = useState<TurnaroundTarget | null>(
    null
  )
  const [minutes, setMinutes] = useState<number>(30)
  const [isActive, setIsActive] = useState<boolean>(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleOpenEdit = (target: TurnaroundTarget) => {
    setEditingTarget(target)
    setMinutes(target.minutes)
    setIsActive(target.isActive)
    setErrorMessage(null)
  }

  const handleClose = () => {
    setEditingTarget(null)
    setErrorMessage(null)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTarget) return

    if (!minutes || minutes < 1 || minutes > 1440) {
      setErrorMessage(
        "Please enter a duration between 1 and 1440 minutes (24 hours)."
      )
      return
    }

    try {
      await updateMutation.mutateAsync({
        id: editingTarget.id,
        input: {
          minutes,
          isActive,
        },
      })
      handleClose()
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message)
      } else {
        setErrorMessage("Failed to save turnaround target. Please try again.")
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* Table Container */}
      <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="border-border/80 hover:bg-transparent">
              <TableHead className="w-[200px] text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Service Stage
              </TableHead>
              <TableHead className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Citizen&apos;s Charter Description
              </TableHead>
              <TableHead className="w-[180px] text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Target Duration
              </TableHead>
              <TableHead className="w-[120px] text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Status
              </TableHead>
              {canManage && (
                <TableHead className="w-[100px] text-right text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Action
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i} className="border-border/60">
                  <TableCell>
                    <Skeleton className="h-5 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-64" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-8 w-16" />
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : targets.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canManage ? 5 : 4}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  No turnaround targets configured.
                </TableCell>
              </TableRow>
            ) : (
              targets.map((target) => (
                <TableRow
                  key={target.id}
                  className="group border-border/60 transition-colors hover:bg-muted/30"
                >
                  <TableCell className="font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <div className="flex size-7 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary">
                        <Timer className="size-3.5" />
                      </div>
                      <span>{target.label}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {target.description}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="gap-1.5 border-border/80 font-mono text-xs font-medium"
                      >
                        <Clock className="size-3 text-muted-foreground" />
                        {target.minutes} min{target.minutes === 1 ? "" : "s"}
                      </Badge>
                      {target.minutes >= 60 && (
                        <span className="text-xs text-muted-foreground/80">
                          ({formatMinutes(target.minutes)})
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {target.isActive ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="size-3.5" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <XCircle className="size-3.5" />
                        Inactive
                      </span>
                    )}
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenEdit(target)}
                        className="h-8 gap-1.5 text-xs font-medium opacity-80 transition-opacity group-hover:opacity-100 hover:opacity-100"
                      >
                        <Pencil className="size-3.5" />
                        Edit
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Modal Dialog */}
      <Dialog
        open={Boolean(editingTarget)}
        onOpenChange={(open) => !open && handleClose()}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Timer className="size-5 text-primary" />
              Edit Target: {editingTarget?.label}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {editingTarget?.description}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-5 pt-2">
            {errorMessage && (
              <Alert variant="destructive" className="py-2.5 text-xs">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="minutes" className="text-xs font-semibold">
                Target Duration (whole minutes)
              </Label>
              <div className="relative">
                <Input
                  id="minutes"
                  type="number"
                  min={1}
                  max={1440}
                  value={minutes}
                  onChange={(e) =>
                    setMinutes(parseInt(e.target.value, 10) || 0)
                  }
                  className="pr-16 font-mono text-sm"
                  required
                />
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-muted-foreground">
                  minutes
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Equivalent to:{" "}
                <span className="font-semibold text-foreground">
                  {formatMinutes(minutes || 0)}
                </span>
                . Citizen&apos;s Charter standard time before visits are flagged
                as overdue.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/80 bg-muted/20 p-3">
              <div className="space-y-0.5">
                <Label htmlFor="isActive" className="text-xs font-semibold">
                  Active Benchmark
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  When active, visits and reports measure compliance against
                  this target.
                </p>
              </div>
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClose}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={updateMutation.isPending}
                className="gap-2"
              >
                {updateMutation.isPending && (
                  <Loader2 className="size-3.5 animate-spin" />
                )}
                Save Target
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
