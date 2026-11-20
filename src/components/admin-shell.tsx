'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useAuth } from '@/components/auth-provider'
import { AccessRestricted } from '@/components/access-restricted'
import { canAccessRoute } from '@/lib/rbac'
import {
  BellIcon,
  CloseIcon,
  DashboardIcon,
  FileIcon,
  LogoutIcon,
  MenuIcon,
  SearchIcon,
  SettingsIcon,
  TrayIcon,
} from '@/components/icons'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { href: '/tramites', label: 'Bandeja de revisión', icon: TrayIcon },
  { href: '/expedientes', label: 'Expedientes', icon: FileIcon },
  { href: '/dictaminacion', label: 'Dictaminación', icon: SearchIcon },
  { href: '/siat-ct', label: 'Semáforo SIAT-CT', icon: DashboardIcon },
  { href: '/citas', label: 'Citas y Aforo', icon: FileIcon },
  { href: '/padron', label: 'Padrón de Comercios', icon: FileIcon },
  { href: '/capacitaciones', label: 'Capacitaciones', icon: FileIcon },
  { href: '/administracion', label: 'Administración', icon: DashboardIcon },
  { href: '/informacion-institucional', label: 'Información institucional', icon: FileIcon },
  { href: '/ajustes', label: 'Ajustes de cuenta', icon: SettingsIcon },
]

export function AdminShell({
  children,
  breadcrumb,
  user = {
    initials: 'RM',
    name: 'Ing. Roberto Medina',
    role: 'VALIDADOR / INSPECTOR',
  },
}: {
  children: ReactNode
  breadcrumb: string
  user?: { initials: string; name: string; role: string }
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const { firebaseUser, role, profile, loading } = useAuth()

  const visibleNavItems = navItems.filter((item) => role && canAccessRoute(role, item.href))
  const initials = profile?.nombre
    ? profile.nombre
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase()
    : user.initials
  const displayName = profile?.nombre || user.name
  const displayRole = role ? role.toUpperCase() : user.role

  async function handleLogout() {
    await signOut(auth)
    router.replace('/')
  }

  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.replace('/')
    }
  }, [firebaseUser, loading, router])

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f4f6f8] text-sm font-semibold text-slate-600">
        Verificando permisos…
      </div>
    )
  }

  if (!firebaseUser) {
    return null
  }

  if (profile?.estado && ['baja', 'inactivo'].includes(profile.estado.trim().toLowerCase())) {
    return <AccessRestricted />
  }

  if (!canAccessRoute(role, pathname)) {
    return <AccessRestricted />
  }

  return (
    <div className="min-h-dvh bg-[#f4f6f8] text-[#101828] transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      {menuOpen && (
        <button
          aria-label="Cerrar menú"
          className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col bg-[#081a2e] px-3 py-6 text-slate-300 shadow-2xl transition-transform lg:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-2 pb-5">
          <Link className="flex items-center gap-3" href="/dashboard">
            <span className="grid size-11 place-items-center rounded-full border-2 border-[#d4a72c] bg-[#713249] text-sm font-extrabold text-white shadow-md">
              PC
            </span>
            <span>
              <strong className="block text-lg leading-none text-white">SIPREC V2</strong>
              <small className="text-[11px] text-slate-400">Protección Civil · B. Juárez</small>
            </span>
          </Link>
          <button
            aria-label="Cerrar menú"
            className="rounded-lg p-2 text-white shadow-md lg:hidden"
            onClick={() => setMenuOpen(false)}
          >
            <CloseIcon />
          </button>
        </div>

        <nav className="mt-4 flex-1 space-y-1">
          {visibleNavItems.map((item) => {
            const active =
              pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`))
            const Icon = item.icon
            return (
              <Link
                className={`flex items-center gap-3 rounded-lg border-l-4 px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? 'border-[#d4a72c] bg-[#1c3d69] text-white shadow-md'
                    : 'border-transparent hover:bg-white/7 hover:text-white'
                }`}
                href={item.href}
                key={item.label}
                onClick={() => setMenuOpen(false)}
              >
                <Icon className="size-[18px] shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <button
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-white/7 hover:text-white"
          onClick={handleLogout}
          type="button"
        >
          <LogoutIcon className="size-4" />
          Cerrar sesión
        </button>
      </aside>

      <div className="lg:pl-[260px]">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-4 shadow-sm transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900 sm:px-7">
          <button
            aria-label="Abrir menú"
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 shadow-md transition-colors duration-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 lg:hidden"
            onClick={() => setMenuOpen(true)}
          >
            <MenuIcon />
          </button>
          <p className="hidden text-sm text-slate-500 transition-colors duration-300 dark:text-slate-300 sm:block">
            {breadcrumb}
          </p>
          <div className="ml-auto flex items-center gap-3">
            <label className="hidden h-9 items-center gap-2 rounded-lg bg-slate-100 px-3 text-slate-500 transition-colors duration-300 dark:bg-slate-800 dark:text-slate-300 md:flex">
              <SearchIcon className="size-4" />
              <input
                aria-label="Buscar folio o RFC"
                className="w-36 bg-transparent text-sm outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                placeholder="Buscar folio, RFC…"
              />
            </label>
            <button
              aria-label="Notificaciones"
              className="relative rounded-lg border border-slate-200 bg-white p-2 text-slate-700 shadow-md transition-colors duration-300 hover:-translate-y-0.5 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <BellIcon className="size-5" />
              <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-red-600 text-[9px] font-bold text-white">
                3
              </span>
            </button>
            {profile?.photoURL ? (
              <img
                alt={`Foto de ${displayName}`}
                className="size-9 rounded-full border border-slate-200 object-cover dark:border-slate-700"
                src={profile.photoURL}
              />
            ) : (
              <span className="grid size-9 place-items-center rounded-full bg-[#713249] text-xs font-bold text-white shadow-md">
                {initials}
              </span>
            )}
            <span className="hidden text-xs leading-tight transition-colors duration-300 dark:text-slate-100 xl:block">
              <strong className="block">{displayName}</strong>
              <small className="font-bold text-[#713249]">{displayRole}</small>
            </span>
          </div>
        </header>
        <main className="p-4 sm:p-7">{children}</main>
      </div>
    </div>
  )
}
