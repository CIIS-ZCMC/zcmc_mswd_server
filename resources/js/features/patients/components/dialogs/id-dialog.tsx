import React, { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { CreditCard, Eye, QrCode } from "lucide-react"
import type { PatientRecord } from "../../types"

export interface CreateIdPayload {
  idType: string
  idNumber: string
  dateIssued?: string
  dateExpiry?: string
  status?: string
}

interface IdDialogProps {
  isOpen: boolean
  onClose: () => void
  patient: PatientRecord
  onSave: (payload: CreateIdPayload) => void
  isSaving?: boolean
}

const PRESET_ID_TYPES = [
  "PhilHealth Membership",
  "Senior Citizen ID",
  "PWD Identification Card",
  "Barangay Indigency Certificate",
  "National ID (PhilSys)",
  "SSS / GSIS Number",
  "Tax Identification Number (TIN)",
  "Voter's ID",
  "Passport",
  "Custom / Other",
]

export const IdDialog: React.FC<IdDialogProps> = ({
  isOpen,
  onClose,
  patient,
  onSave,
  isSaving = false,
}) => {
  const [selectedType, setSelectedType] = useState<string>("PhilHealth Membership")
  const [customType, setCustomType] = useState<string>("")
  const [idNumber, setIdNumber] = useState<string>("")
  const [dateIssued, setDateIssued] = useState<string>("")
  const [dateExpiry, setDateExpiry] = useState<string>("")
  const [status, setStatus] = useState<string>("Verified")

  const effectiveIdType = selectedType === "Custom / Other" ? (customType || "Custom Identification") : selectedType

  const handleSave = () => {
    if (!idNumber.trim()) return
    onSave({
      idType: effectiveIdType,
      idNumber: idNumber.trim(),
      dateIssued: dateIssued.trim() || undefined,
      dateExpiry: dateExpiry.trim() || undefined,
      status: status,
    })
    // Reset form
    setIdNumber("")
    setCustomType("")
    setDateIssued("")
    setDateExpiry("")
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full max-w-3xl rounded-[20px] p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-3 border-b border-[#e4e9f2] dark:border-border">
          <DialogTitle className="text-[18px] font-bold text-[#0c2a5b] dark:text-foreground flex items-center gap-2.5">
            <CreditCard className="size-5 text-[#1f5fd6]" /> Register New ID / Identification Credential
          </DialogTitle>
          <DialogDescription className="text-[12px] text-[#5b6678] dark:text-muted-foreground mt-1">
            Add verified government, health, or welfare identification recorded for {patient.fullName}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-3">
          {/* Left Form Inputs */}
          <div className="space-y-3.5">
            <div>
              <Label className="text-[12px] font-semibold text-[#5b6678] dark:text-muted-foreground">ID / Credential Type</Label>
              <Select value={selectedType} onValueChange={(val) => setSelectedType(val ?? selectedType)}>
                <SelectTrigger className="w-full h-[40px] text-[13px] font-medium text-[#1b2433] rounded-[10px] border-[#c6e8ee] mt-1 dark:text-foreground">
                  <SelectValue placeholder="Select ID Type" />
                </SelectTrigger>
                <SelectContent>
                  {PRESET_ID_TYPES.map((type) => (
                    <SelectItem key={type} value={type} className="text-[13px] py-1.5 font-medium">
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedType === "Custom / Other" && (
              <div>
                <Label className="text-[12px] font-semibold text-[#5b6678] dark:text-muted-foreground">Custom ID Title</Label>
                <Input
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  className="h-[40px] text-[13px] font-medium text-[#1b2433] rounded-[10px] border-[#c6e8ee] mt-1 dark:text-foreground"
                  placeholder="e.g. Solo Parent ID"
                />
              </div>
            )}

            <div>
              <Label className="text-[12px] font-semibold text-[#5b6678] dark:text-muted-foreground">ID / Reference Number *</Label>
              <Input
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                className="h-[40px] text-[13px] font-mono font-semibold text-[#1b2433] rounded-[10px] border-[#c6e8ee] mt-1 dark:text-foreground"
                placeholder="e.g. 12-345678901-2"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12px] font-semibold text-[#5b6678] dark:text-muted-foreground">Date Issued</Label>
                <Input
                  type="date"
                  value={dateIssued}
                  onChange={(e) => setDateIssued(e.target.value)}
                  className="h-[40px] text-[13px] font-medium text-[#1b2433] rounded-[10px] border-[#c6e8ee] mt-1 dark:text-foreground"
                />
              </div>
              <div>
                <Label className="text-[12px] font-semibold text-[#5b6678] dark:text-muted-foreground">Expiry Date</Label>
                <Input
                  type="date"
                  value={dateExpiry}
                  onChange={(e) => setDateExpiry(e.target.value)}
                  className="h-[40px] text-[13px] font-medium text-[#1b2433] rounded-[10px] border-[#c6e8ee] mt-1 dark:text-foreground"
                />
              </div>
            </div>

            <div>
              <Label className="text-[12px] font-semibold text-[#5b6678] dark:text-muted-foreground">Verification Status</Label>
              <Select value={status} onValueChange={(val) => setStatus(val ?? status)}>
                <SelectTrigger className="w-full h-[40px] text-[13px] font-medium text-[#1b2433] rounded-[10px] border-[#c6e8ee] mt-1 dark:text-foreground">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Verified" className="text-[13px] py-1.5 font-medium">
                    Verified
                  </SelectItem>
                  <SelectItem value="Active" className="text-[13px] py-1.5 font-medium">
                    Active
                  </SelectItem>
                  <SelectItem value="Valid" className="text-[13px] py-1.5 font-medium">
                    Valid
                  </SelectItem>
                  <SelectItem value="Pending" className="text-[13px] py-1.5 font-medium">
                    Pending Verification
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Right Live Digital ID Card Preview */}
          <div className="flex flex-col items-center justify-center space-y-3 bg-[#f4f7fc] p-5 rounded-[16px] border border-[#e4e9f2] dark:bg-muted/40 dark:border-border/60">
            <div className="flex items-center gap-2 text-[11px] font-bold text-[#5b6678] uppercase tracking-wider mb-1 dark:text-muted-foreground">
              <Eye className="size-4 text-[#1f5fd6]" /> Live Digital Card Preview
            </div>

            <div className="w-full aspect-[3.375/2.125] min-h-[240px] rounded-[16px] p-4 shadow-lg bg-gradient-to-br from-[#1f5fd6] to-[#0c2a5b] text-white relative overflow-hidden border border-white/20 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-white/25 pb-2">
                <div>
                  <p className="text-[9px] uppercase font-bold opacity-80 leading-none">ZCMC - MSSD</p>
                  <p className="text-[13px] font-black truncate max-w-[180px] mt-0.5">{effectiveIdType}</p>
                </div>
                <Badge className="bg-white/20 text-white text-[11px] px-2.5 py-0.5 font-semibold border-white/30 shrink-0">
                  {status}
                </Badge>
              </div>

              <div className="space-y-1.5 my-1">
                <div>
                  <p className="text-[9px] opacity-75 font-bold uppercase">Cardholder Name</p>
                  <p className="font-extrabold text-[14px] md:text-[15px] tracking-tight text-white truncate">
                    {patient.fullName.toUpperCase()}
                  </p>
                </div>

                <div>
                  <p className="text-[9px] opacity-75 font-bold uppercase">Ref Number</p>
                  <p className="font-mono font-black text-[13px] md:text-[14px] text-amber-300 truncate">
                    {idNumber || "•••• •••• ••••"}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-white/20">
                <span className="opacity-90 font-semibold">Hosp #: {patient.hospitalNo}</span>
                <div className="flex items-center gap-1.5">
                  <QrCode className="size-4 opacity-90" />
                  <span className="font-mono font-bold opacity-80 text-[10px]">OFFICIAL</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-[#5b6678] text-center pt-1 font-medium dark:text-muted-foreground">
              Live card preview updates automatically as fields are filled in.
            </p>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-[#e4e9f2] dark:border-border">
          <Button
            type="button"
            variant="outline"
            className="h-[36px] rounded-full border border-[#cfd7e4] px-[16px] text-[13px] font-semibold text-[#0c2a5b] transition-colors hover:bg-[#f4f7fc] active:scale-[0.98] dark:border-border dark:text-foreground dark:hover:bg-muted"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-[36px] rounded-full bg-[#1f5fd6] px-[20px] text-[13px] font-semibold text-white shadow-xs transition-colors hover:bg-[#1a53bd] active:scale-[0.98]"
            disabled={!idNumber.trim() || isSaving}
            onClick={handleSave}
          >
            {isSaving ? <Spinner className="size-4" /> : "Save Identification Credential"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
