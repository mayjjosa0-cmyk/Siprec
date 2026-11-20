'use client'

import { useMemo, useState } from 'react'
import { DownloadIcon, SearchIcon } from '@/components/icons'

const businesses = [
  ['PAD-00412', 'Abarrotes La Esperanza S.A.', 'Comercio', 'Bajo', '14/10/2027', 'Ing. R. Medina'],
  ['PAD-00877', 'Hotel Costa Azul', 'Hospedaje', 'Alto', '03/11/2026', 'Arq. L. Pech'],
  [
    'PAD-01120',
    'Plaza Comercial Las Palmas',
    'Centro comercial',
    'Alto',
    '28/11/2026',
    'Lic. A. Cervantes',
  ],
  ['PAD-00655', 'Restaurante El Faro', 'Alimentos', 'Medio', '15/12/2026', 'Arq. L. Pech'],
  ['PAD-02034', 'Gimnasio FitZone', 'Deportivo', 'Medio', '09/02/2027', 'Ing. R. Medina'],
  ['PAD-00391', 'Clínica Santa María', 'Salud', 'Alto', '30/10/2026', 'Lic. A. Cervantes'],
  ['PAD-01508', 'Papelería Central', 'Comercio', 'Bajo', '21/08/2027', 'Sin asignar'],
] as const

export function PadronView() {
  const [query, setQuery] = useState('')
  const [risk, setRisk] = useState('Todos')
  const [selected, setSelected] = useState<(typeof businesses)[number] | null>(null)
  const [notice, setNotice] = useState('')

  const rows = useMemo(
    () =>
      businesses.filter(
        (row) =>
          `${row[0]} ${row[1]} ${row[2]}`.toLowerCase().includes(query.toLowerCase()) &&
          (risk === 'Todos' || row[3] === risk),
      ),
    [query, risk],
  )

  function exportCsv() {
    const anchor = document.createElement('a')
    const data = [
      'Folio,Razón social,Giro,Riesgo,Vigencia,Inspector',
      ...businesses.map((row) => row.join(',')),
    ].join('\n')
    anchor.href = URL.createObjectURL(new Blob([data], { type: 'text/csv' }))
    anchor.download = 'padron-municipal.csv'
    anchor.click()
    URL.revokeObjectURL(anchor.href)
  }

  return (
    <div className="mx-auto max-w-[1400px]">
      <header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Padrón Municipal de Comercios y Dictámenes de Riesgo
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Registro de empresas auditadas, nivel de riesgo y vigencia del Visto Bueno
          </p>
        </div>
        <div className="flex gap-3">
          <button
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold shadow-md"
            onClick={exportCsv}
          >
            <DownloadIcon className="size-4" /> Excel
          </button>
          <button
            className="rounded-lg bg-[#2457df] px-4 py-2.5 text-sm font-bold text-white shadow-lg"
            onClick={() => setNotice('Formulario de alta preparado para un nuevo establecimiento.')}
          >
            Registrar establecimiento
          </button>
        </div>
      </header>

      {notice && (
        <button
          className="mb-4 w-full rounded-lg bg-blue-50 px-4 py-3 text-left text-sm font-semibold text-blue-900 shadow-sm"
          onClick={() => setNotice('')}
        >
          {notice}
        </button>
      )}

      <section className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Establecimientos registrados', '3,412', 'text-[#19365f]'],
          ['Riesgo Alto', '214', 'text-red-700'],
          ['Vencen en 30 días', '96', 'text-orange-700'],
          ['Inspecciones del mes', '58', 'text-blue-700'],
        ].map(([label, value, tone]) => (
          <article
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.08)]"
            key={label}
          >
            <p className="text-sm text-slate-500">{label}</p>
            <strong className={`text-3xl ${tone}`}>{value}</strong>
          </article>
        ))}
      </section>

      <section className="mb-5 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.08)] lg:grid-cols-[2.4fr_1fr_1fr_1fr]">
        <label className="flex h-11 items-center gap-2 rounded-lg border border-slate-300 px-3">
          <SearchIcon className="size-4 text-slate-400" />
          <input
            className="w-full text-sm outline-none"
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por razón social, RFC o folio…"
            value={query}
          />
        </label>
        <select
          className="rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-sm"
          onChange={(e) => setRisk(e.target.value)}
          value={risk}
        >
          <option>Todos</option>
          <option>Alto</option>
          <option>Medio</option>
          <option>Bajo</option>
        </select>
        <select className="rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-sm">
          <option>Vigencia: Todas</option>
          <option>Vence en 30 días</option>
          <option>Vigente</option>
        </select>
        <select className="rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-sm">
          <option>Inspector: Todos</option>
          <option>Ing. R. Medina</option>
          <option>Arq. L. Pech</option>
        </select>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.08)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-100 text-[11px] uppercase text-slate-500">
              <tr>
                {[
                  'Folio',
                  'Razón social',
                  'Giro',
                  'Riesgo',
                  'Vence Visto Bueno',
                  'Inspector asignado',
                  'Acciones',
                ].map((item) => (
                  <th className="px-4 py-4" key={item}>
                    {item}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((row) => (
                <tr className="hover:bg-slate-50" key={row[0]}>
                  <td className="px-4 py-3 font-extrabold text-[#19365f]">{row[0]}</td>
                  <td className="px-4 py-3">{row[1]}</td>
                  <td className="px-4 py-3">{row[2]}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${row[3] === 'Alto' ? 'bg-red-100 text-red-800' : row[3] === 'Medio' ? 'bg-orange-100 text-orange-800' : 'bg-emerald-100 text-emerald-800'}`}
                    >
                      {row[3]}
                    </span>
                  </td>
                  <td className="px-4 py-3">{row[4]}</td>
                  <td className="px-4 py-3">{row[5]}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold shadow-sm"
                        onClick={() => setSelected(row)}
                      >
                        Ver
                      </button>
                      <button
                        className="rounded-md bg-[#2457df] px-3 py-2 text-xs font-bold text-white shadow-md"
                        onClick={() => setNotice(`Inspector asignado al registro ${row[0]}.`)}
                      >
                        Asignar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selected && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4">
          <button
            aria-label="Cerrar detalle"
            className="absolute inset-0 shadow-sm"
            onClick={() => setSelected(null)}
          />
          <section className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-700">
              Ficha del establecimiento
            </p>
            <h2 className="mt-2 text-2xl font-extrabold">{selected[1]}</h2>
            <dl className="mt-6 grid grid-cols-2 gap-5">
              {[
                ['Folio', selected[0]],
                ['Giro', selected[2]],
                ['Nivel de riesgo', selected[3]],
                ['Vigencia', selected[4]],
                ['Inspector', selected[5]],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-bold uppercase text-slate-400">{label}</dt>
                  <dd className="mt-1 font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
            <button
              className="mt-7 w-full rounded-lg bg-[#19365f] px-4 py-3 font-bold text-white shadow-lg"
              onClick={() => setSelected(null)}
            >
              Cerrar ficha
            </button>
          </section>
        </div>
      )}
    </div>
  )
}
