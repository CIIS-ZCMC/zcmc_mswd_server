import React, { useMemo } from "react"
import { useSearchParams } from "@/lib/inertia-router-hooks"
import { usePatientUis } from "@/features/cases/hooks/use-uis-prints"
import { usePermission } from "@/features/auth/hooks/use-permission"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { UisEncounterRail } from "../uis-encounter-rail"
import { UisSheet } from "../uis-sheet"
import type { PatientRecord } from "../../types/patient.types"
import { AlertCircle, FolderPlus, Lock } from "lucide-react"

interface UisTabProps {
  patient: PatientRecord
  onOpenCaseNeeded?: () => void
}

export const UisTab: React.FC<UisTabProps> = ({ patient, onOpenCaseNeeded }) => {
  const canView = usePermission("intake.view")
  const canCreateCase = usePermission("cases.create")
  const [searchParams, setSearchParams] = useSearchParams()

  const { data: rows = [], isLoading, error } = usePatientUis(patient.id)

  const caseParam = searchParams.get("case")
  const selectedCaseId = useMemo(() => {
    if (!rows || rows.length === 0) return null
    if (caseParam) {
      const match = rows.find((r) => String(r.case.id) === caseParam)
      if (match) return match.case.id
    }
    return rows[0].case.id
  }, [rows, caseParam])

  const selectedRow = useMemo(() => {
    if (!rows || rows.length === 0 || !selectedCaseId) return null
    return rows.find((r) => r.case.id === selectedCaseId) || rows[0]
  }, [rows, selectedCaseId])

  const handleSelectCase = (caseId: number) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set("case", String(caseId))
        return next
      },
      { replace: true }
    )
  }

  if (!canView) {
    return (
      <Card className="border shadow-none">
        <CardContent className="p-8 text-center space-y-2">
          <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground mx-auto">
            <Lock className="size-5" />
          </div>
          <div className="text-sm font-semibold text-foreground">Access Restricted</div>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            You do not have permission to view Unified Intake Sheets (ANNEX B). Please contact an
            administrator if you need access.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-4 lg:col-span-3 space-y-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
          <div className="md:col-span-8 lg:col-span-9 space-y-4">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-44 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className="border">
        <AlertCircle className="size-4" />
        <AlertTitle>Failed to load Unified Intake Sheets</AlertTitle>
        <AlertDescription className="text-xs">
          {error instanceof Error ? error.message : "An unexpected network error occurred."}
        </AlertDescription>
      </Alert>
    )
  }

  if (rows.length === 0) {
    return (
      <Card className="border border-dashed border-border/80 shadow-none text-center p-8 sm:p-12 space-y-4">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground mx-auto">
          <FolderPlus className="size-7 opacity-70" />
        </div>
        <div className="max-w-md mx-auto space-y-1.5">
          <h3 className="text-base sm:text-lg font-bold text-foreground">
            No Case Episodes Opened
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            A Unified Intake Sheet (ANNEX B) is tied to a hospital case episode. Open an active case
            for this patient to record an assessment and generate printable intake sheets.
          </p>
        </div>
        {onOpenCaseNeeded && canCreateCase && (
          <div className="pt-2">
            <Button onClick={onOpenCaseNeeded} className="gap-2 text-xs font-semibold">
              <FolderPlus className="size-4" />
              Open Case Episode
            </Button>
          </div>
        )}
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
      {/* Encounter Picker Rail */}
      <div className="md:col-span-4 lg:col-span-3 sticky top-4">
        <UisEncounterRail
          rows={rows}
          selectedCaseId={selectedCaseId}
          onSelectCase={handleSelectCase}
        />
      </div>

      {/* Sheet Display */}
      <div className="md:col-span-8 lg:col-span-9 min-w-0">
        {selectedRow && (
          <UisSheet
            row={selectedRow}
            patient={patient}
          />
        )}
      </div>
    </div>
  )
}
