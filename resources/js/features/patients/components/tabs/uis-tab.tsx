import React, { useEffect, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useSearchParams } from "@/lib/inertia-router-hooks"
import {
  usePatientUis,
  uisPrintKeys,
  patientUisKeys,
} from "@/features/cases/hooks/use-uis-prints"
import { usePermission } from "@/features/auth/hooks/use-permission"
import { useQueueActionGate } from "@/features/queue"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { UisSheet } from "../uis-sheet"
import { UisPdfPreviewDialog } from "@/features/cases/components/dialogs/uis-pdf-preview-dialog"
import { NewIntakeAssessmentDialog } from "@/features/cases/components/dialogs/new-intake-assessment-dialog"
import { IntakeAssessmentDialog } from "@/features/cases/components/dialogs/intake-assessment-dialog"
import { formatCurrency } from "@/lib/format-currency"
import { formatTransactionType } from "@/features/hospital/lib/transaction-type"
import { getClassificationBadgeText } from "@/features/cases/lib/classification"
import type { PatientRecord } from "../../types/patient.types"
import type { PatientUisRow } from "@/features/cases/types/uis.types"
import { AlertCircle, Lock } from "lucide-react"
import { cn } from "@/lib/utils"

interface UisTabProps {
  patient: PatientRecord
  /** Open a case, optionally on the given HIS encounter. */
  onOpenCaseNeeded?: (transactionId?: number | null) => void
}

/** How a row is named: its case, else its encounter. */
const rowLabel = (row: PatientUisRow) =>
  row.case?.caseCode ??
  (row.encounter.transactionId ? `#${row.encounter.transactionId}` : "Intake")

function isSameDayAsToday(dateStr?: string | null): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return false
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

export const UisTab: React.FC<UisTabProps> = ({ patient }) => {
  const canView = usePermission("intake.view")
  const canCreateAssessment = usePermission("intake.create")
  const { canPerformActions, reason, activeVisit } = useQueueActionGate()
  const [searchParams, setSearchParams] = useSearchParams()

  const { data: rows = [], isLoading, error } = usePatientUis(patient.id)

  // ?uis=<row key> opens a sheet; the older ?case=<id> links still work.
  const caseParam = searchParams.get("case")
  const uisParam =
    searchParams.get("uis") ?? (caseParam ? `case-${caseParam}` : null)
  const [selectedKey, setSelectedKey] = useState<string | null>(uisParam)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(Boolean(uisParam))
  const [isNewIntakeOpen, setIsNewIntakeOpen] = useState(false)
  const [initialAssessOpen, setInitialAssessOpen] = useState<boolean>(false)
  const [initialPrintOpen, setInitialPrintOpen] = useState<boolean>(false)

  // Direct assess / re-assess dialog state
  const [directAssessRow, setDirectAssessRow] = useState<PatientUisRow | null>(
    null
  )

  const handleOpenAssessDialog = (row: PatientUisRow) => {
    setDirectAssessRow(row)
  }

  // Direct print preview state
  const [previewTargetRow] = useState<PatientUisRow | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false)

  const queryClient = useQueryClient()

  // Keep modal open/close synchronized if searchParams change externally.
  useEffect(() => {
    if (uisParam) {
      setSelectedKey(uisParam)
      setIsModalOpen(true)
    } else {
      setIsModalOpen(false)
    }
  }, [uisParam])

  // Selected row for sheet view modal
  const selectedRow = useMemo<PatientUisRow | null>(() => {
    if (!rows || rows.length === 0 || !selectedKey) return null
    return (
      rows.find(
        (r) =>
          r.key === selectedKey ||
          (r.case !== null && `case-${r.case.id}` === selectedKey)
      ) || null
    )
  }, [rows, selectedKey])

  // One intake per encounter: these cannot take a new one.
  const assessedTransactionIds = useMemo(
    () =>
      rows
        .filter((r) => r.uis.hasAssessment && r.encounter.transactionId)
        .map((r) => r.encounter.transactionId as number),
    [rows]
  )

  const handleOpenSheetModal = (
    row: PatientUisRow,
    assessOpen = false,
    printOpen = false
  ) => {
    setSelectedKey(row.key)
    setInitialAssessOpen(assessOpen)
    setInitialPrintOpen(printOpen)
    setIsModalOpen(true)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete("case")
        next.set("uis", row.key)
        return next
      },
      { replace: true }
    )
  }

  const handleCloseModal = (open: boolean) => {
    setIsModalOpen(open)
    if (!open) {
      setInitialAssessOpen(false)
      setInitialPrintOpen(false)
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete("case")
          next.delete("uis")
          return next
        },
        { replace: true }
      )
    }
  }

  if (!canView) {
    return (
      <Card className="border shadow-none">
        <CardContent className="space-y-2 p-8 text-center">
          <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Lock className="size-5" />
          </div>
          <div className="text-sm font-semibold text-foreground">
            Access Restricted
          </div>
          <p className="mx-auto max-w-sm text-xs text-muted-foreground">
            You do not have permission to view Unified Intake Sheets (ANNEX B).
            Please contact an administrator if you need access.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[260px] w-full rounded-[16px]" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className="border">
        <AlertCircle className="size-4" />
        <AlertTitle>Failed to load Unified Intake Sheets</AlertTitle>
        <AlertDescription className="text-xs">
          {error instanceof Error
            ? error.message
            : "An unexpected network error occurred."}
        </AlertDescription>
      </Alert>
    )
  }

  const newIntakeDialog = (
    <NewIntakeAssessmentDialog
      open={isNewIntakeOpen}
      onOpenChange={setIsNewIntakeOpen}
      patient={patient}
      assessedTransactionIds={assessedTransactionIds}
    />
  )

  return (
    <div className="w-full">
      {/* Figma Node 202:1803 — Intake sheets (ANNEX B) Card */}
      <div
        data-node-id="202:1803"
        className="flex w-full flex-col overflow-hidden rounded-[16px] border border-[#e4e9f2] bg-white shadow-[0px_1px_1px_rgba(12,42,91,0.04),0px_2px_3px_rgba(12,42,91,0.05)] dark:border-border dark:bg-card"
      >
        {/* Card Header (202:1804) */}
        <div
          data-node-id="202:1804"
          className="flex flex-wrap items-center justify-between gap-[12px] border-b border-[#e4e9f2] px-[22px] pt-[18px] pb-[15px] dark:border-border"
        >
          <div className="flex min-w-0 flex-1 items-center gap-[12px]">
            <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[17px] bg-[#edf3fe]">
              <img
                alt=""
                className="block size-[20px] max-w-none"
                src="/images/patient-registry/intake-sheets-header.svg"
              />
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <h2 className="truncate text-[16px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground">
                Intake sheets (ANNEX B)
              </h2>
              <p className="truncate text-[13px] leading-normal font-normal text-[#5b6678] dark:text-muted-foreground">
                One per hospital encounter · classification, guarantors and
                prints
              </p>
            </div>
          </div>

          {canCreateAssessment && (
            <button
              type="button"
              data-node-id="202:1815"
              disabled={!canPerformActions}
              title={!canPerformActions ? reason : undefined}
              onClick={() => setIsNewIntakeOpen(true)}
              className="flex h-[38px] shrink-0 cursor-pointer items-center gap-[6px] rounded-full border border-[#cfd7e4] bg-white px-[16px] text-[13px] leading-normal font-semibold text-[#0c2a5b] transition-colors hover:bg-[#f4f7fc] disabled:cursor-not-allowed disabled:opacity-50 dark:border-border dark:bg-card dark:text-foreground"
            >
              <img
                alt=""
                className="block size-[18px] max-w-none"
                src="/images/patient-registry/intake-plus.svg"
              />
              <span>New intake</span>
            </button>
          )}
        </div>

        {/* Card Body (202:1820) */}
        <div
          data-node-id="202:1820"
          className="flex flex-col gap-[8px] px-[22px] pt-[14px] pb-[20px]"
        >
          {/* Column Header Bar (202:1821) */}
          <div
            data-node-id="202:1821"
            className="grid grid-cols-[1.6fr_0.8fr_1.1fr_1.5fr_0.7fr_86px] items-center gap-[12px] rounded-[10px] bg-[#f4f7fc] px-[14px] py-[10px] text-[12px] leading-[15px] font-bold text-[#5b6678] dark:bg-muted/50 dark:text-muted-foreground"
          >
            <div>Encounter</div>
            <div>Class</div>
            <div>ANNEX B</div>
            <div>Guarantors</div>
            <div>Prints</div>
            <div />
          </div>

          {/* Rows Container (202:1833) */}
          <div data-node-id="202:1833" className="flex flex-col gap-[4px]">
            {rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-[12px] border border-dashed border-[#e4e9f2] py-10 text-center dark:border-border">
                <p className="text-[14px] font-semibold text-[#0c2a5b] dark:text-foreground">
                  No intake sheets recorded yet
                </p>
                <p className="max-w-md text-[12px] text-[#5b6678] dark:text-muted-foreground">
                  Click &ldquo;New intake&rdquo; above to record an intake
                  assessment (ANNEX B) for a hospital encounter.
                </p>
              </div>
            ) : (
              rows.map((row, idx) => {
                const encounterDate =
                  row.encounter.date ?? row.case?.dateOpened ?? null
                const dateStr = encounterDate
                  ? new Date(encounterDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "—"
                const typeStr = formatTransactionType(
                  row.encounter.transactionType ?? row.case?.transactionType
                )
                const classCode =
                  row.uis.classification?.classification ||
                  row.uis.classification?.calculatedClassification ||
                  row.uis.assessment?.classification ||
                  null

                const isTodayEncounter =
                  (activeVisit != null &&
                    row.encounter.transactionId != null &&
                    Number(row.encounter.transactionId) ===
                      Number(activeVisit.hisTransactionId)) ||
                  isSameDayAsToday(encounterDate) ||
                  (idx === 0 && !row.uis.hasAssessment)

                const encounterDisplay = row.encounter.transactionId
                  ? `#${row.encounter.transactionId}`
                  : rowLabel(row)

                return (
                  <div
                    key={row.key}
                    data-node-id={isTodayEncounter ? "202:1834" : "202:1866"}
                    className={cn(
                      "grid grid-cols-[1.6fr_0.8fr_1.1fr_1.5fr_0.7fr_86px] items-center gap-[12px] rounded-[12px] px-[14px] py-[12px] transition-colors",
                      isTodayEncounter
                        ? "border border-[#d9e6fc] bg-[#edf3fe] dark:border-primary/30 dark:bg-primary/10"
                        : "border border-transparent bg-white hover:bg-[#f4f7fc]/60 dark:bg-card dark:hover:bg-muted/40"
                    )}
                  >
                    {/* 1. Encounter */}
                    <div className="flex min-w-0 flex-col gap-[2px]">
                      <div className="flex flex-wrap items-center gap-[8px]">
                        <span className="font-mono text-[13px] leading-normal font-bold text-[#0c2a5b] dark:text-foreground">
                          {encounterDisplay}
                        </span>
                        {isTodayEncounter && (
                          <span className="inline-flex h-[18px] items-center rounded-full bg-[#1f5fd6] px-[6px] text-[10px] leading-normal font-bold text-white">
                            Today
                          </span>
                        )}
                      </div>
                      <span className="truncate text-[12px] leading-normal font-normal text-[#5b6678] dark:text-muted-foreground">
                        {dateStr} · {typeStr}
                      </span>
                    </div>

                    {/* 2. Class */}
                    <div className="flex items-center">
                      {row.uis.hasAssessment && classCode ? (
                        <span className="inline-flex h-[22px] items-center rounded-full bg-[#e8f6ef] px-[9px] text-[11px] leading-[22px] font-bold text-[#146b43]">
                          {getClassificationBadgeText(classCode)}
                        </span>
                      ) : (
                        <span className="inline-flex h-[22px] items-center rounded-full bg-[#eef1f6] px-[9px] text-[11px] leading-[22px] font-bold text-[#4a5568]">
                          —
                        </span>
                      )}
                    </div>

                    {/* 3. ANNEX B */}
                    <div className="flex items-center">
                      {row.uis.ready ? (
                        <span className="inline-flex items-center gap-[6px] text-[13px] leading-normal font-semibold text-[#146b43]">
                          <img
                            alt=""
                            className="block size-[14px] max-w-none shrink-0"
                            src="/images/patient-registry/intake-complete.svg"
                          />
                          <span>Complete</span>
                        </span>
                      ) : row.uis.hasAssessment ? (
                        <span className="inline-flex items-center gap-[6px] text-[13px] leading-normal font-semibold text-[#8a5300]">
                          <img
                            alt=""
                            className="block size-[14px] max-w-none shrink-0"
                            src="/images/patient-registry/intake-not-started.svg"
                          />
                          <span>{row.uis.missing.length} missing</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-[6px] text-[13px] leading-normal font-semibold text-[#5b6678] dark:text-muted-foreground">
                          <img
                            alt=""
                            className="block size-[14px] max-w-none shrink-0"
                            src="/images/patient-registry/intake-not-started.svg"
                          />
                          <span>Not started</span>
                        </span>
                      )}
                    </div>

                    {/* 4. Guarantors */}
                    <div className="flex flex-wrap items-center gap-[6px]">
                      {row.guarantees.count > 0 ? (
                        <>
                          <span className="text-[13px] leading-[19.5px] text-[#0c2a5b] dark:text-foreground">
                            <strong className="font-bold">
                              {row.guarantees.count === 1
                                ? "MAIFIP"
                                : `${row.guarantees.count} Guarantors`}
                            </strong>{" "}
                            <span className="font-normal">
                              {formatCurrency(row.guarantees.total)}
                            </span>
                          </span>
                          {row.uis.printCount > 0 && (
                            <span className="inline-flex h-[22px] items-center gap-[4px] rounded-full bg-[#e8f6ef] px-[9px] text-[11px] leading-[22px] font-bold text-[#146b43]">
                              <img
                                alt=""
                                className="block size-[12px] max-w-none shrink-0"
                                src="/images/patient-registry/intake-printed-badge.svg"
                              />
                              <span>Printed</span>
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-[12px] leading-normal font-normal text-[#5b6678] dark:text-muted-foreground">
                          None yet
                        </span>
                      )}
                    </div>

                    {/* 5. Prints */}
                    <div className="flex items-center gap-[4px] text-[12px] leading-normal font-normal text-[#5b6678] dark:text-muted-foreground">
                      <img
                        alt=""
                        className="block size-[13px] max-w-none shrink-0"
                        src="/images/patient-registry/intake-print.svg"
                      />
                      <span>{row.uis.printCount || 0}</span>
                    </div>

                    {/* 6. Open Button */}
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => handleOpenSheetModal(row)}
                        className="inline-flex h-[34px] w-[86px] cursor-pointer items-center justify-center gap-[6px] rounded-full border border-[#cfd7e4] bg-white px-[14px] text-[13px] leading-normal font-semibold text-[#0c2a5b] transition-colors hover:bg-[#f4f7fc] dark:border-border dark:bg-card dark:text-foreground"
                      >
                        <span>Open</span>
                        <img
                          alt=""
                          className="block size-[16px] max-w-none shrink-0"
                          src="/images/patient-registry/intake-open-chevron.svg"
                        />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {newIntakeDialog}

      {/* Unified Intake Sheet Modal with 5 Sub-Tabs */}
      {selectedRow && (
        <UisSheet
          open={isModalOpen}
          onOpenChange={handleCloseModal}
          row={selectedRow}
          patient={patient}
          initialAssessOpen={initialAssessOpen}
          initialPrintOpen={initialPrintOpen}
        />
      )}

      {/* Direct Live Print Preview Dialog */}
      {previewTargetRow && (
        <UisPdfPreviewDialog
          open={isPreviewOpen}
          onOpenChange={setIsPreviewOpen}
          assessmentId={previewTargetRow.uis.assessmentId}
          caseId={previewTargetRow.case?.id}
          caseCode={previewTargetRow.case?.caseCode}
          patientName={patient.fullName}
          hasAssessment={previewTargetRow.uis.hasAssessment}
          onAssessNeeded={() => {
            setIsPreviewOpen(false)
            handleOpenAssessDialog(previewTargetRow)
          }}
        />
      )}

      {/* Direct Intake Assessment Dialog */}
      {directAssessRow && (
        <IntakeAssessmentDialog
          open={Boolean(directAssessRow)}
          onOpenChange={(open) => {
            if (!open) setDirectAssessRow(null)
          }}
          caseId={directAssessRow.case?.id}
          patientId={patient.id}
          caseCode={directAssessRow.case?.caseCode}
          patientName={patient.fullName}
          patientFirstName={patient.firstName}
          patientMiddleName={patient.middleName}
          patientLastName={patient.lastName}
          patientAddressPsgc={patient.presentAddressPsgc}
          patientContact={patient.contactNo}
          patientMonthlyIncome={patient.monthlyIncome}
          existingAssessment={directAssessRow.uis.assessment}
          transactionId={
            directAssessRow.encounter.transactionId ??
            directAssessRow.case?.transactionId
          }
          onSuccess={() => {
            setDirectAssessRow(null)
            queryClient.invalidateQueries({ queryKey: patientUisKeys.all })
            queryClient.invalidateQueries({ queryKey: uisPrintKeys.all })
          }}
        />
      )}
    </div>
  )
}
