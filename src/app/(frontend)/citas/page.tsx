import { AdminShell } from '@/components/admin-shell'
import { CitasView } from '@/components/citas-view'

export default function CitasPage() {
  return (
    <AdminShell breadcrumb="Citas y Aforo / Ventanilla presencial">
      <CitasView />
    </AdminShell>
  )
}
