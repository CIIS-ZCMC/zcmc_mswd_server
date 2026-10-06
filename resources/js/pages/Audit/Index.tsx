import { MainLayout } from "@/components/layout/main-layout"
import { AuditLogPage } from "@/features/audit/components/audit-log-page"
import { router } from "@inertiajs/react"

export default function AuditIndexPage() {
  return (
    <MainLayout>
      <AuditLogPage
        onSelectPatient={(id) => {
          router.visit(`/patients/${id}`)
        }}
      />
    </MainLayout>
  )
}
