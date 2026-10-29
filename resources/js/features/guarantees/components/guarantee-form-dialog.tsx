import React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CreditCard } from "lucide-react"
import { GuaranteeForm } from "./guarantee-form"
import type { PatientGuarantee } from "../types"

export interface GuaranteeFormDialogProps {
  patientId: number | string
  transactionId: number | string
  guarantee?: PatientGuarantee | null
  initialGuarantorId?: number | null
  initialGuarantorName?: string | null
  lockGuarantor?: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const GuaranteeFormDialog: React.FC<GuaranteeFormDialogProps> = ({
  patientId,
  transactionId,
  guarantee,
  initialGuarantorId,
  initialGuarantorName,
  lockGuarantor = false,
  open,
  onOpenChange,
}) => {
  const isEditing = Boolean(guarantee?.id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-primary sm:text-xl">
            <CreditCard className="size-5 shrink-0 text-primary" />
            {isEditing ? "Edit Patient Guarantor" : "Add Patient Guarantor"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground sm:text-sm">
            Record the guarantor for this hospital encounter and break it down
            by type of assistance, mode of assistance and fund source.
          </DialogDescription>
        </DialogHeader>

        <GuaranteeForm
          patientId={patientId}
          transactionId={transactionId}
          guarantee={guarantee}
          initialGuarantorId={initialGuarantorId}
          initialGuarantorName={initialGuarantorName}
          lockGuarantor={lockGuarantor}
          onSuccess={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
