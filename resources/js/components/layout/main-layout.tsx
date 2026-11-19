import React, { useMemo } from "react"
import { router } from "@inertiajs/react"
import { Header } from "./header"
import { Sidebar } from "./sidebar"
import { DashboardSidebar } from "@/features/dashboard/components/dashboard-sidebar"
import { usePatients } from "@/features/patients/hooks/use-patients"
import { ServingBar } from "@/features/queue/components/serving-bar"

interface MainLayoutProps {
  children: React.ReactNode
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const patientsState = usePatients()

  const filterDateValue = useMemo(() => {
    return patientsState.intakeDate
      ? new Date(patientsState.intakeDate)
      : undefined
  }, [patientsState.intakeDate])

  const handleDateChange = (date?: Date) => {
    if (!date) {
      patientsState.setIntakeDate(undefined)
    } else {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, "0")
      const day = String(date.getDate()).padStart(2, "0")
      patientsState.setIntakeDate(`${year}-${month}-${day}`)
    }
  }

  return (
    <div
      data-node-id="144:539"
      className="flex h-screen w-full overflow-hidden bg-[#f4f7fc] font-sans text-[#0c2a5b] transition-colors duration-200 dark:bg-background dark:text-foreground"
    >
      {/* Far-Left Navigation Rail (Collapsed by default on Registry/Workspace views) */}
      <DashboardSidebar defaultCollapsed={true} />

      {/* Patient Registry Column */}
      <Sidebar
        patients={patientsState.patients}
        selectedPatientId={patientsState.selectedPatientId}
        onSelectPatient={(id) => {
          if (typeof window !== "undefined") {
            localStorage.setItem("last_viewed_patient_id", String(id))
          }
          patientsState.setSelectedPatientId(id)
          router.visit(`/patients/${id}`, {
            preserveState: true,
            preserveScroll: true,
          })
        }}
        page={patientsState.page}
        totalPages={patientsState.totalPages}
        total={patientsState.total}
        onPageChange={patientsState.setPage}
        searchQuery={patientsState.search}
        onSearchChange={patientsState.setSearch}
        filterDate={filterDateValue}
        onDateChange={handleDateChange}
        onClearFilters={patientsState.clearFilters}
      />

      {/* Right Workspace Column */}
      <div
        data-node-id="144:693"
        className="flex h-full min-w-0 flex-1 flex-col overflow-hidden"
      >
        <Header />
        <ServingBar />
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  )
}

export default MainLayout
