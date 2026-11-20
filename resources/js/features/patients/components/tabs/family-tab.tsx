import React, { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { RecordHistoryPopover } from "@/features/audit/components/record-history-popover"
import { useQueueActionGate } from "@/features/queue"
import { MoreHorizontal, Pencil, Plus, Trash2, Users } from "lucide-react"
import type { FamilyMember, PatientRecord } from "../../types"

interface FamilyTabProps {
  patient: PatientRecord
  onOpenAddFamilyDialog: () => void
  onOpenEditFamilyDialog?: (member: FamilyMember) => void
  onDeleteFamilyMember?: (memberId: string) => void
}

export const FamilyTab: React.FC<FamilyTabProps> = ({
  patient,
  onOpenAddFamilyDialog,
  onOpenEditFamilyDialog,
  onDeleteFamilyMember,
}) => {
  const [memberToDelete, setMemberToDelete] = useState<FamilyMember | null>(
    null
  )
  const { canPerformActions, reason } = useQueueActionGate()

  return (
    <div className="w-full font-[Plus_Jakarta_Sans,sans-serif]">
      {/* Main Section Card */}
      <div className="relative flex w-full flex-col items-center overflow-hidden rounded-[16px] border border-[#e4e9f2] bg-white pb-[15px] shadow-[0px_1px_2px_0px_rgba(12,42,91,0.04),0px_2px_6px_0px_rgba(12,42,91,0.05)] dark:border-border dark:bg-card">
        {/* Top Header Row */}
        <div className="flex w-full items-center justify-between gap-[12px] px-[24px] pt-[18px] pb-[14px]">
          <div className="flex items-center gap-[12px]">
            <div className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-[#edf3fe] dark:bg-muted">
              <img
                src="/images/patient-registry/section-demographics.svg"
                alt=""
                className="size-[20px]"
              />
            </div>
            <div className="flex min-w-0 flex-col items-start">
              <h2 className="text-[16px] leading-tight font-bold text-[#0c2a5b] dark:text-foreground">
                Family composition &amp; household members
              </h2>
              <div className="mt-0.5 text-[13px] text-[#5b6678] dark:text-muted-foreground">
                Household members, relationship, and monthly income breakdown
                for {patient.fullName}
              </div>
            </div>
          </div>

          {/* Add family member button */}
          <button
            type="button"
            disabled={!canPerformActions}
            title={!canPerformActions ? reason : undefined}
            onClick={onOpenAddFamilyDialog}
            className="flex h-[38px] cursor-pointer items-center gap-[6px] rounded-full bg-[#1f5fd6] px-[16px] text-[13px] font-semibold text-white shadow-[0px_6px_7px_rgba(31,95,214,0.25)] transition-all hover:bg-[#1a53bd] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="size-[18px] text-white" />
            <span>Add family member</span>
          </button>
        </div>

        {/* Table Header Row */}
        <div className="w-full px-[24px]">
          <div className="flex w-full items-center gap-[12px] rounded-[10px] bg-[#f4f7fc] px-[14px] py-[10px] text-[12px] font-semibold text-[#5b6678] dark:bg-muted/60 dark:text-muted-foreground">
            <div className="min-w-0 flex-1">Full name</div>
            <div className="w-[110px] shrink-0">Relationship</div>
            <div className="w-[90px] shrink-0">Age / Sex</div>
            <div className="w-[100px] shrink-0">Civil status</div>
            <div className="w-[170px] shrink-0">Work &amp; Education</div>
            <div className="w-[120px] shrink-0">Monthly income</div>
            <div className="w-[110px] shrink-0">Household</div>
            <div className="w-[44px] shrink-0" />
          </div>
        </div>

        {/* Table Content */}
        {patient.familyMembers.length === 0 ? (
          <div className="w-full space-y-2 px-4 py-12 text-center">
            <Users className="mx-auto size-8 text-muted-foreground/40" />
            <h4 className="text-[14px] font-bold text-foreground">
              No Family Members Recorded
            </h4>
            <p className="mx-auto max-w-sm text-[12px] text-muted-foreground">
              Click &quot;Add family member&quot; to register household members
              and dependents.
            </p>
          </div>
        ) : (
          <div className="flex w-full flex-col px-[24px]">
            {patient.familyMembers.map((fam) => {
              const initial =
                (fam.fullName?.trim() || "?")[0]?.toUpperCase() ?? "?"

              return (
                <div
                  key={fam.id}
                  className="group flex w-full items-center gap-[12px] border-b border-[#e4e9f2] px-[14px] py-[12px] transition-colors hover:bg-[#f4f7fc]/50 dark:border-border dark:hover:bg-muted/40"
                >
                  {/* Col 1: Avatar + Name */}
                  <div className="flex min-w-0 flex-1 items-center gap-[10px]">
                    <div className="flex size-[32px] shrink-0 items-center justify-center rounded-full bg-[#e0f5f8] text-[12px] font-bold text-[#0a6b78] dark:bg-cyan-950/40 dark:text-cyan-300">
                      {initial}
                    </div>
                    <div className="flex min-w-0 flex-col items-start">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="truncate text-[13px] font-semibold text-[#0c2a5b] dark:text-foreground">
                          {fam.fullName}
                        </span>
                        <RecordHistoryPopover
                          subjectType="PatientFamilyMember"
                          subjectId={fam.id}
                          label={`Family: ${fam.fullName}`}
                        />
                      </div>
                      {fam.contactNumber && (
                        <span className="truncate font-mono text-[11px] text-[#5b6678] dark:text-muted-foreground">
                          {fam.contactNumber}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Col 2: Relationship */}
                  <div className="w-[110px] shrink-0 text-[13px] font-medium text-[#1b2433] dark:text-foreground">
                    {fam.relationship}
                  </div>

                  {/* Col 3: Age / Sex */}
                  <div className="w-[90px] shrink-0 text-[13px] text-[#1b2433] dark:text-foreground">
                    {fam.age} yrs{fam.sex ? ` · ${fam.sex}` : ""}
                  </div>

                  {/* Col 4: Civil status */}
                  <div className="w-[100px] shrink-0 text-[13px] text-[#5b6678] dark:text-muted-foreground">
                    {fam.civilStatus || "—"}
                  </div>

                  {/* Col 5: Work & Education */}
                  <div className="flex w-[170px] shrink-0 flex-col items-start truncate">
                    <span className="w-full truncate text-[13px] font-medium text-[#1b2433] dark:text-foreground">
                      {fam.occupation || "No formal work"}
                    </span>
                    <span className="w-full truncate text-[11px] text-[#5b6678] dark:text-muted-foreground">
                      {fam.educationalAttainment || "—"}
                    </span>
                  </div>

                  {/* Col 6: Monthly income */}
                  <div className="w-[120px] shrink-0 font-mono text-[13px] font-bold text-[#146b43] dark:text-emerald-400">
                    ₱{fam.monthlyIncome.toLocaleString()}
                  </div>

                  {/* Col 7: Living with patient */}
                  <div className="w-[110px] shrink-0">
                    {fam.isLivingWithPatient ? (
                      <span className="inline-block rounded-full bg-[#e8f6ef] px-[10px] py-[3px] text-[12px] font-semibold text-[#146b43] dark:bg-emerald-950/40 dark:text-emerald-300">
                        Living with
                      </span>
                    ) : (
                      <span className="inline-block rounded-full bg-[#eef1f6] px-[10px] py-[3px] text-[12px] font-semibold text-[#4a5568] dark:bg-muted dark:text-muted-foreground">
                        Separate
                      </span>
                    )}
                  </div>

                  {/* Col 8: Actions */}
                  <div className="flex w-[44px] shrink-0 justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="flex size-[34px] cursor-pointer items-center justify-center rounded-full border border-[#cfd7e4] bg-white text-[#5b6678] transition-colors hover:bg-[#f4f7fc] hover:text-[#0c2a5b] focus:outline-none dark:border-border dark:bg-card dark:text-muted-foreground dark:hover:bg-muted"
                        aria-label={`Actions for ${fam.fullName}`}
                      >
                        <MoreHorizontal className="size-[16px]" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-48 space-y-0.5 rounded-[16px] border border-[#e4e9f2] bg-white p-1.5 shadow-xl dark:border-border dark:bg-card"
                      >
                        {onOpenEditFamilyDialog && (
                          <DropdownMenuItem
                            disabled={!canPerformActions}
                            onClick={() => onOpenEditFamilyDialog(fam)}
                            className="cursor-pointer gap-2 rounded-[10px] px-2.5 py-2 text-[13px] font-medium text-[#1b2433] transition-colors hover:bg-[#edf3fe] hover:text-[#1f5fd6] disabled:opacity-50 dark:text-foreground dark:hover:bg-muted"
                          >
                            <Pencil className="size-4 text-[#1f5fd6]" />
                            <span>Edit Member</span>
                          </DropdownMenuItem>
                        )}
                        {onDeleteFamilyMember && (
                          <DropdownMenuItem
                            disabled={!canPerformActions}
                            onClick={() => setMemberToDelete(fam)}
                            className="cursor-pointer gap-2 rounded-[10px] px-2.5 py-2 text-[13px] font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                          >
                            <Trash2 className="size-4" />
                            <span>Remove Member</span>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <AlertDialog
          open={memberToDelete !== null}
          onOpenChange={(open) => !open && setMemberToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-[18px] font-bold text-[#0c2a5b] dark:text-foreground">
                Remove Family Member
              </AlertDialogTitle>
              <AlertDialogDescription className="mt-1 text-[13px] text-[#5b6678] dark:text-muted-foreground">
                Are you sure you want to remove{" "}
                <strong className="text-foreground">
                  {memberToDelete?.fullName}
                </strong>{" "}
                from {patient.fullName}&apos;s family composition?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel className="h-[36px] rounded-full border border-[#cfd7e4] px-[16px] text-[13px] font-semibold text-[#0c2a5b] hover:bg-[#f4f7fc]">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="h-[36px] rounded-full bg-destructive px-[16px] text-[13px] font-semibold text-white hover:bg-destructive/90"
                onClick={() => {
                  if (memberToDelete && onDeleteFamilyMember) {
                    onDeleteFamilyMember(memberToDelete.id)
                  }
                  setMemberToDelete(null)
                }}
              >
                Remove Member
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
