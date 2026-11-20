import { AdminShell } from '@/components/admin-shell'
import { AdministracionView } from '@/components/administracion-view'

export default function AdministracionPage() {
  return (
    <AdminShell
      breadcrumb="Administración / Gobernanza del sistema"
      user={{ initials: 'SC', name: 'Lic. Sofía Cámara', role: 'ADMINISTRADOR DEL SISTEMA' }}
    >
      <AdministracionView />
    </AdminShell>
  )
}
