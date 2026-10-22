import React, { useState } from "react"
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { RecordHistoryPopover } from "@/features/audit/components/record-history-popover"
import { useQueueActionGate } from "@/features/queue"
import { useCaseWatcherMutations } from "@/features/cases/hooks/use-case-watcher-mutations"
import { usePatientWatcherMutations, usePatientWatchers } from "../../hooks/use-patient-watchers"
import type { PatientRecord } from "../../types"
import type { OpenCase, Watcher, WatcherAssignment } from "../../types/watcher.types"
import { AssignWatcherDialog } from "../dialogs/assign-watcher-dialog"
import { IssuePassDialog } from "../dialogs/issue-pass-dialog"
import { WatcherDialog } from "../dialogs/watcher-dialog"
import { AssignmentMenu, PassStatusBadge, RoleBadges } from "../watcher-assignment-parts"
import { Edit, MoreHorizontal, Plus, Trash2, UserPlus } from "lucide-react"

interface WatchersTabProps {
  patient?: Partial<PatientRecord> | null
  patientId?: number
  /** The patient's open cases, which a watcher can be assigned to. */
  openCases?: OpenCase[]
}

const isOpenAssignment = (a: WatcherAssignment) => a.caseStatus === "open" || a.caseStatus === "ongoing"

const messageOf = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback)

/**
 * The patient's watchers. A watcher belongs to the patient, so one can be added
 * whether or not there is a case; assigning them to an open case is what makes
 * them that case's primary watcher or gives them a ward pass.
 */
export const WatchersTab: React.FC<WatchersTabProps> = ({
  patient,
  patientId: propPatientId,
  openCases = [],
}) => {
  const patientId = propPatientId ?? (patient?.id ? Number(patient.id) : 0)
  const { data: watchers = [], isLoading } = usePatientWatchers(patientId)
  const watcherMutations = usePatientWatcherMutations(patientId)
  const caseMutations = useCaseWatcherMutations({ caseId: 0, patientId })
  const { canPerformActions, reason } = useQueueActionGate()

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingWatcher, setEditingWatcher] = useState<Watcher | null>(null)
  const [assigningWatcher, setAssigningWatcher] = useState<Watcher | null>(null)
  const [passTarget, setPassTarget] = useState<{ id: string; fullName: string; passValidUntil?: string | null } | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const run = async (action: () => Promise<unknown>, fallback: string) => {
    try {
      setErrorMessage(null)
      await action()
    } catch (err: unknown) {
      setErrorMessage(messageOf(err, fallback))
    }
  }

  const handleSaveWatcher = async (
    payload: Parameters<typeof watcherMutations.createWatcher>[0],
    watcherId?: number
  ) => {
    if (watcherId) {
      await watcherMutations.updateWatcher({ watcherId, payload })
    } else {
      await watcherMutations.createWatcher(payload)
    }
  }

  const handleRemove = (watcher: Watcher) => {
    if (!window.confirm(`Remove ${watcher.fullName} from this patient's watchers?`)) return
    run(() => watcherMutations.deleteWatcher(Number(watcher.id)), "Failed to remove watcher")
  }

  const handleUnassign = (watcher: Watcher, assignment: WatcherAssignment) => {
    if (!window.confirm(`Unassign ${watcher.fullName} from case ${assignment.caseCode ?? assignment.caseId}?`)) return
    run(() => caseMutations.deleteWatcher(Number(assignment.id)), "Failed to unassign watcher")
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base font-bold">Watchers</CardTitle>
          <CardDescription className="text-xs">
            People who watch over this patient. Assign a watcher to an open case to make them its primary watcher or issue a ward pass.
          </CardDescription>
        </div>
        <Button
          disabled={!canPerformActions}
          title={!canPerformActions ? reason : undefined}
          className="h-10 gap-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => setIsAddOpen(true)}
        >
          <Plus className="size-4" /> Add Watcher
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {errorMessage && (
          <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
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
        ) : watchers.length === 0 ? (
          <div className="space-y-2 rounded-lg border border-dashed py-10 text-center text-muted-foreground">
            <p className="text-sm font-semibold">No Watchers Recorded</p>
            <p className="text-xs">Click "Add Watcher" to register a family member or other watcher.</p>
          </div>
        ) : (
          <Table className="text-sm">
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold">Watcher</TableHead>
                <TableHead className="font-bold">Relationship</TableHead>
                <TableHead className="font-bold">Contact No.</TableHead>
                <TableHead className="font-bold">Cases</TableHead>
                <TableHead className="w-[190px] text-right font-bold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {watchers.map((watcher) => {
                const hasOpenAssignment = watcher.assignments.some(isOpenAssignment)
                const canAssign = openCases.some(
                  (c) => !watcher.assignments.some((a) => a.caseId === String(c.id))
                )
                const assignBlockedReason =
                  openCases.length === 0 ? "No open case to assign to" : "Already assigned to every open case"

                return (
                  <TableRow key={watcher.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{watcher.fullName}</span>
                        <RecordHistoryPopover
                          subjectType="PatientWatcher"
                          subjectId={watcher.id}
                          label={`Watcher: ${watcher.fullName}`}
                        />
                      </div>
                      {watcher.address && (
                        <div className="mt-0.5 text-xs text-muted-foreground">{watcher.address}</div>
                      )}
                    </TableCell>
                    <TableCell>{watcher.relationship}</TableCell>
                    <TableCell className="font-mono font-semibold">{watcher.contactNo || "—"}</TableCell>
                    <TableCell>
                      {watcher.assignments.length === 0 ? (
                        <span className="text-xs text-muted-foreground">Not assigned to a case</span>
                      ) : (
                        <div className="space-y-1.5">
                          {watcher.assignments.map((assignment) => (
                            <div key={assignment.id} className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-bold text-primary">
                                {assignment.caseCode ?? `Case #${assignment.caseId}`}
                              </span>
                              {!isOpenAssignment(assignment) && (
                                <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                                  {assignment.caseStatus}
                                </span>
                              )}
                              <RoleBadges isPrimary={assignment.isPrimary} isInformant={assignment.isInformant} />
                              <PassStatusBadge status={assignment.passStatus} passNumber={assignment.passNumber} />
                              {assignment.passNumber && (
                                <span className="font-mono text-[11px] text-muted-foreground">{assignment.passNumber}</span>
                              )}
                              {isOpenAssignment(assignment) && (
                                <AssignmentMenu
                                  isPrimary={assignment.isPrimary}
                                  passNumber={assignment.passNumber}
                                  passStatus={assignment.passStatus}
                                  onMakePrimary={() =>
                                    run(() => caseMutations.promoteWatcher(Number(assignment.id)), "Failed to make primary")
                                  }
                                  onIssuePass={() => setPassTarget({ id: assignment.id, fullName: watcher.fullName })}
                                  onRevokePass={() =>
                                    run(() => caseMutations.revokePass(Number(assignment.id)), "Failed to revoke pass")
                                  }
                                  onUnassign={() => handleUnassign(watcher, assignment)}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canAssign ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!canPerformActions}
                            title={!canPerformActions ? reason : undefined}
                            className="h-8.5 gap-1.5 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => setAssigningWatcher(watcher)}
                          >
                            <UserPlus className="size-4" /> Assign to Case
                          </Button>
                        ) : (
                          // A disabled button gets no hover events, so the tooltip hangs off a wrapping span.
                          <Tooltip>
                            <TooltipTrigger render={<span className="inline-flex" />} aria-label={assignBlockedReason}>
                              <Button variant="outline" size="sm" className="h-8.5 gap-1.5 text-xs font-semibold" disabled>
                                <UserPlus className="size-4" /> Assign to Case
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{assignBlockedReason}</TooltipContent>
                          </Tooltip>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex size-8.5 cursor-pointer items-center justify-center rounded-md border border-input bg-background p-0 text-muted-foreground shadow-2xs hover:bg-muted hover:text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                            <MoreHorizontal className="size-4.5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 space-y-0.5 p-1.5">
                            <DropdownMenuItem
                              disabled={!canPerformActions}
                              onClick={() => setEditingWatcher(watcher)}
                              className="cursor-pointer gap-2 px-2.5 py-2 text-xs font-semibold sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Edit className="size-4 shrink-0" /> Edit Watcher
                            </DropdownMenuItem>
                            {canAssign && (
                              <DropdownMenuItem
                                disabled={!canPerformActions}
                                onClick={() => setAssigningWatcher(watcher)}
                                className="cursor-pointer gap-2 px-2.5 py-2 text-xs font-semibold sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <UserPlus className="size-4 shrink-0" /> Assign to Case
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator className="my-1" />
                            <DropdownMenuItem
                              disabled={!canPerformActions || hasOpenAssignment}
                              title={hasOpenAssignment ? "Unassign from open cases first" : undefined}
                              onClick={() => handleRemove(watcher)}
                              className="cursor-pointer gap-2 px-2.5 py-2 text-xs font-semibold text-destructive focus:text-destructive sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Trash2 className="size-4 shrink-0" /> Remove Watcher
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
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
        editingWatcher={editingWatcher}
        defaults={{ contactNo: patient?.contactNo, address: patient?.address }}
        onSave={handleSaveWatcher}
        isSubmitting={watcherMutations.isCreating || watcherMutations.isUpdating}
      />

      <AssignWatcherDialog
        isOpen={assigningWatcher !== null}
        onClose={() => setAssigningWatcher(null)}
        openCases={openCases}
        watcher={assigningWatcher}
        onAssign={async (caseId, payload) => {
          await caseMutations.assignWatcher({ caseId, payload })
        }}
        isSubmitting={caseMutations.isAssigning}
      />

      <IssuePassDialog
        isOpen={passTarget !== null}
        onClose={() => setPassTarget(null)}
        watcher={passTarget}
        onIssuePass={async (assignmentId, passValidUntil) => {
          await caseMutations.issuePass({ watcherId: assignmentId, payload: { pass_valid_until: passValidUntil } })
        }}
        isSubmitting={caseMutations.isIssuingPass}
      />
    </Card>
  )
}
