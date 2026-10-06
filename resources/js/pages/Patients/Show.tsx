import { MainLayout } from "@/components/layout/main-layout"
import { PatientDetailView } from "@/features/patients/components/patient-detail-view"
import { usePatientDetail } from "@/features/patients/hooks/use-patient-detail"
import { ShieldCheck } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"

interface PatientShowPageProps {
  patientId: string
}

export default function PatientShowPage({ patientId }: PatientShowPageProps) {
  const { patient, setLocalPatient, isLoading } = usePatientDetail(patientId)

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
