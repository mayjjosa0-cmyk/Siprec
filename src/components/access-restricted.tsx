'use client'

import Link from 'next/link'
import { useAuth } from '@/components/auth-provider'

export function AccessRestricted() {
  const { role } = useAuth()

  return (
    <div className="grid min-h-[70vh] place-items-center px-4">
      <section className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-8 text-center shadow-xl">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-red-100 text-2xl font-black text-red-700">
          403
        </div>
        <h1 className="mt-5 text-2xl font-extrabold text-[#19365f]">Acceso restringido</h1>
        <p className="mt-2 text-sm text-slate-600">
          Tu rol actual{role ? ` (${role})` : ''} no tiene permiso para acceder a esta sección.
        </p>
        <Link
          className="mt-6 inline-flex rounded-lg bg-[#2457df] px-5 py-2.5 text-sm font-bold text-white shadow-md"
          href="/dashboard"
        >
          Volver al Dashboard
        </Link>
      </section>
    </div>
  )
}
