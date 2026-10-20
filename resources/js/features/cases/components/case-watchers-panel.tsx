import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RecordHistoryPopover } from "@/features/audit/components/record-history-popover"
import { AssignWatcherDialog } from "@/features/patients/components/dialogs/assign-watcher-dialog"
import { IssuePassDialog } from "@/features/patients/components/dialogs/issue-pass-dialog"
import {
  AssignmentMenu,
  PassStatusBadge,
  RoleBadges,
} from "@/features/patients/components/watcher-assignment-parts"
import { usePatientWatchers } from "@/features/patients/hooks/use-patient-watchers"
import { useCaseWatcherMutations } from "../hooks/use-case-watcher-mutations"
import { useCaseWatchers } from "../hooks/use-case-watchers"
import type { CaseWatcher } from "../types/watcher.types"
import { Plus } from "lucide-react"

interface CaseWatchersPanelProps {
  caseId: number
  patientId: number
  caseCode: string
  /** Assigning, unassigning and passes are only possible while the case is open. */
  isOpen: boolean
}

/** The watchers assigned to one case, with the actions that belong to a case. */
export const CaseWatchersPanel: React.FC<CaseWatchersPanelProps> = ({
  caseId,
  patientId,
  caseCode,
  isOpen,
}) => {
  const { data: assignments = [], isLoading } = useCaseWatchers(caseId)
  const { data: patientWatchers = [] } = usePatientWatchers(patientId)
  const mutations = useCaseWatcherMutations({ caseId, patientId })

  const [isAssignOpen, setIsAssignOpen] = useState(false)
  const [passTarget, setPassTarget] = useState<CaseWatcher | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const run = async (action: () => Promise<unknown>, fallback: string) => {
    try {
      setErrorMessage(null)
      await action()
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : fallback)
    }
  }

  const handleUnassign = (watch: CaseWatcher) => {
    if (!window.confirm(`Unassign ${watch.fullName} from this case?`)) return
    run(() => mutations.deleteWatcher(Number(watch.id)), "Failed to unassign watcher")
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            Case Watchers &amp; Ward Access Passes
          </CardTitle>
          <CardDescription className="text-xs">
            Watchers assigned to case {caseCode}. Manage the people themselves under the patient's Watchers tab.
          </CardDescription>
        </div>
        {isOpen && (
          <Button className="h-10 gap-2 font-semibold" onClick={() => setIsAssignOpen(true)}>
            <Plus className="size-4" /> Assign Watcher
          </Button>
        )}
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
        ) : assignments.length === 0 ? (
          <div className="space-y-2 rounded-lg border border-dashed py-10 text-center text-muted-foreground">
            <p className="text-sm font-semibold">No Watchers Assigned to this Case</p>
            {isOpen && <p className="text-xs">Click "Assign Watcher" to assign an existing watcher or add a new person.</p>}
          </div>
        ) : (
          <Table className="text-sm">
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold">Watcher</TableHead>
                <TableHead className="font-bold">Relationship</TableHead>
                <TableHead className="font-bold">Contact No.</TableHead>
                <TableHead className="font-bold">Pass Number</TableHead>
                <TableHead className="font-bold">Valid Until</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                {isOpen && <TableHead className="text-right font-bold">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((watch) => (
                <TableRow key={watch.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{watch.fullName}</span>
                      <RoleBadges isPrimary={watch.isPrimary} isInformant={watch.isInformant} />
                      <RecordHistoryPopover
                        subjectType="PatientWatcher"
                        subjectId={watch.patientWatcherId}
                        label={`Watcher: ${watch.fullName}`}
                      />
                    </div>
                  </TableCell>
                  <TableCell>{watch.relationship}</TableCell>
                  <TableCell className="font-mono font-semibold">{watch.contactNo || "—"}</TableCell>
                  <TableCell className="font-mono font-bold text-primary">{watch.passNumber || "—"}</TableCell>
                  <TableCell className="text-xs">
                    {watch.passValidUntil ? watch.passValidUntil.substring(0, 10) : "—"}
                  </TableCell>
                  <TableCell>
                    <PassStatusBadge status={watch.passStatus} passNumber={watch.passNumber} />
                  </TableCell>
                  {isOpen && (
                    <TableCell className="text-right">
                      <AssignmentMenu
                        isPrimary={watch.isPrimary}
                        passNumber={watch.passNumber}
                        passStatus={watch.passStatus}
                        onMakePrimary={() => run(() => mutations.promoteWatcher(Number(watch.id)), "Failed to make primary")}
                        onIssuePass={() => setPassTarget(watch)}
                        onRevokePass={() => run(() => mutations.revokePass(Number(watch.id)), "Failed to revoke pass")}
                        onUnassign={() => handleUnassign(watch)}
                      />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <AssignWatcherDialog
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        openCases={[]}
        fixedCaseId={caseId}
        watchers={patientWatchers}
        onAssign={async (targetCaseId, payload) => {
          await mutations.assignWatcher({ caseId: targetCaseId, payload })
        }}
        isSubmitting={mutations.isAssigning}
      />

      <IssuePassDialog
        isOpen={passTarget !== null}
        onClose={() => setPassTarget(null)}
        watcher={passTarget}
        onIssuePass={async (assignmentId, passValidUntil) => {
          await mutations.issuePass({ watcherId: assignmentId, payload: { pass_valid_until: passValidUntil } })
        }}
        isSubmitting={mutations.isIssuingPass}
      />
    </Card>
  )
}
