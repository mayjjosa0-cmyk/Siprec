import { AdminShell } from '@/components/admin-shell'
import { ExpedientesView } from '@/components/expedientes-view'

export default function ExpedientesPage() {
  return (
    <AdminShell breadcrumb="Inicio / Expedientes">
      <ExpedientesView />
    </AdminShell>
  )
}
