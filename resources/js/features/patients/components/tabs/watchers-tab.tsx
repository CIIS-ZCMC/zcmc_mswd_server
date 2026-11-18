import React, { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { RecordHistoryPopover } from "@/features/audit/components/record-history-popover"
import { useQueueActionGate } from "@/features/queue"
import { useCaseWatcherMutations } from "@/features/cases/hooks/use-case-watcher-mutations"
import { usePatientWatcherMutations, usePatientWatchers } from "../../hooks/use-patient-watchers"
import type { PatientRecord } from "../../types"
import type { OpenCase, Watcher, WatcherAssignment } from "../../types/watcher.types"
import { AssignWatcherDialog } from "../dialogs/assign-watcher-dialog"
import { IssuePassDialog } from "../dialogs/issue-pass-dialog"
import { WatcherDialog } from "../dialogs/watcher-dialog"
import {
  Edit,
  MoreHorizontal,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Star,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react"

interface WatchersTabProps {
  patient?: Partial<PatientRecord> | null
  patientId?: number
  /** The patient's open cases, which a watcher can be assigned to. */
  openCases?: OpenCase[]
}

const isOpenAssignment = (a: WatcherAssignment) =>
  a.caseStatus === "open" || a.caseStatus === "ongoing"

const messageOf = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback

function formatValidUntil(dateStr?: string | null): string {
  if (!dateStr) return "—"
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ]
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
  } catch {
    return dateStr
  }
}

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
  const [passTarget, setPassTarget] = useState<{
    id: string
    fullName: string
    passValidUntil?: string | null
  } | null>(null)
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
    if (
      !window.confirm(
        `Unassign ${watcher.fullName} from case ${assignment.caseCode ?? assignment.caseId}?`
      )
    )
      return
    run(() => caseMutations.deleteWatcher(Number(assignment.id)), "Failed to unassign watcher")
  }

  return (
    <div className="w-full font-[Plus_Jakarta_Sans,sans-serif]">
      {/* Main Section Card */}
      <div className="relative flex w-full flex-col items-center overflow-hidden rounded-[16px] border border-[#e4e9f2] bg-white pb-[15px] shadow-[0px_1px_2px_0px_rgba(12,42,91,0.04),0px_2px_6px_0px_rgba(12,42,91,0.05)] dark:border-border dark:bg-card">
        {/* Top Header Row */}
        <div className="flex w-full items-center justify-between gap-[12px] px-[24px] pt-[18px] pb-[14px]">
          <div className="flex items-center gap-[12px]">
            <div className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-[#edf3fe] dark:bg-muted">
              <img
                src="/images/patient-registry/tab-watchers.svg"
                alt=""
                className="size-[20px]"
              />
            </div>
            <div className="flex flex-col items-start min-w-0">
              <h2 className="text-[16px] font-bold leading-tight text-[#0c2a5b] dark:text-foreground">
                Watchers &amp; ward access passes
              </h2>
              <div className="mt-0.5 text-[13px] text-[#5b6678] dark:text-muted-foreground">
                Who may stay with the patient during this admission
              </div>
            </div>
          </div>

          {/* Add watcher button */}
          <button
            type="button"
            disabled={!canPerformActions}
            title={!canPerformActions ? reason : undefined}
            onClick={() => setIsAddOpen(true)}
            className="flex h-[38px] cursor-pointer items-center gap-[6px] rounded-full bg-[#1f5fd6] px-[16px] text-[13px] font-semibold text-white shadow-[0px_6px_7px_rgba(31,95,214,0.25)] transition-all hover:bg-[#1a53bd] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="size-[18px] text-white" />
            <span>Add watcher</span>
          </button>
        </div>

        {errorMessage && (
          <div className="mx-[24px] mb-3 flex w-[calc(100%-48px)] items-center justify-between rounded-[10px] border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <span>{errorMessage}</span>
            <button
              type="button"
              className="cursor-pointer font-bold hover:underline"
              onClick={() => setErrorMessage(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Table Header Row */}
        <div className="w-full px-[24px]">
          <div className="flex w-full items-center gap-[12px] rounded-[10px] bg-[#f4f7fc] px-[14px] py-[10px] text-[12px] font-semibold text-[#5b6678] dark:bg-muted/60 dark:text-muted-foreground">
            <div className="min-w-0 flex-1">Watcher</div>
            <div className="w-[100px] shrink-0">Relationship</div>
            <div className="w-[130px] shrink-0">Contact no.</div>
            <div className="w-[110px] shrink-0">Pass number</div>
            <div className="w-[100px] shrink-0">Valid until</div>
            <div className="w-[110px] shrink-0">Status</div>
            <div className="w-[44px] shrink-0" />
          </div>
        </div>

        {/* Table Content */}
        {isLoading ? (
          <div className="flex w-full justify-center py-12">
            <Spinner className="size-6 text-primary" />
          </div>
        ) : watchers.length === 0 ? (
          <div className="w-full space-y-2 px-4 py-12 text-center">
            <Users className="mx-auto size-8 text-muted-foreground/40" />
            <h4 className="text-[14px] font-bold text-foreground">No Watchers Recorded</h4>
            <p className="mx-auto max-w-sm text-[12px] text-muted-foreground">
              Click &quot;Add watcher&quot; to register a family member or other watcher for this patient.
            </p>
          </div>
        ) : (
          <div className="flex w-full flex-col px-[24px]">
            {watchers.map((watcher) => {
              const hasOpenAssignment = watcher.assignments.some(isOpenAssignment)
              const canAssign = openCases.some(
                (c) => !watcher.assignments.some((a) => a.caseId === String(c.id))
              )

              // Prefer an open assignment that has an active pass, or any open assignment, or the latest assignment
              const activeAssignment =
                watcher.assignments.find((a) => isOpenAssignment(a) && a.passNumber) ??
                watcher.assignments.find((a) => isOpenAssignment(a)) ??
                watcher.assignments[0] ??
                null

              const validUntil = formatValidUntil(activeAssignment?.passValidUntil)
              const passStatus = activeAssignment?.passStatus ?? null
              const isPrimary = activeAssignment?.isPrimary ?? false

              const initial =
                (watcher.fullName?.trim() || "?")[0]?.toUpperCase() ?? "?"

              return (
                <div
                  key={watcher.id}
                  className="group flex w-full items-center gap-[12px] border-b border-[#e4e9f2] px-[14px] py-[12px] transition-colors hover:bg-[#f4f7fc]/50 dark:border-border dark:hover:bg-muted/40"
                >
                  {/* Col 1: Watcher Avatar + Name */}
                  <div className="flex min-w-0 flex-1 items-center gap-[10px]">
                    <div className="flex size-[32px] shrink-0 items-center justify-center rounded-full bg-[#e0f5f8] text-[12px] font-bold text-[#0a6b78] dark:bg-cyan-950/40 dark:text-cyan-300">
                      {initial}
                    </div>
                    <div className="flex min-w-0 flex-col items-start">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="truncate text-[13px] font-semibold text-[#0c2a5b] dark:text-foreground">
                          {watcher.fullName}
                        </span>
                        {isPrimary && (
                          <span className="rounded-full bg-[#edf3fe] px-[6px] py-[1px] text-[10px] font-bold text-[#1f5fd6] dark:bg-primary/20 dark:text-primary">
                            Primary
                          </span>
                        )}
                        <RecordHistoryPopover
                          subjectType="PatientWatcher"
                          subjectId={watcher.id}
                          label={`Watcher: ${watcher.fullName}`}
                        />
                      </div>
                      {watcher.address && (
                        <span className="truncate text-[11px] text-[#5b6678] dark:text-muted-foreground">
                          {watcher.address}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Col 2: Relationship */}
                  <div className="w-[100px] shrink-0 text-[13px] text-[#1b2433] dark:text-foreground">
                    {watcher.relationship}
                  </div>

                  {/* Col 3: Contact no. */}
                  <div className="w-[130px] shrink-0 font-mono text-[13px] text-[#1b2433] dark:text-foreground">
                    {watcher.contactNo || "—"}
                  </div>

                  {/* Col 4: Pass number */}
                  <div className="w-[110px] shrink-0 text-[13px]">
                    {activeAssignment?.passNumber ? (
                      <span className="font-mono font-medium text-[#1b2433] dark:text-foreground">
                        {activeAssignment.passNumber}
                      </span>
                    ) : (
                      <span className="text-[#5b6678] dark:text-muted-foreground">
                        Not issued
                      </span>
                    )}
                  </div>

                  {/* Col 5: Valid until */}
                  <div className="w-[100px] shrink-0 text-[13px] text-[#5b6678] dark:text-muted-foreground">
                    {validUntil}
                  </div>

                  {/* Col 6: Status */}
                  <div className="w-[110px] shrink-0">
                    {passStatus === "active" ? (
                      <span className="inline-block rounded-full bg-[#e8f6ef] px-[10px] py-[3px] text-[12px] font-semibold text-[#146b43] dark:bg-emerald-950/40 dark:text-emerald-300">
                        Active pass
                      </span>
                    ) : passStatus === "expired" ? (
                      <span className="inline-block rounded-full bg-[#fde8e8] px-[10px] py-[3px] text-[12px] font-semibold text-[#9b1c1c] dark:bg-red-950/40 dark:text-red-300">
                        Expired
                      </span>
                    ) : passStatus === "revoked" ? (
                      <span className="inline-block rounded-full bg-[#fde8e8] px-[10px] py-[3px] text-[12px] font-semibold text-[#9b1c1c] dark:bg-red-950/40 dark:text-red-300">
                        Revoked
                      </span>
                    ) : (
                      <span className="inline-block rounded-full bg-[#eef1f6] px-[10px] py-[3px] text-[12px] font-semibold text-[#4a5568] dark:bg-muted dark:text-muted-foreground">
                        No pass yet
                      </span>
                    )}
                  </div>

                  {/* Col 7: Actions */}
                  <div className="flex w-[44px] shrink-0 justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="flex size-[34px] cursor-pointer items-center justify-center rounded-full border border-[#cfd7e4] bg-white text-[#5b6678] transition-colors hover:bg-[#f4f7fc] hover:text-[#0c2a5b] focus:outline-none dark:border-border dark:bg-card dark:text-muted-foreground dark:hover:bg-muted"
                        aria-label={`More actions for ${watcher.fullName}`}
                      >
                        <MoreHorizontal className="size-[16px]" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-56 space-y-0.5 rounded-[16px] border border-[#e4e9f2] bg-white p-1.5 shadow-xl dark:border-border dark:bg-card"
                      >
                        {/* Pass & Assignment Actions */}
                        {activeAssignment && isOpenAssignment(activeAssignment) && (
                          <>
                            {!activeAssignment.passNumber ? (
                              <DropdownMenuItem
                                disabled={!canPerformActions}
                                onClick={() =>
                                  setPassTarget({
                                    id: activeAssignment.id,
                                    fullName: watcher.fullName,
                                  })
                                }
                                className="cursor-pointer gap-2 rounded-[10px] px-2.5 py-2 text-[13px] font-medium text-[#1b2433] transition-colors hover:bg-[#edf3fe] hover:text-[#1f5fd6] disabled:opacity-50 dark:text-foreground dark:hover:bg-muted"
                              >
                                <ShieldCheck className="size-4 shrink-0 text-[#1f5fd6]" />
                                Issue Ward Pass
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                disabled={!canPerformActions}
                                onClick={() =>
                                  run(
                                    () =>
                                      caseMutations.revokePass(Number(activeAssignment.id)),
                                    "Failed to revoke pass"
                                  )
                                }
                                className="cursor-pointer gap-2 rounded-[10px] px-2.5 py-2 text-[13px] font-medium text-amber-600 transition-colors hover:bg-amber-50 disabled:opacity-50 dark:hover:bg-amber-950/30"
                              >
                                <ShieldAlert className="size-4 shrink-0 text-amber-600" />
                                Revoke Ward Pass
                              </DropdownMenuItem>
                            )}

                            {!activeAssignment.isPrimary && (
                              <DropdownMenuItem
                                disabled={!canPerformActions}
                                onClick={() =>
                                  run(
                                    () =>
                                      caseMutations.promoteWatcher(
                                        Number(activeAssignment.id)
                                      ),
                                    "Failed to make primary"
                                  )
                                }
                                className="cursor-pointer gap-2 rounded-[10px] px-2.5 py-2 text-[13px] font-medium text-[#1b2433] transition-colors hover:bg-[#edf3fe] hover:text-[#1f5fd6] disabled:opacity-50 dark:text-foreground dark:hover:bg-muted"
                              >
                                <Star className="size-4 shrink-0 text-[#1f5fd6]" />
                                Make Primary Watcher
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem
                              disabled={!canPerformActions}
                              onClick={() => handleUnassign(watcher, activeAssignment)}
                              className="cursor-pointer gap-2 rounded-[10px] px-2.5 py-2 text-[13px] font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                            >
                              <UserMinus className="size-4 shrink-0 text-destructive" />
                              Unassign from Case
                            </DropdownMenuItem>

                            <DropdownMenuSeparator className="my-1 border-t border-[#e4e9f2] dark:border-border" />
                          </>
                        )}

                        {canAssign && (
                          <DropdownMenuItem
                            disabled={!canPerformActions}
                            onClick={() => setAssigningWatcher(watcher)}
                            className="cursor-pointer gap-2 rounded-[10px] px-2.5 py-2 text-[13px] font-medium text-[#1b2433] transition-colors hover:bg-[#edf3fe] hover:text-[#1f5fd6] disabled:opacity-50 dark:text-foreground dark:hover:bg-muted"
                          >
                            <UserPlus className="size-4 shrink-0 text-[#1f5fd6]" />
                            Assign to Case
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuItem
                          disabled={!canPerformActions}
                          onClick={() => setEditingWatcher(watcher)}
                          className="cursor-pointer gap-2 rounded-[10px] px-2.5 py-2 text-[13px] font-medium text-[#1b2433] transition-colors hover:bg-[#edf3fe] hover:text-[#1f5fd6] disabled:opacity-50 dark:text-foreground dark:hover:bg-muted"
                        >
                          <Edit className="size-4 shrink-0 text-[#5b6678] dark:text-muted-foreground" />
                          Edit Watcher Details
                        </DropdownMenuItem>

                        <DropdownMenuSeparator className="my-1 border-t border-[#e4e9f2] dark:border-border" />

                        <DropdownMenuItem
                          disabled={!canPerformActions || hasOpenAssignment}
                          title={hasOpenAssignment ? "Unassign from open cases first" : undefined}
                          onClick={() => handleRemove(watcher)}
                          className="cursor-pointer gap-2 rounded-[10px] px-2.5 py-2 text-[13px] font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                        >
                          <Trash2 className="size-4 shrink-0 text-destructive" />
                          Remove Watcher
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <WatcherDialog
        isOpen={isAddOpen || editingWatcher !== null}
        onClose={() => {
          setIsAddOpen(false)
          setEditingWatcher(null)
        }}
        editingWatcher={editingWatcher}
        defaults={{ contactNo: patient?.contactNo, address: patient?.presentAddressPsgc }}
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
          await caseMutations.issuePass({
            watcherId: assignmentId,
            payload: { pass_valid_until: passValidUntil },
          })
        }}
        isSubmitting={caseMutations.isIssuingPass}
      />
    </div>
  )
}
