'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronIcon, DownloadIcon, EyeIcon, SearchIcon } from '@/components/icons'
import { useAuth } from '@/components/auth-provider'
import { TramiteReviewPanel } from '@/components/tramite-review-panel'
import { useTramites } from '@/hooks/use-tramites'
import { formatTramiteDate, type Tramite } from '@/lib/tramites'

const normalize = (value: string) =>
  value
    .trim()
    .toLocaleLowerCase('es-MX')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

function getStatusStyle(status: string) {
  const value = normalize(status)
  if (value.includes('observacion') || value.includes('rechaz') || value.includes('subsanar')) {
    return 'bg-rose-50 text-rose-800 ring-rose-200'
  }
  if (value.includes('validacion') || value.includes('revision') || value.includes('inspeccion')) {
    return 'bg-blue-50 text-blue-800 ring-blue-200'
  }
  if (value.includes('pendiente') || value.includes('recepcion') || value.includes('revisar')) {
    return 'bg-amber-50 text-amber-800 ring-amber-200'
  }
  return 'bg-slate-100 text-slate-700 ring-slate-200'
}

function isInGroup(status: string, group: 'pending' | 'validation' | 'observations') {
  const value = normalize(status)
  if (group === 'pending') {
    return ['pendiente', 'por revisar', 'recepcion', 'recibido'].some((state) =>
      value.includes(state),
    )
  }
  if (group === 'validation') {
    return ['validacion', 'revision', 'inspeccion'].some((state) => value.includes(state))
  }
  return ['observacion', 'rechaz', 'subsanar'].some((state) => value.includes(state))
}

function downloadCsv(tramites: Tramite[]) {
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`
  const rows = [
    ['Folio', 'Establecimiento / Ciudadano', 'Tipo de trámite', 'Recepción', 'Estado'],
    ...tramites.map((tramite) => [
      tramite.id,
      tramite.businessName,
      tramite.procedureType,
      formatTramiteDate(tramite.createdAt),
      tramite.status,
    ]),
  ]
  const blob = new Blob([rows.map((row) => row.map(quote).join(',')).join('\n')], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'bandeja-tramites-siprec.csv'
  anchor.click()
  URL.revokeObjectURL(url)
}

export function ReviewInbox() {
  const { role } = useAuth()
  const canReview = role === 'admin' || role === 'administrador' || role === 'validador'
  const { tramites, loading, error } = useTramites()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('Todos')
  const [active, setActive] = useState<Tramite | null>(null)
  const [notice, setNotice] = useState('')

  const statuses = useMemo(
    () =>
      [...new Set(tramites.map((tramite) => tramite.status))].sort((a, b) =>
        a.localeCompare(b, 'es-MX'),
      ),
    [tramites],
  )
  const filtered = useMemo(
    () =>
      tramites.filter((item) => {
        const matchesQuery = normalize(
          `${item.id} ${item.businessName} ${item.procedureType}`,
        ).includes(normalize(query))
        return matchesQuery && (status === 'Todos' || item.status === status)
      }),
    [query, status, tramites],
  )
  const counters = [
    [
      'Por revisar',
      tramites.filter((item) => isInGroup(item.status, 'pending')).length,
      'text-amber-700 bg-amber-50',
    ],
    [
      'En validación',
      tramites.filter((item) => isInGroup(item.status, 'validation')).length,
      'text-blue-700 bg-blue-50',
    ],
    [
      'Con observaciones',
      tramites.filter((item) => isInGroup(item.status, 'observations')).length,
      'text-rose-700 bg-rose-50',
    ],
  ] as const

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
            Control operativo
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Bandeja de revisión de trámites
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Prioriza, consulta y da seguimiento a las solicitudes recibidas.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold shadow-md transition hover:-translate-y-0.5"
            href="/dashboard"
          >
            Volver al dashboard
          </Link>
          <button
            className="flex items-center gap-2 rounded-lg bg-[#2457df] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 disabled:opacity-50"
            disabled={tramites.length === 0}
            onClick={() => downloadCsv(tramites)}
            type="button"
          >
            <DownloadIcon className="size-4" /> Exportar
          </button>
        </div>
      </div>

      {notice && (
        <p
          className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
          role="status"
        >
          {notice}
        </p>
      )}
      {error && (
        <p
          className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800"
          role="alert"
        >
          {error}
        </p>
      )}

      <section className="mb-4 grid gap-3 sm:grid-cols-3">
        {counters.map(([label, value, style]) => (
          <article
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-[0_3px_12px_rgba(15,23,42,0.07)]"
            key={label}
          >
            <span className="text-sm font-semibold text-slate-500">{label}</span>
            <strong className={`grid size-11 place-items-center rounded-xl text-xl ${style}`}>
              {value}
            </strong>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center">
          <label className="flex h-11 flex-1 items-center gap-2 rounded-lg border border-slate-300 px-3 focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-100">
            <SearchIcon className="size-4 text-slate-400" />
            <input
              className="w-full bg-transparent text-sm outline-none"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por folio, establecimiento o tipo de trámite"
              value={query}
            />
          </label>
          <select
            aria-label="Filtrar por estado"
            className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium shadow-sm outline-none focus:border-blue-600"
            onChange={(event) => setStatus(event.target.value)}
            value={status}
          >
            <option>Todos</option>
            {statuses.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <button
            className="h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold shadow-md disabled:opacity-40"
            disabled={!query && status === 'Todos'}
            onClick={() => {
              setQuery('')
              setStatus('Todos')
            }}
            type="button"
          >
            Limpiar filtros
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Folio</th>
                <th className="px-4 py-3">Establecimiento / Ciudadano</th>
                <th className="px-4 py-3">Tipo de trámite</th>
                <th className="px-4 py-3">Recepción</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr className="transition hover:bg-slate-50" key={item.id}>
                  <td className="px-4 py-4 font-bold text-[#19365f]">{item.id}</td>
                  <td className="px-4 py-4 font-semibold">{item.businessName}</td>
                  <td className="px-4 py-4 text-slate-600">{item.procedureType}</td>
                  <td className="px-4 py-4 text-slate-500">{formatTramiteDate(item.createdAt)}</td>
                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${getStatusStyle(item.status)}`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      className="inline-flex items-center gap-1 rounded-lg bg-[#19365f] px-3 py-2 text-xs font-bold text-white shadow-md transition hover:-translate-y-0.5"
                      onClick={() => setActive(item)}
                      type="button"
                    >
                      <EyeIcon className="size-4" /> Revisar <ChevronIcon className="size-3" />
                    </button>
                  </td>
                </tr>
              ))}
              {loading && (
                <tr>
                  <td className="px-4 py-12 text-center text-slate-500" colSpan={6}>
                    Cargando trámites…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td className="px-4 py-12 text-center text-slate-500" colSpan={6}>
                    No se encontraron trámites con estos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-200 px-4 py-3 text-sm text-slate-500">
          Mostrando {filtered.length} de {tramites.length} trámites
        </div>
      </section>

      <TramiteReviewPanel
        canReview={canReview}
        onClose={() => setActive(null)}
        onUpdated={setNotice}
        tramite={active}
      />
    </div>
  )
}
