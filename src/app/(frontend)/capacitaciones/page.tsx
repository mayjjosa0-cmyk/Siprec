import { AdminShell } from '@/components/admin-shell'
import { CapacitacionesView } from '@/components/capacitaciones-view'

export default function CapacitacionesPage() {
  return (
    <AdminShell breadcrumb="Capacitaciones / Coordinación de cursos">
      <CapacitacionesView />
    </AdminShell>
  )
}
