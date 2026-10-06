import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RecordHistoryPopover } from "@/features/audit/components/record-history-popover"
import { Briefcase, Edit, Heart, MapPin, Phone, User } from "lucide-react"
import { useUpdatePatientBackground } from "../../hooks/use-patient-writes"
import type { PatientRecord } from "../../types"
import { PatientBackgroundDialog } from "../dialogs/patient-background-dialog"
import { PatientContactDialog } from "../dialogs/patient-contact-dialog"

interface ProfileTabProps {
  patient: PatientRecord
}

export const ProfileTab: React.FC<ProfileTabProps> = ({ patient }) => {
  const [isEditingBackground, setIsEditingBackground] = useState(false)
  const [isEditingContact, setIsEditingContact] = useState(false)
  const updateBackground = useUpdatePatientBackground(patient.id)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* 1. Personal Demographics */}
      <Card className="flex flex-col shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3.5 border-b border-border/40">
          <CardTitle className="text-lg md:text-xl flex items-center gap-2.5 font-bold">
            <User className="size-6 text-primary" /> Personal Demographics
            <RecordHistoryPopover subjectType="Patient" subjectId={patient.id} label="Personal Demographics" />
          </CardTitle>
          <Button
            variant="outline"
            size="default"
            className="h-9 px-3.5 text-sm gap-2 font-bold"
            onClick={() => setIsEditingBackground(true)}
          >
            <Edit className="size-4" /> Edit Profile
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 text-base flex-1 pt-4">
          <div>
            <span className="text-muted-foreground font-semibold text-sm">Full Name:</span>
            <p className="font-bold text-lg md:text-xl text-foreground mt-0.5">{patient.fullName}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-border/50 pt-3">
            <div>
              <span className="text-muted-foreground font-semibold text-sm">Age / Gender:</span>
              <p className="font-bold text-base mt-0.5">
                {patient.age} yrs / {patient.gender}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground font-semibold text-sm">Birth Date:</span>
              <p className="font-bold text-base mt-0.5">{patient.birthDate || "Not on file"}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-border/50 pt-3">
            <div>
              <span className="text-muted-foreground font-semibold text-sm">Place of Birth:</span>
              <p className="font-semibold text-base mt-0.5">{patient.placeOfBirth || "Not on file"}</p>
            </div>
            <div>
              <span className="text-muted-foreground font-semibold text-sm">Civil Status:</span>
              <p className="font-semibold text-base mt-0.5">{patient.civilStatus || "Not on file"}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-border/50 pt-3">
            <div>
              <span className="text-muted-foreground font-semibold text-sm">Religion:</span>
              <p className="font-semibold text-base mt-0.5">{patient.religion || "Not on file"}</p>
            </div>
            <div>
              <span className="text-muted-foreground font-semibold text-sm">Nationality:</span>
              <p className="font-semibold text-base mt-0.5">{patient.nationality || "Not on file"}</p>
            </div>
          </div>

          <div className="border-t border-border/50 pt-3">
            <span className="text-muted-foreground font-semibold text-sm">Educational Attainment:</span>
            <p className="font-semibold text-base mt-0.5">{patient.educationalAttainment || "Not on file"}</p>
          </div>
        </CardContent>
      </Card>

      {/* 2. Contact & Residence */}
      <Card className="flex flex-col shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3.5 border-b border-border/40">
          <CardTitle className="text-lg md:text-xl flex items-center gap-2.5 font-bold">
            <MapPin className="size-6 text-primary" /> Contact &amp; Residence Information
          </CardTitle>
          <Button
            variant="outline"
            size="default"
            className="h-9 px-3.5 text-sm gap-2 font-bold"
            onClick={() => setIsEditingContact(true)}
          >
            <Edit className="size-4" /> Edit
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 text-base flex-1 pt-4">
          <div>
            <span className="text-muted-foreground font-semibold text-sm">Contact Number:</span>
            <p className="font-bold text-base md:text-lg flex items-center gap-2 text-foreground mt-0.5 font-mono">
              <Phone className="size-4.5 text-primary" /> {patient.contactNo || "Not on file"}
            </p>
          </div>

          <div className="border-t border-border/50 pt-3">
            <span className="text-muted-foreground font-semibold text-sm">Barangay &amp; City:</span>
            <p className="font-bold text-base mt-0.5">
              {patient.barangay ? `${patient.barangay}, ${patient.city}` : patient.city || "Not on file"}
            </p>
          </div>

          <div className="border-t border-border/50 pt-3">
            <span className="text-muted-foreground font-semibold text-sm">Primary Address:</span>
            <p className="font-semibold text-base text-foreground mt-0.5">{patient.address || "Not on file"}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border/50 pt-3">
            <div>
              <span className="text-muted-foreground font-semibold text-sm">Present Address:</span>
              <p className="font-semibold text-base mt-0.5">{patient.presentAddress || "Not on file"}</p>
            </div>
            <div>
              <span className="text-muted-foreground font-semibold text-sm">Permanent Address:</span>
              <p className="font-semibold text-base mt-0.5">{patient.permanentAddress || "Not on file"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Admission & Medical Diagnosis */}
      <Card className="flex flex-col shadow-xs">
        <CardHeader className="pb-3.5 border-b border-border/40">
          <CardTitle className="text-lg md:text-xl flex items-center gap-2.5 font-bold">
            <Heart className="size-6 text-primary" /> Admission &amp; Medical Diagnosis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-base flex-1 pt-4">
          <div>
            <span className="text-muted-foreground font-semibold text-sm">Admission Status:</span>
            <p className="font-bold text-base md:text-lg text-primary mt-0.5">
              {patient.admissionStatus}
            </p>
          </div>

          <div className="border-t border-border/50 pt-3">
            <span className="text-muted-foreground font-semibold text-sm">Ward &amp; Bed:</span>
            <p className="font-bold text-base md:text-lg mt-0.5">
              {patient.ward} - {patient.bedNo}
            </p>
          </div>

          <div className="border-t border-border/50 pt-3">
            <span className="text-muted-foreground font-semibold text-sm">Clinical Diagnosis:</span>
            <p className="font-semibold text-base text-foreground leading-relaxed mt-0.5">
              {patient.diagnosis}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 4. Socio-Economic & Employment */}
      <Card className="flex flex-col shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3.5 border-b border-border/40">
          <CardTitle className="text-lg md:text-xl flex items-center gap-2.5 font-bold">
            <Briefcase className="size-6 text-primary" /> Socio-Economic &amp; Employment
          </CardTitle>
          <Button
            variant="outline"
            size="default"
            className="h-9 px-3.5 text-sm gap-2 font-bold"
            onClick={() => setIsEditingBackground(true)}
          >
            <Edit className="size-4" /> Edit
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 text-base flex-1 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-muted-foreground font-semibold text-sm">Occupation:</span>
              <p className="font-semibold text-base mt-0.5">{patient.occupation || "Not on file"}</p>
            </div>
            <div>
              <span className="text-muted-foreground font-semibold text-sm">Employer:</span>
              <p className="font-semibold text-base mt-0.5">{patient.employer || "Not on file"}</p>
            </div>
          </div>

          <div className="border-t border-border/50 pt-3">
            <span className="text-muted-foreground font-semibold text-sm">Patient Monthly Income:</span>
            <p className="font-bold text-lg md:text-xl text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
              {patient.monthlyIncome != null ? `₱${patient.monthlyIncome.toLocaleString()}` : "Not on file"}
            </p>
          </div>
        </CardContent>
      </Card>

      <PatientBackgroundDialog
        isOpen={isEditingBackground}
        onClose={() => setIsEditingBackground(false)}
        patient={patient}
        isSaving={updateBackground.isPending}
        onSave={(payload) =>
          updateBackground.mutate(payload, { onSuccess: () => setIsEditingBackground(false) })
        }
      />

      <PatientContactDialog
        isOpen={isEditingContact}
        onClose={() => setIsEditingContact(false)}
        patient={patient}
        isSaving={updateBackground.isPending}
        onSave={(payload) =>
          updateBackground.mutate(payload, { onSuccess: () => setIsEditingContact(false) })
        }
      />
    </div>
  )
}


