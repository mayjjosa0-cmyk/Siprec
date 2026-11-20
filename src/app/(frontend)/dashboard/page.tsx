import { AdminShell } from '@/components/admin-shell'
import { DashboardView } from '@/components/dashboard-view'

export default function DashboardPage() {
  return (
    <AdminShell breadcrumb="Inicio / Dashboard">
      <DashboardView />
    </AdminShell>
  )
}
