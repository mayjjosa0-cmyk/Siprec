import { AdminShell } from '@/components/admin-shell'
import { PadronView } from '@/components/padron-view'

export default function PadronPage() {
  return (
    <AdminShell breadcrumb="Padrón de Comercios / Dictámenes de riesgo">
      <PadronView />
    </AdminShell>
  )
}
