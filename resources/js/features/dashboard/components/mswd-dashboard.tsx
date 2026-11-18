import React, { useEffect, useState } from "react"
import { router } from "@inertiajs/react"
import { Plus } from "lucide-react"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { usePermission } from "@/features/auth/hooks/use-permission"
import { PatientSearchImportDialog } from "@/features/patients/components/dialogs/patient-search-import-dialog"
import { ServingBar } from "@/features/queue/components/serving-bar"
import { DashboardSidebar } from "./dashboard-sidebar"
import { DashboardHeader, type DashboardRoleView } from "./dashboard-header"
import { DashboardKpiStrip } from "./dashboard-kpi-strip"
import { IntakeQueueCard, type IntakeQueueRow } from "./intake-queue-card"
import { FurtherAssistanceCard } from "./further-assistance-card"
import { AssistanceReleasedCard } from "./assistance-released-card"
import { ReturnedForRevisionCard } from "./returned-for-revision-card"

export const MswdDashboard: React.FC = () => {
  const { user } = useAuth()
  const canViewPatients = usePermission("patients.view")
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false)
  const [roleView, setRoleView] = useState<DashboardRoleView>("processor")

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        if (canViewPatients) {
          setIsSearchDialogOpen((prev) => !prev)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [canViewPatients])

  const firstName =
    user?.employee_name && user.employee_name !== "Admin University"
      ? user.employee_name.trim().split(/\s+/)[0]
      : "Juan"

  const handleRowSelect = (row: IntakeQueueRow) => {
    if (row.patientId) {
      router.visit(`/patients/${row.patientId}`)
      return
    }
    if (canViewPatients) {
      setIsSearchDialogOpen(true)
    }
  }

  return (
    <div
      data-node-id="144:1428"
      className="flex h-screen w-full overflow-hidden bg-[#f4f7fc] font-sans text-[#0c2a5b]"
    >
      {/* Left Navigation Sidebar */}
      <DashboardSidebar pendingApprovalsCount={3} />

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <DashboardHeader
          onOpenSearch={() => {
            if (canViewPatients) {
              setIsSearchDialogOpen(true)
            }
          }}
          roleView={roleView}
          onRoleViewChange={setRoleView}
        />

        <ServingBar />

        {/* Scrollable Dashboard Content */}
        <main className="flex-1 overflow-y-auto px-[24px] py-[28px] lg:px-[36px]">
          <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-[24px]">
            {/* Welcome Banner & New Intake CTA */}
            <div
              data-node-id="144:1479"
              className="flex flex-wrap items-end justify-between gap-4"
            >
              <div className="flex flex-col gap-[4px]">
                <h1 className="text-[30px] leading-[36px] font-bold tracking-[-0.6px] text-[#0c2a5b]">
                  Welcome back, {firstName}
                </h1>
                <p className="text-[14px] leading-normal font-normal text-[#5b6678]">
                  6 new intakes since 7:30 AM · 3 requests are waiting on the
                  head
                </p>
              </div>

              {canViewPatients && (
                <button
                  type="button"
                  onClick={() => setIsSearchDialogOpen(true)}
                  className="flex h-[44px] shrink-0 cursor-pointer items-center gap-[8px] rounded-full bg-[#1f5fd6] px-[20px] text-[13.5px] font-semibold text-white shadow-[0px_8px_9px_-6px_rgba(31,95,214,0.28)] transition-colors hover:bg-[#1950b8]"
                >
                  <Plus className="size-[18px] stroke-[2.5]" />
                  <span>New intake</span>
                </button>
              )}
            </div>

            {/* 4-Column KPI Strip */}
            <DashboardKpiStrip />

            {/* 2-Column Main Grid */}
            <div className="grid grid-cols-1 items-start gap-[20px] xl:grid-cols-[1.35fr_1fr]">
              {/* Left Column: Intake Queue + Further Assistance */}
              <div className="flex flex-col gap-[20px]">
                <IntakeQueueCard onRowClick={handleRowSelect} />
                <FurtherAssistanceCard
                  onItemClick={() => {
                    if (canViewPatients) {
                      setIsSearchDialogOpen(true)
                    }
                  }}
                />
              </div>

              {/* Right Column: Assistance Released + Returned for Revision */}
              <div className="flex flex-col gap-[20px]">
                <AssistanceReleasedCard />
                <ReturnedForRevisionCard
                  onItemClick={() => {
                    if (canViewPatients) {
                      setIsSearchDialogOpen(true)
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </main>
      </div>

      {canViewPatients && (
        <PatientSearchImportDialog
          isOpen={isSearchDialogOpen}
          onClose={() => setIsSearchDialogOpen(false)}
        />
      )}
    </div>
  )
}

