import { MainLayout } from "@/components/layout/main-layout"
import { ShieldCheck } from "lucide-react"

export default function PatientsIndexPage() {
  return (
    <MainLayout>
      <div className="flex h-full flex-col items-center justify-center text-muted-foreground p-6 text-center">
        <ShieldCheck className="size-12 stroke-1 opacity-50 mb-3" />
        <p className="text-base font-bold">No Patient Selected</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          Select a patient from the registry sidebar to view their complete clinical & social work profile.
        </p>
      </div>
    </MainLayout>
  )
}
