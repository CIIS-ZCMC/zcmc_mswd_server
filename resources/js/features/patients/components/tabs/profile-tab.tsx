import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RecordHistoryPopover } from "@/features/audit/components/record-history-popover"
import { Briefcase, Edit, MapPin, Phone, User } from "lucide-react"
import { useUpdatePatientBackground } from "../../hooks/use-patient-writes"
import type { FamilyMember, PatientRecord } from "../../types"
import { PatientBackgroundDialog } from "../dialogs/patient-background-dialog"
import { PatientContactDialog } from "../dialogs/patient-contact-dialog"
import { FamilyTab } from "./family-tab"

interface ProfileTabProps {
  patient: PatientRecord
  onOpenAddFamilyDialog?: () => void
  onOpenEditFamilyDialog?: (member: FamilyMember) => void
  onDeleteFamilyMember?: (memberId: string) => void
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  patient,
  onOpenAddFamilyDialog,
  onOpenEditFamilyDialog,
  onDeleteFamilyMember,
}) => {
  const [isEditingBackground, setIsEditingBackground] = useState(false)
  const [isEditingContact, setIsEditingContact] = useState(false)
  const updateBackground = useUpdatePatientBackground(patient.id)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 1. Personal Demographics */}
        <Card className="flex h-full flex-col shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border/40 pb-3.5">
            <CardTitle className="flex items-center gap-2.5 text-lg font-bold md:text-xl">
              <User className="size-6 text-primary" /> Personal Demographics
              <RecordHistoryPopover
                subjectType="Patient"
                subjectId={patient.id}
                label="Personal Demographics"
              />
            </CardTitle>
            <Button
              variant="outline"
              size="default"
              className="h-9 gap-2 px-3.5 text-sm font-bold"
              onClick={() => setIsEditingBackground(true)}
            >
              <Edit className="size-4" /> Edit Profile
            </Button>
          </CardHeader>
          <CardContent className="flex-1 space-y-4 pt-4 text-base">
            <div>
              <span className="text-sm font-semibold text-muted-foreground">
                Full Name:
              </span>
              <p className="mt-0.5 text-lg font-bold text-foreground md:text-xl">
                {patient.fullName}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-border/50 pt-3">
              <div>
                <span className="text-sm font-semibold text-muted-foreground">
                  Age / Gender:
                </span>
                <p className="mt-0.5 text-base font-bold">
                  {patient.age} yrs / {patient.gender}
                </p>
              </div>
              <div>
                <span className="text-sm font-semibold text-muted-foreground">
                  Birth Date:
                </span>
                <p className="mt-0.5 text-base font-bold">
                  {patient.birthDate || "Not on file"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-border/50 pt-3">
              <div>
                <span className="text-sm font-semibold text-muted-foreground">
                  Place of Birth:
                </span>
                <p className="mt-0.5 text-base font-semibold">
                  {patient.placeOfBirth || "Not on file"}
                </p>
              </div>
              <div>
                <span className="text-sm font-semibold text-muted-foreground">
                  Civil Status:
                </span>
                <p className="mt-0.5 text-base font-semibold">
                  {patient.civilStatus || "Not on file"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-border/50 pt-3">
              <div>
                <span className="text-sm font-semibold text-muted-foreground">
                  Religion:
                </span>
                <p className="mt-0.5 text-base font-semibold">
                  {patient.religion || "Not on file"}
                </p>
              </div>
              <div>
                <span className="text-sm font-semibold text-muted-foreground">
                  Nationality:
                </span>
                <p className="mt-0.5 text-base font-semibold">
                  {patient.nationality || "Not on file"}
                </p>
              </div>
            </div>

            <div className="border-t border-border/50 pt-3">
              <span className="text-sm font-semibold text-muted-foreground">
                Educational Attainment:
              </span>
              <p className="mt-0.5 text-base font-semibold">
                {patient.educationalAttainment || "Not on file"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 2. Contact & Residence */}
        <Card className="flex h-full flex-col shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border/40 pb-3.5">
            <CardTitle className="flex items-center gap-2.5 text-lg font-bold md:text-xl">
              <MapPin className="size-6 text-primary" /> Contact &amp; Residence
              Information
            </CardTitle>
            <Button
              variant="outline"
              size="default"
              className="h-9 gap-2 px-3.5 text-sm font-bold"
              onClick={() => setIsEditingContact(true)}
            >
              <Edit className="size-4" /> Edit
            </Button>
          </CardHeader>
          <CardContent className="flex-1 space-y-4 pt-4 text-base">
            <div>
              <span className="text-sm font-semibold text-muted-foreground">
                Contact Number:
              </span>
              <p className="mt-0.5 flex items-center gap-2 font-mono text-base font-bold text-foreground md:text-lg">
                <Phone className="size-4.5 text-primary" />{" "}
                {patient.contactNo || "Not on file"}
              </p>
            </div>

            <div className="border-t border-border/50 pt-3">
              <span className="text-sm font-semibold text-muted-foreground">
                Barangay &amp; City:
              </span>
              <p className="mt-0.5 text-base font-bold">
                {patient.barangay
                  ? `${patient.barangay}, ${patient.city}`
                  : patient.city || "Not on file"}
              </p>
            </div>

            <div className="border-t border-border/50 pt-3">
              <span className="text-sm font-semibold text-muted-foreground">
                Primary Address:
              </span>
              <p className="mt-0.5 text-base font-semibold text-foreground">
                {patient.address || "Not on file"}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 border-t border-border/50 pt-3 md:grid-cols-2">
              <div>
                <span className="text-sm font-semibold text-muted-foreground">
                  Present Address:
                </span>
                <p className="mt-0.5 text-base font-semibold">
                  {patient.presentAddress || "Not on file"}
                </p>
              </div>
              <div>
                <span className="text-sm font-semibold text-muted-foreground">
                  Permanent Address:
                </span>
                <p className="mt-0.5 text-base font-semibold">
                  {patient.permanentAddress || "Not on file"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Socio-Economic & Employment */}
        <Card className="flex h-full flex-col shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border/40 pb-3.5">
            <CardTitle className="flex items-center gap-2.5 text-lg font-bold md:text-xl">
              <Briefcase className="size-6 text-primary" /> Socio-Economic &amp;
              Employment
            </CardTitle>
            <Button
              variant="outline"
              size="default"
              className="h-9 gap-2 px-3.5 text-sm font-bold"
              onClick={() => setIsEditingBackground(true)}
            >
              <Edit className="size-4" /> Edit
            </Button>
          </CardHeader>
          <CardContent className="flex-1 space-y-4 pt-4 text-base">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-semibold text-muted-foreground">
                  Occupation:
                </span>
                <p className="mt-0.5 text-base font-semibold">
                  {patient.occupation || "Not on file"}
                </p>
              </div>
              <div>
                <span className="text-sm font-semibold text-muted-foreground">
                  Employer:
                </span>
                <p className="mt-0.5 text-base font-semibold">
                  {patient.employer || "Not on file"}
                </p>
              </div>
            </div>

            <div className="border-t border-border/50 pt-3">
              <span className="text-sm font-semibold text-muted-foreground">
                Patient Monthly Income:
              </span>
              <p className="mt-0.5 font-mono text-lg font-bold text-emerald-600 md:text-xl dark:text-emerald-400">
                {patient.monthlyIncome != null
                  ? `₱${patient.monthlyIncome.toLocaleString()}`
                  : "Not on file"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Family Composition & Household Dependents */}
      <FamilyTab
        patient={patient}
        onOpenAddFamilyDialog={onOpenAddFamilyDialog ?? (() => {})}
        onOpenEditFamilyDialog={onOpenEditFamilyDialog}
        onDeleteFamilyMember={onDeleteFamilyMember}
      />

      <PatientBackgroundDialog
        isOpen={isEditingBackground}
        onClose={() => setIsEditingBackground(false)}
        patient={patient}
        isSaving={updateBackground.isPending}
        onSave={(payload) =>
          updateBackground.mutate(payload, {
            onSuccess: () => setIsEditingBackground(false),
          })
        }
      />

      <PatientContactDialog
        isOpen={isEditingContact}
        onClose={() => setIsEditingContact(false)}
        patient={patient}
        isSaving={updateBackground.isPending}
        onSave={(payload) =>
          updateBackground.mutate(payload, {
            onSuccess: () => setIsEditingContact(false),
          })
        }
      />
    </div>
  )
}
