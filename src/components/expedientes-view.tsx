'use client'

import { useMemo, useState } from 'react'
import { DownloadIcon, SearchIcon } from '@/components/icons'
import { useAuth } from '@/components/auth-provider'
import { TramiteReviewPanel } from '@/components/tramite-review-panel'
import { useTramites } from '@/hooks/use-tramites'
import { formatTramiteDate, type Tramite } from '@/lib/tramites'

function getValidator(tramite: Tramite): string {
  const value =
    tramite.data.validadorNombre ||
    tramite.data.validador ||
    tramite.data.inspectorAsignado ||
    tramite.data.responsable
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    const name = record.nombre || record.name || record.correo
    if (typeof name === 'string' && name.trim()) return name.trim()
  }
  return 'Sin asignar'
}

function statusStyle(status: string) {
  const value = status.toLocaleLowerCase('es-MX')
  if (value.includes('aprob') || value.includes('listo') || value.includes('acept')) {
    return 'bg-emerald-100 text-emerald-800'
  }
  if (value.includes('observ') || value.includes('rechaz') || value.includes('subsan')) {
    return 'bg-rose-100 text-rose-800'
  }
  if (value.includes('inspeccion')) return 'bg-orange-100 text-orange-800'
  if (value.includes('revision') || value.includes('validacion')) return 'bg-blue-100 text-blue-800'
  return 'bg-sky-100 text-sky-800'
}

function exportCsv(tramites: Tramite[]) {
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`
  const rows = [
    [
      'Folio',
      'Establecimiento / Razón social',
      'Tipo de trámite',
      'Recepción',
      'Estatus',
      'Validador',
    ],
    ...tramites.map((tramite) => [
      tramite.id,
      tramite.businessName,
      tramite.procedureType,
      formatTramiteDate(tramite.createdAt),
      tramite.status,
      getValidator(tramite),
    ]),
  ]
  const blob = new Blob([rows.map((row) => row.map(quote).join(',')).join('\n')], {
    type: 'text/csv;charset=utf-8',
  })
  const href = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = 'expedientes-siprec.csv'
  anchor.click()
  URL.revokeObjectURL(href)
}

export function ExpedientesView() {
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
  const rows = useMemo(
    () =>
      tramites.filter(
        (tramite) =>
          `${tramite.id} ${tramite.businessName} ${tramite.procedureType}`
            .toLocaleLowerCase('es-MX')
            .includes(query.trim().toLocaleLowerCase('es-MX')) &&
          (status === 'Todos' || tramite.status === status),
      ),
    [query, status, tramites],
  )

  return (
    <div className="mx-auto max-w-[1400px]">
      <header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Gestión y Revisión de Expedientes Documentales
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Bandeja de entrada y trazabilidad BPM · Recepción → Revisión → Inspección →
            Dictaminación
          </p>
        </div>
        <div className="flex gap-3">
          <button
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold shadow-md disabled:opacity-50"
            disabled={tramites.length === 0}
            onClick={() => exportCsv(tramites)}
            type="button"
          >
            <DownloadIcon className="size-4" /> Excel
          </button>
          <button
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold shadow-md"
            onClick={() => window.print()}
            type="button"
          >
            <DownloadIcon className="size-4" /> PDF
          </button>
        </div>
      </header>

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

      <section className="mb-5 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.08)] md:grid-cols-[minmax(240px,1fr)_240px_auto]">
        <label className="flex h-11 items-center gap-2 rounded-lg border border-slate-300 px-3 focus-within:border-blue-600">
          <SearchIcon className="size-4 text-slate-400" />
          <input
            className="w-full text-sm outline-none"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por folio, establecimiento o trámite"
            value={query}
          />
        </label>
        <select
          aria-label="Filtrar por estatus"
          className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-sm"
          onChange={(event) => setStatus(event.target.value)}
          value={status}
        >
          <option>Todos</option>
          {statuses.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <button
          className="h-11 rounded-lg bg-[#2457df] px-5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 disabled:opacity-50"
          disabled={!query && status === 'Todos'}
          onClick={() => {
            setQuery('')
            setStatus('Todos')
          }}
          type="button"
        >
          Limpiar filtros
        </button>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.08)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-100 text-[11px] uppercase text-slate-500">
              <tr>
                {[
                  'Folio',
                  'Establecimiento / Razón social',
                  'Tipo de trámite',
                  'Recepción',
                  'Estatus actual',
                  'Validador asignado',
                  'Acción',
                ].map((title) => (
                  <th className="px-4 py-4" key={title}>
                    {title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((row) => (
                <tr className="hover:bg-slate-50" key={row.id}>
                  <td className="px-4 py-3 font-extrabold text-[#19365f]">{row.id}</td>
                  <td className="px-4 py-3">{row.businessName}</td>
                  <td className="px-4 py-3">{row.procedureType}</td>
                  <td className="px-4 py-3">{formatTramiteDate(row.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyle(row.status)}`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{getValidator(row)}</td>
                  <td className="px-4 py-3">
                    <button
                      className="inline-flex rounded-lg bg-[#2457df] px-4 py-2 text-xs font-bold text-white shadow-md transition hover:-translate-y-0.5"
                      onClick={() => setActive(row)}
                      type="button"
                    >
                      Revisar Expediente
                    </button>
                  </td>
                </tr>
              ))}
              {loading && (
                <tr>
                  <td className="px-4 py-12 text-center text-slate-500" colSpan={7}>
                    Cargando expedientes…
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td className="px-4 py-12 text-center text-slate-500" colSpan={7}>
                    No se encontraron expedientes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <footer className="border-t border-slate-200 px-4 py-3 text-sm text-slate-500">
          Mostrando {rows.length} de {tramites.length} expedientes
        </footer>
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
