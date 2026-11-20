import { AccountSettingsView } from '@/components/account-settings-view'
import { AdminShell } from '@/components/admin-shell'

export default function AccountSettingsPage() {
  return (
    <AdminShell breadcrumb="Cuenta / Ajustes">
      <AccountSettingsView />
    </AdminShell>
  )
}
