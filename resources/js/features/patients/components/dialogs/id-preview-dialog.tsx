import React from "react"
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
import { Building2, CreditCard, Printer, QrCode, ShieldCheck } from "lucide-react"
import type { PatientRecord } from "../../types"

export interface IdPreviewData {
  idType: string
  idNumber: string
  dateIssued?: string
  dateExpiry?: string
  status?: string
  isVerified?: boolean
}

interface IdPreviewDialogProps {
  isOpen: boolean
  onClose: () => void
  patient: PatientRecord
  idData: IdPreviewData | null
}

export const IdPreviewDialog: React.FC<IdPreviewDialogProps> = ({
  isOpen,
  onClose,
  patient,
  idData,
}) => {
  if (!idData) return null

  const isPhilHealth = idData.idType.toLowerCase().includes("philhealth") || idData.idType.toLowerCase().includes("phic")
  const isSenior = idData.idType.toLowerCase().includes("senior")
  const isPwd = idData.idType.toLowerCase().includes("pwd")
  const isIndigency = idData.idType.toLowerCase().includes("indigency")

  // Color theme per ID type
  const themeClass = isPhilHealth
    ? "from-emerald-700 to-teal-900 text-white"
    : isSenior
    ? "from-amber-700 to-yellow-900 text-white"
    : isPwd
    ? "from-blue-700 to-indigo-900 text-white"
    : isIndigency
    ? "from-sky-700 to-cyan-900 text-white"
    : "from-slate-800 to-zinc-950 text-white"

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-fit max-w-fit max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <CreditCard className="size-5 text-primary" /> Digital Credential Preview
          </DialogTitle>
          <DialogDescription className="text-sm">
            Official digital verification preview for {patient.fullName}.
          </DialogDescription>
        </DialogHeader>

        {/* Visual ID Card Mockup — Standard CR80 Landscape Format */}
        <div className="py-2 flex flex-col items-center justify-center">
          <div className={`w-full max-w-lg aspect-[3.375/2.125] min-h-[300px] rounded-2xl p-5 shadow-xl bg-gradient-to-br ${themeClass} relative overflow-hidden border border-white/25 flex flex-col justify-between`}>
            {/* Background watermark effect */}
            <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
              <Building2 className="size-64" />
            </div>

            {/* Top Header Row: Emblem & Org Title */}
            <div className="flex items-start justify-between border-b border-white/25 pb-2.5 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center font-black text-xs border border-white/30 shrink-0">
                  ZCMC
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold opacity-80 leading-none">
                    Republic of the Philippines
                  </p>
                  <p className="text-xs font-black tracking-wide leading-tight mt-0.5">
                    ZAMBOANGA CITY MEDICAL CENTER
                  </p>
                  <p className="text-[9px] opacity-75 font-semibold leading-none">
                    Medical Social Services Department
                  </p>
                </div>
              </div>
              <Badge className="bg-white/25 text-white border-white/40 text-xs px-2.5 py-0.5 font-bold backdrop-blur-xs shrink-0">
                {idData.idType}
              </Badge>
            </div>

            {/* Middle Main Content Row */}
            <div className="grid grid-cols-3 gap-3 relative z-10 my-1 items-center">
              <div className="col-span-2 space-y-2">
                <div>
                  <p className="text-[10px] opacity-75 font-bold uppercase tracking-wider">Cardholder Name</p>
                  <p className="font-extrabold text-lg md:text-xl tracking-tight text-white drop-shadow-xs truncate">
                    {patient.fullName.toUpperCase()}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[9px] opacity-75 font-bold uppercase block">Hosp No.</span>
                    <span className="font-mono font-bold text-white/95">{patient.hospitalNo}</span>
                  </div>
                  <div>
                    <span className="text-[9px] opacity-75 font-bold uppercase block">MSWD ID</span>
                    <span className="font-mono font-bold text-white/95">{patient.mswdNo}</span>
                  </div>
                </div>
              </div>

              {/* ID Reference Number Box */}
              <div className="col-span-1 bg-black/30 backdrop-blur-md rounded-xl p-2.5 border border-white/20 text-center flex flex-col justify-center">
                <p className="text-[9px] opacity-80 font-bold uppercase tracking-wider text-white">
                  Ref Number
                </p>
                <p className="font-mono font-black text-sm md:text-base tracking-wider text-amber-300 mt-0.5 break-all">
                  {idData.idNumber}
                </p>
              </div>
            </div>

            {/* Bottom Footer Row: Dates, QR & Verification */}
            <div className="pt-2 border-t border-white/25 relative z-10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <QrCode className="size-8 text-white/90 shrink-0" />
                <div className="text-[10px]">
                  <span className="opacity-75 font-semibold block">Issued: {idData.dateIssued || patient.intakeDate.split("T")[0] || "Recorded"}</span>
                  {idData.dateExpiry && <span className="opacity-75 font-semibold block">Valid: {idData.dateExpiry}</span>}
                </div>
              </div>

              <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-lg border border-white/30 text-xs font-bold">
                <ShieldCheck className="size-3.5" /> {idData.status || "Verified"}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            size="default"
            className="h-11 px-5 text-sm font-bold gap-2"
            onClick={() => window.print()}
          >
            <Printer className="size-4" /> Print Digital Card
          </Button>
          <Button size="default" className="h-11 px-6 text-sm font-bold" onClick={onClose}>
            Close Preview
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
