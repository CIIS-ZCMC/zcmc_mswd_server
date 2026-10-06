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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RecordHistoryPopover } from "@/features/audit/components/record-history-popover"
import { Pencil, Plus, Trash2 } from "lucide-react"
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
  const [memberToDelete, setMemberToDelete] = useState<FamilyMember | null>(null)

  return (
    <Card className="shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border/40">
        <div>
          <CardTitle className="text-base font-bold">
            Family Composition &amp; Household Dependents
          </CardTitle>
          <CardDescription className="text-sm mt-1">
            Household members, employment status, and monthly income breakdown for {patient.fullName}.
          </CardDescription>
        </div>
        <Button
          variant="default"
          size="default"
          className="h-10 px-4 text-sm font-bold gap-2 shadow-xs cursor-pointer"
          onClick={onOpenAddFamilyDialog}
        >
          <Plus className="size-4.5" /> Add Family Member
        </Button>
      </CardHeader>
      <CardContent className="pt-5">
        <div className="overflow-x-auto">
          <Table className="text-base">
            <TableHeader>
              <TableRow className="border-b border-border/60">
                <TableHead className="font-extrabold text-foreground text-base">Full Name</TableHead>
                <TableHead className="font-extrabold text-foreground text-base">Relationship</TableHead>
                <TableHead className="font-extrabold text-foreground text-base">Civil Status</TableHead>
                <TableHead className="font-extrabold text-foreground text-base">Age</TableHead>
                <TableHead className="font-extrabold text-foreground text-base">Sex</TableHead>
                <TableHead className="font-extrabold text-foreground text-base">Contact Number</TableHead>
                <TableHead className="font-extrabold text-foreground text-base">Occupation</TableHead>
                <TableHead className="font-extrabold text-foreground text-base">Educational Attainment</TableHead>
                <TableHead className="font-extrabold text-foreground text-base">Monthly Income</TableHead>
                <TableHead className="font-extrabold text-foreground text-base">Living With Patient</TableHead>
                <TableHead className="font-extrabold text-foreground text-base text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patient.familyMembers.map((fam) => (
                <TableRow key={fam.id} className="hover:bg-muted/40 transition-colors">
                  <TableCell className="font-bold text-foreground text-base">
                    <div className="flex items-center gap-2">
                      <span>{fam.fullName}</span>
                      {/* Must be the model's class basename — the server resolves
                          subject_type as App\Models\{type}, so "FamilyMember"
                          silently matches nothing. */}
                      <RecordHistoryPopover subjectType="PatientFamilyMember" subjectId={fam.id} label={`Family: ${fam.fullName}`} />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-base">{fam.relationship}</TableCell>
                  <TableCell className="font-medium text-base">{fam.civilStatus || "—"}</TableCell>
                  <TableCell className="font-medium text-base">{fam.age} yrs</TableCell>
                  <TableCell className="capitalize font-medium text-base">{fam.sex || "N/A"}</TableCell>
                  <TableCell className="font-mono font-medium text-base">{fam.contactNumber || "N/A"}</TableCell>
                  <TableCell className="font-medium text-base">{fam.occupation || "N/A"}</TableCell>
                  <TableCell className="font-medium text-base">{fam.educationalAttainment || "N/A"}</TableCell>
                  <TableCell className="font-mono font-bold text-primary text-base">
                    ₱{fam.monthlyIncome.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={fam.isLivingWithPatient ? "secondary" : "outline"}
                      className="text-sm px-3 py-1 font-bold"
                    >
                      {fam.isLivingWithPatient ? "Yes" : "No"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      {onOpenEditFamilyDialog && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 px-3 text-sm font-bold gap-1.5 cursor-pointer"
                          onClick={() => onOpenEditFamilyDialog(fam)}
                        >
                          <Pencil className="size-4 text-primary" /> Edit
                        </Button>
                      )}
                      {onDeleteFamilyMember && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 px-3 text-sm font-bold gap-1.5 text-destructive hover:bg-destructive/10 cursor-pointer"
                          onClick={() => setMemberToDelete(fam)}
                        >
                          <Trash2 className="size-4" /> Remove
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <AlertDialog open={memberToDelete !== null} onOpenChange={(open) => !open && setMemberToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-bold">Remove Family Member</AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-muted-foreground mt-1">
                Are you sure you want to remove <strong>{memberToDelete?.fullName}</strong> from {patient.fullName}&apos;s family composition?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel className="font-semibold">Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
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
      </CardContent>
    </Card>
  )
}

