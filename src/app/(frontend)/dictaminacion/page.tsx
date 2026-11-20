import { AdminShell } from '@/components/admin-shell'
import { DictaminacionView } from '@/components/dictaminacion-view'

export default function DictaminacionPage() {
  return (
    <AdminShell breadcrumb="Expedientes / TR-2026-00871 / Dictaminación">
      <DictaminacionView />
    </AdminShell>
  )
}
