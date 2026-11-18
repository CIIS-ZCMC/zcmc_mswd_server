import { useEffect, useState } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { PatientDetailView } from "@/features/patients/components/patient-detail-view"
import { usePatientDetail } from "@/features/patients/hooks/use-patient-detail"
import { usePermission } from "@/features/auth/hooks/use-permission"
import { PatientSearchImportDialog } from "@/features/patients/components/dialogs/patient-search-import-dialog"
import { ShieldCheck, UserSearch } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"

interface PatientShowPageProps {
  patientId: string
}

export default function PatientShowPage({ patientId }: PatientShowPageProps) {
  const { patient, setLocalPatient, isLoading } = usePatientDetail(patientId)
  const canViewPatients = usePermission("patients.view")
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false)

  useEffect(() => {
    if (patientId && typeof window !== "undefined") {
      localStorage.setItem("last_viewed_patient_id", String(patientId))
    }
  }, [patientId])

  return (
    <MainLayout>
      {isLoading && !patient ? (
        <div className="flex h-full items-center justify-center">
          <Spinner className="size-6" />
        </div>
      ) : patient ? (
        <PatientDetailView
          patient={patient}
          onUpdatePatient={setLocalPatient}
        />
      ) : !patientId ? (
        <div className="flex h-full flex-col items-center justify-center p-8 text-center animate-in fade-in-50 duration-200">
          <div className="relative mb-5 flex size-20 items-center justify-center rounded-3xl bg-[#edf3fe] text-[#1f5fd6] shadow-sm dark:bg-primary/15 dark:text-primary">
            <UserSearch className="size-10 stroke-[1.75]" />
          </div>
          <h2 className="text-[20px] font-bold tracking-tight text-[#0c2a5b] dark:text-foreground">
            No Patient Selected
          </h2>
          <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-[#5b6678] dark:text-muted-foreground">
            Select a patient from the registry on the left to view their profile, family background, and encounter details, or use search to find a patient.
          </p>
          {canViewPatients && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsSearchDialogOpen(true)}
                className="flex h-[40px] cursor-pointer items-center gap-[8px] rounded-full bg-[#1f5fd6] px-[20px] text-[13px] font-semibold text-white shadow-xs transition-colors hover:bg-[#1a53bd] active:scale-[0.98]"
              >
                <UserSearch className="size-[16px]" />
                <span>Search or import patient</span>
                <span className="ml-1 rounded-[6px] bg-white/20 px-1.5 py-0.5 text-[10.5px] font-medium tracking-wide text-white">
                  Ctrl K
                </span>
              </button>
            </div>
          )}
          {canViewPatients && (
            <PatientSearchImportDialog
              isOpen={isSearchDialogOpen}
              onClose={() => setIsSearchDialogOpen(false)}
            />
          )}
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center text-muted-foreground p-6 text-center">
          <ShieldCheck className="size-12 stroke-1 opacity-50 mb-3" />
          <p className="text-base font-bold">Patient Not Found</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            The requested patient record could not be loaded.
          </p>
        </div>
      )}
    </MainLayout>
  )
}
