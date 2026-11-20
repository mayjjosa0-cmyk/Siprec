import { AdminShell } from '@/components/admin-shell'
import { SiatView } from '@/components/siat-view'

export default function SiatPage() {
  return (
    <AdminShell breadcrumb="Semáforo SIAT-CT / Emisión oficial">
      <SiatView />
    </AdminShell>
  )
}
