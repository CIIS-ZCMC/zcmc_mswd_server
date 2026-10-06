import React, { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, CreditCard, Eye, Plus } from "lucide-react"
import type { PatientIdCredential, PatientRecord } from "../../types"
import { IdDialog, type CreateIdPayload } from "../dialogs/id-dialog"
import { IdPreviewDialog, type IdPreviewData } from "../dialogs/id-preview-dialog"

interface IdTabProps {
  patient: PatientRecord
}

export const IdTab: React.FC<IdTabProps> = ({ patient }) => {
  const [isAddIdOpen, setIsAddIdOpen] = useState(false)
  const [selectedPreview, setSelectedPreview] = useState<IdPreviewData | null>(null)
  const [customIds, setCustomIds] = useState<PatientIdCredential[]>(patient.customIds || [])

  const handleCreateId = (payload: CreateIdPayload) => {
    const newCred: PatientIdCredential = {
      id: String(Date.now()),
      idType: payload.idType,
      idNumber: payload.idNumber,
      dateIssued: payload.dateIssued,
      dateExpiry: payload.dateExpiry,
      status: payload.status || "Verified",
      isVerified: true,
    }
    setCustomIds((prev) => [newCred, ...prev])
    setIsAddIdOpen(false)
  }

  type CredentialRow = {
    idType: string
    idNumber: string
    status: string
    isVerified: boolean
    description: string
    dateIssued?: string
    dateExpiry?: string
  }

  const allCredentials: CredentialRow[] = [
    {
      idType: "PhilHealth Membership",
      idNumber: patient.philHealthNo || "Not on file",
      status: patient.philHealthNo ? "Verified" : "Not Recorded",
      isVerified: Boolean(patient.philHealthNo),
      description: "National Health Insurance Program Credential",
    },
    {
      idType: "Barangay Indigency Certificate",
      idNumber: patient.barangay ? `IND-BRGY-${patient.barangay.toUpperCase().replace(/\s+/g, "")}` : "Not on file",
      status: "Valid",
      isVerified: true,
      description: `Issued by Barangay ${patient.barangay || "Community"}`,
    },
    ...(patient.seniorCitizenId
      ? [
          {
            idType: "Senior Citizen ID",
            idNumber: patient.seniorCitizenId,
            status: "Active",
            isVerified: true,
            description: "OSCA Registered Senior Identification Card",
          },
        ]
      : []),
    ...(patient.pwdId
      ? [
          {
            idType: "PWD Identification Card",
            idNumber: patient.pwdId,
            status: "Active",
            isVerified: true,
            description: "PDAO Registered Persons with Disability Card",
          },
        ]
      : []),
    ...customIds.map((item) => ({
      idType: item.idType,
      idNumber: item.idNumber,
      status: item.status || "Verified",
      isVerified: true,
      description: item.dateIssued ? `Issued on ${item.dateIssued}` : "Government / Welfare Credential",
      dateIssued: item.dateIssued,
      dateExpiry: item.dateExpiry,
    })),
  ]

  return (
    <Card className="shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border/40">
        <div>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <CreditCard className="size-6 text-primary" /> Government &amp; Health Identification Credentials
          </CardTitle>
          <CardDescription className="text-sm mt-1">
            Verified IDs, health insurance numbers, and indigency documents recorded for {patient.fullName}.
          </CardDescription>
        </div>
        <Button
          variant="default"
          size="default"
          className="h-10 px-4 text-sm font-bold gap-2"
          onClick={() => setIsAddIdOpen(true)}
        >
          <Plus className="size-4.5" /> Add New ID
        </Button>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-base pt-5">
        {allCredentials.map((cred, index) => (
          <div
            key={`${cred.idType}-${index}`}
            className="flex items-start justify-between rounded-2xl border border-border/70 p-5 bg-card shadow-2xs hover:border-primary/40 transition-all gap-4"
          >
            <div className="space-y-1 flex-1">
              <p className="font-bold text-lg text-foreground">{cred.idType}</p>
              <p className="font-mono text-base font-bold text-primary">
                {cred.idNumber}
              </p>
              <p className="text-xs text-muted-foreground font-medium">{cred.description}</p>
            </div>

            {/* Right column: Badge on top, View button stacked directly underneath */}
            <div className="flex flex-col items-end gap-2.5 shrink-0">
              <Badge
                variant="outline"
                className={`gap-1.5 px-3 py-1 text-xs font-bold ${
                  cred.isVerified
                    ? "text-emerald-600 border-emerald-500 bg-emerald-500/10"
                    : "text-muted-foreground border-border"
                }`}
              >
                <CheckCircle2 className="size-4" /> {cred.status}
              </Badge>

              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs font-bold gap-1.5 shadow-2xs hover:bg-primary/10 hover:text-primary transition-colors"
                onClick={() =>
                  setSelectedPreview({
                    idType: cred.idType,
                    idNumber: cred.idNumber,
                    status: cred.status,
                    isVerified: cred.isVerified,
                    dateIssued: cred.dateIssued,
                    dateExpiry: cred.dateExpiry,
                  })
                }
              >
                <Eye className="size-3.5 text-primary" /> View Digital Card
              </Button>
            </div>
          </div>
        ))}
      </CardContent>

      {/* Add New ID Dialog */}
      <IdDialog
        isOpen={isAddIdOpen}
        onClose={() => setIsAddIdOpen(false)}
        patient={patient}
        onSave={handleCreateId}
      />

      {/* Digital ID Card Preview Modal */}
      <IdPreviewDialog
        isOpen={Boolean(selectedPreview)}
        onClose={() => setSelectedPreview(null)}
        patient={patient}
        idData={selectedPreview}
      />
    </Card>
  )
}

