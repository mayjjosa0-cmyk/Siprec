import { AdminShell } from '@/components/admin-shell'
import { InstitutionalInfoView } from '@/components/institutional-info-view'

export default function InstitutionalInfoPage() {
  return (
    <AdminShell breadcrumb="Administración / Información institucional">
      <InstitutionalInfoView />
    </AdminShell>
  )
}
