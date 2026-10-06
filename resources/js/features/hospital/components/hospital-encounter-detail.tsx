import React from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import type { HospitalEncounter, HospitalLookup } from "../types/hospital-transaction.types"
import { Calendar, CreditCard, FileText, Stethoscope } from "lucide-react"

const PLACEHOLDER = "—"

function lookupText(value: HospitalLookup | null): string {
  return value?.description ?? PLACEHOLDER
}

function text(value: string | null): string {
  return value && value.trim() !== "" ? value : PLACEHOLDER
}

function peso(amount: number | null): string {
  if (amount === null) return PLACEHOLDER
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount)
}

const Field: React.FC<{ label: string; value: string; className?: string }> = ({ label, value, className = "" }) => (
  <div className={`space-y-0.5 ${className}`}>
    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className="text-sm sm:text-base font-semibold text-foreground break-words">{value}</div>
  </div>
)

interface HospitalEncounterDetailProps {
  encounter: HospitalEncounter
}

export const HospitalEncounterDetail: React.FC<HospitalEncounterDetailProps> = ({ encounter }) => {
  return (
    <div className="space-y-4 pt-1">
      {/* Overview & Service Details */}
      <Card className="border shadow-2xs bg-card/60">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm sm:text-base text-primary border-b pb-2">
            <Stethoscope className="w-4 h-4 text-primary shrink-0" />
            Service & Admission Details
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Service type" value={lookupText(encounter.serviceType)} />
            <Field label="Admission case type" value={lookupText(encounter.admissionCaseType)} />
            <Field label="Admission result" value={lookupText(encounter.admissionResult)} />
            <Field label="Hospital plan" value={lookupText(encounter.hospitalPlan)} />
            <Field label="Discount" value={lookupText(encounter.discount)} />
            <Field label="PhilHealth membership" value={lookupText(encounter.membership)} />
            <Field label="Transaction type" value={lookupText(encounter.transactionType)} />
            <Field label="Patient category" value={text(encounter.patientCategory)} />
            <Field label="With PhilHealth" value={encounter.isWithPhic ? "Yes" : "No"} />
          </div>
        </CardContent>
      </Card>

      {/* Diagnosis Reference */}
      <Card className="border shadow-2xs bg-card/60">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm sm:text-base text-primary border-b pb-2">
            <FileText className="w-4 h-4 text-primary shrink-0" />
            Diagnosis (Reference from HIS)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Final diagnosis" value={text(encounter.finalDiagnosis)} />
            <Field label="Final diagnosis code" value={text(encounter.finalDiagnosisCode)} />
            <Field label="Discharge diagnosis" value={text(encounter.dischargeDiagnosis)} />
            <Field label="Doctor's impression" value={text(encounter.impression)} />
          </div>
        </CardContent>
      </Card>

      {/* Discharge & Status */}
      <Card className="border shadow-2xs bg-card/60">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm sm:text-base text-primary border-b pb-2">
            <Calendar className="w-4 h-4 text-primary shrink-0" />
            Discharge & Status Information
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Discharge no." value={text(encounter.dischargeNumber)} />
            <Field label="Discharge date" value={text(encounter.dischargeDate)} />
            <Field label="May-go-home no." value={text(encounter.mayGoHomeNumber)} />
            <Field label="May-go-home date" value={text(encounter.mayGoHomeDatetime)} />
            <Field label="Hemodialysis" value={encounter.isHemodialysis ? "Yes" : "No"} />
            <Field
              label="Cancelled"
              value={encounter.isCancelled ? `Yes${encounter.cancelDate ? ` (${encounter.cancelDate})` : ""}` : "No"}
            />
          </div>
        </CardContent>
      </Card>

      {/* Guarantors & Financial Breakdown */}
      <Card className="border shadow-2xs bg-card/60">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between border-b pb-2 flex-wrap gap-2">
            <div className="flex items-center gap-2 font-bold text-sm sm:text-base text-primary">
              <CreditCard className="w-4 h-4 text-primary shrink-0" />
              Guarantors & Financial Assistance
            </div>
            {encounter.guarantorTotal !== null && encounter.guarantorTotal > 0 && (
              <div className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/30">
                Total: {peso(encounter.guarantorTotal)}
              </div>
            )}
          </div>

          {encounter.guarantors.length === 0 ? (
            <div className="text-sm font-medium text-muted-foreground py-3 text-center">
              No guarantors on file for this encounter.
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="text-xs font-bold text-foreground">Guarantor</TableHead>
                    <TableHead className="text-xs font-bold text-foreground text-right">Amount</TableHead>
                    <TableHead className="text-xs font-bold text-foreground">Posted Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {encounter.guarantors.map((g) => (
                    <TableRow key={g.id} className="hover:bg-muted/30">
                      <TableCell className="font-semibold text-sm">{text(g.name)}</TableCell>
                      <TableCell className="text-right font-bold text-sm sm:text-base text-emerald-600 dark:text-emerald-400">
                        {peso(g.amount)}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm font-medium">
                        {g.glPosted ? (
                          <span className="text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-500/15 px-2 py-0.5 rounded text-xs">
                            Posted ({text(g.glPostDate)})
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">Not Posted</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

