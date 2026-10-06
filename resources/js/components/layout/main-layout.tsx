import React, { useMemo } from "react"
import { router } from "@inertiajs/react"
import { Header } from "./header"
import { Sidebar } from "./sidebar"
import { usePatients } from "@/features/patients/hooks/use-patients"

interface MainLayoutProps {
  children: React.ReactNode
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const patientsState = usePatients()

  const filterDateValue = useMemo(() => {
    return patientsState.intakeDate ? new Date(patientsState.intakeDate) : undefined
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
    <div className="flex h-screen flex-col bg-background text-foreground transition-colors duration-200 overflow-hidden font-sans">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          patients={patientsState.patients}
          selectedPatientId={patientsState.selectedPatientId}
          onSelectPatient={(id) => {
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
          selectedCategory={patientsState.classification}
          onCategoryChange={patientsState.setClassification}
          filterDate={filterDateValue}
          onDateChange={handleDateChange}
          onClearFilters={patientsState.clearFilters}
        />
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}

export default MainLayout
