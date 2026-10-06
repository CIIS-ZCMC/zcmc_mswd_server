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
      <DialogContent className="w-full max-w-3xl p-7 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2 border-b border-border/40">
          <DialogTitle className="text-2xl font-extrabold flex items-center gap-2.5">
            <CreditCard className="size-6 text-primary" /> Register New ID / Identification Credential
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground mt-1">
            Add verified government, health, or welfare identification recorded for {patient.fullName}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-7 py-4">
          {/* Left Form Inputs */}
          <div className="space-y-5">
            <div>
              <Label className="text-[17px] font-bold text-foreground">ID / Credential Type</Label>
              <Select value={selectedType} onValueChange={(val) => setSelectedType(val ?? selectedType)}>
                <SelectTrigger className="h-12 text-base font-medium mt-1.5 px-4">
                  <SelectValue placeholder="Select ID Type" />
                </SelectTrigger>
                <SelectContent>
                  {PRESET_ID_TYPES.map((type) => (
                    <SelectItem key={type} value={type} className="text-base py-2.5 font-medium">
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedType === "Custom / Other" && (
              <div>
                <Label className="text-[17px] font-bold text-foreground">Custom ID Title</Label>
                <Input
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  className="h-12 text-base font-medium mt-1.5 px-4"
                  placeholder="e.g. Solo Parent ID"
                />
              </div>
            )}

            <div>
              <Label className="text-[17px] font-bold text-foreground">ID / Reference Number *</Label>
              <Input
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                className="h-12 text-base font-mono font-bold mt-1.5 px-4"
                placeholder="e.g. 12-345678901-2"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[17px] font-bold text-foreground">Date Issued</Label>
                <Input
                  type="date"
                  value={dateIssued}
                  onChange={(e) => setDateIssued(e.target.value)}
                  className="h-12 text-base font-medium mt-1.5 px-3"
                />
              </div>
              <div>
                <Label className="text-[17px] font-bold text-foreground">Expiry Date</Label>
                <Input
                  type="date"
                  value={dateExpiry}
                  onChange={(e) => setDateExpiry(e.target.value)}
                  className="h-12 text-base font-medium mt-1.5 px-3"
                />
              </div>
            </div>

            <div>
              <Label className="text-[17px] font-bold text-foreground">Verification Status</Label>
              <Select value={status} onValueChange={(val) => setStatus(val ?? status)}>
                <SelectTrigger className="h-12 text-base font-medium mt-1.5 px-4">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Verified" className="text-base py-2.5 font-medium">
                    Verified
                  </SelectItem>
                  <SelectItem value="Active" className="text-base py-2.5 font-medium">
                    Active
                  </SelectItem>
                  <SelectItem value="Valid" className="text-base py-2.5 font-medium">
                    Valid
                  </SelectItem>
                  <SelectItem value="Pending" className="text-base py-2.5 font-medium">
                    Pending Verification
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Right Live Digital ID Card Preview */}
          <div className="flex flex-col items-center justify-center space-y-3 bg-muted/40 p-5 rounded-2xl border border-border/60">
            <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">
              <Eye className="size-4.5 text-primary" /> Live Digital Card Preview
            </div>

            <div className="w-full aspect-[3.375/2.125] min-h-[250px] rounded-2xl p-5 shadow-lg bg-gradient-to-br from-primary/90 to-slate-900 text-primary-foreground relative overflow-hidden border border-white/20 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-white/25 pb-2.5">
                <div>
                  <p className="text-[10px] uppercase font-bold opacity-80 leading-none">ZCMC - MSSD</p>
                  <p className="text-sm font-black truncate max-w-[180px] mt-0.5">{effectiveIdType}</p>
                </div>
                <Badge className="bg-white/20 text-white text-xs px-2.5 py-0.5 font-bold border-white/30 shrink-0">
                  {status}
                </Badge>
              </div>

              <div className="space-y-2 my-1">
                <div>
                  <p className="text-[10px] opacity-75 font-bold uppercase">Cardholder Name</p>
                  <p className="font-extrabold text-base md:text-lg tracking-tight text-white truncate">
                    {patient.fullName.toUpperCase()}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] opacity-75 font-bold uppercase">Ref Number</p>
                  <p className="font-mono font-black text-sm md:text-base text-amber-300 truncate">
                    {idNumber || "•••• •••• ••••"}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-white/20">
                <span className="opacity-90 font-semibold">Hosp #: {patient.hospitalNo}</span>
                <div className="flex items-center gap-1.5">
                  <QrCode className="size-5 opacity-90" />
                  <span className="font-mono font-bold opacity-80">OFFICIAL</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center pt-1 font-medium">
              Live card preview updates automatically as fields are filled in.
            </p>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-border/40">
          <Button
            size="lg"
            className="h-12 text-lg font-bold px-8 shadow-sm"
            disabled={!idNumber.trim() || isSaving}
            onClick={handleSave}
          >
            {isSaving ? <Spinner className="size-5" /> : "Save Identification Credential"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
