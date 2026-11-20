export type UserRole =
  | 'admin'
  | 'administrador'
  | 'validador'
  | 'inspector'
  | 'capturista'
  | 'ciudadano'

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: [
    '/dashboard',
    '/tramites',
    '/expedientes',
    '/dictaminacion',
    '/siat-ct',
    '/citas',
    '/padron',
    '/capacitaciones',
    '/administracion',
    '/ajustes',
    '/informacion-institucional',
  ],
  administrador: [
    '/dashboard',
    '/tramites',
    '/expedientes',
    '/dictaminacion',
    '/siat-ct',
    '/citas',
    '/padron',
    '/capacitaciones',
    '/administracion',
    '/ajustes',
    '/informacion-institucional',
  ],
  validador: [
    '/dashboard',
    '/tramites',
    '/expedientes',
    '/dictaminacion',
    '/siat-ct',
    '/citas',
    '/padron',
    '/capacitaciones',
    '/ajustes',
  ],
  inspector: ['/dashboard', '/expedientes', '/siat-ct', '/capacitaciones', '/ajustes'],
  capturista: ['/dashboard', '/expedientes', '/citas', '/padron', '/ajustes'],
  ciudadano: [],
}

export function normalizeRole(role: unknown): UserRole | null {
  const normalized = String(role || '')
    .trim()
    .toLowerCase()
  return normalized in ROLE_PERMISSIONS ? (normalized as UserRole) : null
}

export function canAccessRoute(role: UserRole | null, pathname: string): boolean {
  if (!role) return false
  return ROLE_PERMISSIONS[role].some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  )
}
