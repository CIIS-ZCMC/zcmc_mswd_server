import React, { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RecordHistoryPopover } from "@/features/audit/components/record-history-popover"
import { useCaseWatchers } from "@/features/cases/hooks/use-case-watchers"
import { useCaseWatcherMutations } from "@/features/cases/hooks/use-case-watcher-mutations"
import type { CaseWatcher } from "@/features/cases/types/watcher.types"
import type { PatientRecord } from "../../types"
import { IssuePassDialog } from "../dialogs/issue-pass-dialog"
import { WatcherDialog } from "../dialogs/watcher-dialog"
import { Ban, CheckCircle, Edit, MoreHorizontal, Plus, ShieldAlert, Star, Trash2 } from "lucide-react"

interface WatchersTabProps {
  patient?: Partial<PatientRecord> | null
  patientId?: number
  caseId?: number | null
}

export const WatchersTab: React.FC<WatchersTabProps> = ({ patient, patientId: propPatientId, caseId }) => {
  const patientId = propPatientId ?? (patient?.id ? Number(patient.id) : 0)
  const { data: caseWatchers = [], isLoading } = useCaseWatchers(caseId ?? undefined)
  const mutations = useCaseWatcherMutations({
    caseId: caseId ?? 0,
    patientId: patientId,
  })

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingWatcher, setEditingWatcher] = useState<CaseWatcher | null>(null)
  const [passWatcher, setPassWatcher] = useState<CaseWatcher | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!caseId) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground space-y-3">
          <ShieldAlert className="size-10 text-amber-500 opacity-80" />
          <div>
            <h3 className="text-base font-bold text-foreground">No Active Admission Case</h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              Case watchers and ward access passes are episode-scoped. An active admission case is required before registering watchers.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const handlePromote = async (watcherId: string) => {
    try {
      setErrorMessage(null)
      await mutations.promoteWatcher(Number(watcherId))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to promote watcher to primary"
      setErrorMessage(msg)
    }
  }

  const handleRevokePass = async (watcherId: string) => {
    try {
      setErrorMessage(null)
      await mutations.revokePass(Number(watcherId))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to revoke watcher pass"
      setErrorMessage(msg)
    }
  }

  const handleDelete = async (watcherId: string) => {
    if (!window.confirm("Are you sure you want to remove this watcher from the case?")) return
    try {
      setErrorMessage(null)
      await mutations.deleteWatcher(Number(watcherId))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to remove watcher"
      setErrorMessage(msg)
    }
  }

  const handleSaveWatcher = async (payload: unknown, watcherId?: number) => {
    try {
      setErrorMessage(null)
      if (watcherId) {
        await mutations.updateWatcher({ watcherId, payload: payload as Parameters<typeof mutations.updateWatcher>[0]["payload"] })
      } else {
        await mutations.createWatcher(payload as Parameters<typeof mutations.createWatcher>[0])
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save watcher details"
      setErrorMessage(msg)
      throw err
    }
  }

  const handleIssuePass = async (watcherId: number, passValidUntil?: string) => {
    try {
      setErrorMessage(null)
      await mutations.issuePass({ watcherId, payload: { pass_valid_until: passValidUntil } })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to issue watcher pass"
      setErrorMessage(msg)
      throw err
    }
  }

  const passStatusBadge = (status: string, passNo: string | null) => {
    if (!passNo) {
      return (
        <Badge variant="outline" className="text-muted-foreground border-border text-xs">
          No Pass
        </Badge>
      )
    }

    switch (status.toLowerCase()) {
      case "active":
        return (
          <Badge variant="outline" className="text-emerald-600 border-emerald-500 bg-emerald-50/50 text-xs px-2.5 py-0.5 font-bold">
            Active
          </Badge>
        )
      case "expired":
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-500 bg-amber-50/50 text-xs px-2.5 py-0.5 font-bold">
            Expired
          </Badge>
        )
      case "revoked":
        return (
          <Badge variant="outline" className="text-destructive border-destructive/50 bg-destructive/10 text-xs px-2.5 py-0.5 font-bold">
            Revoked
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-xs px-2.5 py-0.5">
            {status}
          </Badge>
        )
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            Registered Episode Watchers &amp; Ward Access Passes
          </CardTitle>
          <CardDescription className="text-xs">
            Authorized watchers registered for current admission case (Case ID #{caseId}).
          </CardDescription>
        </div>
        <Button
          variant="default"
          size="default"
          className="gap-2 font-semibold h-10"
          onClick={() => setIsAddOpen(true)}
        >
          <Plus className="size-4" /> Add Watcher
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {errorMessage && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center justify-between">
            <span>{errorMessage}</span>
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setErrorMessage(null)}>
              Dismiss
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner className="size-6 text-primary" />
          </div>
        ) : caseWatchers.length === 0 ? (
          <div className="text-center py-10 border border-dashed rounded-lg text-muted-foreground space-y-2">
            <p className="text-sm font-semibold">No Watchers Recorded for this Episode</p>
            <p className="text-xs">Click "Add Watcher" above to register an authorized watcher or bystander.</p>
          </div>
        ) : (
          <Table className="text-sm">
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold">Watcher Name &amp; Role</TableHead>
                <TableHead className="font-bold">Relationship</TableHead>
                <TableHead className="font-bold">Contact No.</TableHead>
                <TableHead className="font-bold">Pass Number</TableHead>
                <TableHead className="font-bold">Valid Until</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                <TableHead className="font-bold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {caseWatchers.map((watch) => (
                <TableRow key={watch.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{watch.fullName}</span>
                      {watch.isPrimary && (
                        <Badge variant="default" className="bg-amber-500 text-white hover:bg-amber-600 text-[10px] px-1.5 py-0 font-bold">
                          Primary
                        </Badge>
                      )}
                      {watch.isInformant && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-semibold">
                          Informant
                        </Badge>
                      )}
                      {/* The activity-log subject is PatientWatcher — the directory
                          record — so this is keyed on patientWatcherId, never on the
                          CaseWatcher's own id: those id spaces are unrelated and
                          mixing them would quietly show another person's history.
                          A watcher entered ad hoc for this episode has no directory
                          row, and so has no history to show. */}
                      {watch.patientWatcherId && (
                        <RecordHistoryPopover
                          subjectType="PatientWatcher"
                          subjectId={watch.patientWatcherId}
                          label={`Watcher: ${watch.fullName}`}
                        />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{watch.relationship}</TableCell>
                  <TableCell className="font-mono font-semibold">{watch.contactNo || "—"}</TableCell>
                  <TableCell className="font-mono text-primary font-bold">
                    {watch.passNumber || "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {watch.passValidUntil ? watch.passValidUntil.substring(0, 10) : "—"}
                  </TableCell>
                  <TableCell>{passStatusBadge(watch.passStatus, watch.passNumber)}</TableCell>

                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="size-8.5 p-0 inline-flex items-center justify-center rounded-md border border-input bg-background shadow-2xs hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary">
                        <MoreHorizontal className="size-4.5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 p-1.5 space-y-0.5">
                        {!watch.isPrimary && (
                          <DropdownMenuItem onClick={() => handlePromote(watch.id)} className="cursor-pointer gap-2 py-2 px-2.5 text-xs sm:text-sm font-semibold">
                            <Star className="size-4 text-amber-500 shrink-0" /> Make Primary
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => setEditingWatcher(watch)} className="cursor-pointer gap-2 py-2 px-2.5 text-xs sm:text-sm font-semibold">
                          <Edit className="size-4 shrink-0" /> Edit Watcher
                        </DropdownMenuItem>

                        <DropdownMenuSeparator className="my-1" />

                        <DropdownMenuItem onClick={() => setPassWatcher(watch)} className="cursor-pointer gap-2 py-2 px-2.5 text-xs sm:text-sm font-semibold">
                          <CheckCircle className="size-4 text-emerald-600 shrink-0" />
                          {watch.passNumber ? "Reissue Pass" : "Issue Ward Pass"}
                        </DropdownMenuItem>

                        {watch.passNumber && watch.passStatus === "active" && (
                          <DropdownMenuItem onClick={() => handleRevokePass(watch.id)} className="cursor-pointer gap-2 py-2 px-2.5 text-xs sm:text-sm font-semibold">
                            <Ban className="size-4 text-amber-600 shrink-0" /> Revoke Pass
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator className="my-1" />

                        <DropdownMenuItem
                          className="cursor-pointer gap-2 py-2 px-2.5 text-xs sm:text-sm font-semibold text-destructive focus:text-destructive"
                          onClick={() => handleDelete(watch.id)}
                        >
                          <Trash2 className="size-4 shrink-0" /> Remove Watcher
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <WatcherDialog
        isOpen={isAddOpen || editingWatcher !== null}
        onClose={() => {
          setIsAddOpen(false)
          setEditingWatcher(null)
        }}
        patient={patient}
        editingWatcher={editingWatcher}
        onSave={handleSaveWatcher}
        isSubmitting={mutations.isCreating || mutations.isUpdating}
      />

      <IssuePassDialog
        isOpen={passWatcher !== null}
        onClose={() => setPassWatcher(null)}
        watcher={passWatcher}
        onIssuePass={handleIssuePass}
        isSubmitting={mutations.isIssuingPass}
      />
    </Card>
  )
}
