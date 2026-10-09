import { MainLayout } from "@/components/layout/main-layout"
import { DarPage } from "@/features/dar/components/dar-page"

interface DarIndexPageProps {
  today?: string
}

export default function DarIndexPage({ today }: DarIndexPageProps) {
  return (
    <MainLayout>
      <DarPage initialDate={today} />
    </MainLayout>
  )
}
