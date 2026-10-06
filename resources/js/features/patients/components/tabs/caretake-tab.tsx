import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Briefcase, ArrowRight, Plus, ShieldCheck, UserCheck, History, UserMinus, UserCheck2 } from "lucide-react"
import { usePermission } from "@/features/auth/hooks/use-permission"
import type { PatientRecord } from "../../types"
import {
  CARETAKER_ROLE_LABELS,
  type CaretakerAssignment,
} from "../../types/caretake.types"
import { AssignCaretakerDialog } from "../dialogs/assign-caretaker-dialog"
import { ReassignCaretakerDialog } from "../dialogs/reassign-caretaker-dialog"
import { UnassignCaretakerDialog } from "../dialogs/unassign-caretaker-dialog"

interface CaretakeTabProps {
  patient: PatientRecord
}

export const CaretakeTab: React.FC<CaretakeTabProps> = ({ patient }) => {
  const canUpdate = usePermission("patients.update")

  const [isAssignOpen, setIsAssignOpen] = useState(false)
  const [reassignCaretaker, setReassignCaretaker] = useState<CaretakerAssignment | null>(null)
  const [unassignCaretaker, setUnassignCaretaker] = useState<CaretakerAssignment | null>(null)

  const activeCaretakers = patient.caretakers.filter((c) => c.isActive)
  const endedCaretakers = patient.caretakers.filter((c) => !c.isActive)

  const findReplacementUser = (replacedById?: string) => {
    if (!replacedById) return null
    const found = patient.caretakers.find((c) => c.id === replacedById)
    return found ? found.user.name : null
  }

  return (
    <div className="space-y-6">
      {/* Caretake Section Header & Controls */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" />
              Patient Custody &amp; Caretaker Assignments
            </CardTitle>
            <CardDescription className="text-xs">
              Standing custody assignments for overall patient care and hospital safety-net management.
            </CardDescription>
          </div>
          {canUpdate && (
            <Button
              size="default"
              className="gap-2 font-bold h-10 px-4 shrink-0"
              onClick={() => setIsAssignOpen(true)}
            >
              <Plus className="size-4" /> Assign Caretaker
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Episode Handler Banner */}
          <div className="rounded-xl border border-border bg-muted/40 p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                <Briefcase className="size-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-semibold">
                  Latest Episode Handler (Case-Level)
                </div>
                <div className="font-extrabold text-foreground text-base">
                  {patient.assignedStaff.socialWorker || "Unassigned"}
                </div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground font-mono bg-background px-3 py-1.5 rounded-lg border border-border/80">
              {patient.caseStudy?.caseNumber ? `Case #${patient.caseStudy.caseNumber}` : "Episode Active"}
              {patient.assignedStaff.assignedDate ? ` • Opened ${patient.assignedStaff.assignedDate}` : ""}
            </div>
          </div>

          {/* Active Caretakers Grid */}
          <div>
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <UserCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
              Active Caretakers ({activeCaretakers.length})
            </h3>

            {activeCaretakers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground text-sm">
                No active standing caretakers assigned to this patient.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeCaretakers.map((caretaker) => (
                  <div
                    key={caretaker.id}
                    className="rounded-xl border border-border p-5 bg-card shadow-2xs space-y-3 relative flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Badge variant="default" className="text-xs font-bold px-2.5 py-0.5">
                            {CARETAKER_ROLE_LABELS[caretaker.role]}
                          </Badge>
                          <h4 className="font-extrabold text-base text-foreground mt-2">
                            {caretaker.user.name}
                          </h4>
                        </div>
                        <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-500/30 bg-emerald-500/10 font-bold">
                          Active Custody
                        </Badge>
                      </div>

                      <div className="text-xs text-muted-foreground space-y-1 font-mono pt-1">
                        <div>Assigned: {caretaker.assignedDate}</div>
                        {caretaker.assignedBy && <div>By: {caretaker.assignedBy}</div>}
                        {caretaker.reason && (
                          <div className="font-sans text-xs italic text-foreground/80 mt-1">
                            &ldquo;{caretaker.reason}&rdquo;
                          </div>
                        )}
                      </div>
                    </div>

                    {canUpdate && (
                      <div className="flex items-center gap-2 pt-3 border-t border-border/60">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs font-bold flex-1 h-9"
                          onClick={() => setReassignCaretaker(caretaker)}
                        >
                          <UserCheck2 className="size-3.5" /> Reassign
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs font-bold text-destructive hover:bg-destructive/10 flex-1 h-9"
                          onClick={() => setUnassignCaretaker(caretaker)}
                        >
                          <UserMinus className="size-3.5" /> Unassign
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assignment History Chain */}
          <div className="pt-2 border-t border-border">
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <History className="size-4 text-muted-foreground" />
              Assignment Handover History ({endedCaretakers.length})
            </h3>

            {endedCaretakers.length === 0 ? (
              <div className="text-xs text-muted-foreground italic py-2">
                No past caretaker handovers or unassignments recorded.
              </div>
            ) : (
              <div className="space-y-3">
                {endedCaretakers.map((ended) => {
                  const replacementName = findReplacementUser(ended.replacedById)
                  return (
                    <div
                      key={ended.id}
                      className="rounded-xl border border-border/80 p-4 bg-muted/20 text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{ended.user.name}</span>
                          <Badge variant="outline" className="text-xs font-semibold">
                            {CARETAKER_ROLE_LABELS[ended.role]}
                          </Badge>
                          {replacementName && (
                            <Badge variant="secondary" className="text-xs font-bold gap-1 text-primary">
                              Replaced by {replacementName} <ArrowRight className="size-3" />
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Ended: {ended.unassignedDate || "Past"} {ended.unassignedBy ? `by ${ended.unassignedBy}` : ""}
                          {ended.unassignedReason ? ` — "${ended.unassignedReason}"` : ""}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs font-mono shrink-0">
                        Ended
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Caretaker Action Dialogs */}
      <AssignCaretakerDialog
        isOpen={isAssignOpen}
        patientId={patient.id}
        activeCaretakers={patient.caretakers}
        onClose={() => setIsAssignOpen(false)}
      />

      <ReassignCaretakerDialog
        isOpen={reassignCaretaker !== null}
        patientId={patient.id}
        caretaker={reassignCaretaker}
        onClose={() => setReassignCaretaker(null)}
      />

      <UnassignCaretakerDialog
        isOpen={unassignCaretaker !== null}
        patientId={patient.id}
        caretaker={unassignCaretaker}
        onClose={() => setUnassignCaretaker(null)}
      />
    </div>
  )
}
