import { AdminShell } from '@/components/admin-shell'
import { ReviewInbox } from '@/components/review-inbox'

export default function TramitesPage() {
  return (
    <AdminShell breadcrumb="Inicio / Trámites / Bandeja de revisión">
      <ReviewInbox />
    </AdminShell>
  )
}
