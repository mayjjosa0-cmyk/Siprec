'use client'

import { useState } from 'react'
import Link from 'next/link'
import { DownloadIcon, RefreshIcon, TrayIcon } from '@/components/icons'

const metrics = [
  {
    label: 'Total de Trámites Recibidos',
    value: '1,284',
    note: '▲ 8.4% vs. mes anterior',
    tone: 'bg-blue-50 text-blue-700',
  },
  {
    label: 'Pendientes de Inspección',
    value: '87',
    note: '▲ 12 nuevos esta semana',
    tone: 'bg-amber-50 text-amber-700',
  },
  {
    label: 'Dictámenes Aprobados',
    value: '342',
    note: '▲ 5.1% vs. septiembre',
    tone: 'bg-emerald-50 text-emerald-700',
  },
  {
    label: 'Tiempo Promedio de Respuesta',
    value: '4.2 días',
    note: '▼ 0.6 días más rápido',
    tone: 'bg-violet-50 text-violet-700',
  },
]

const bars = [
  ['Ene', 92],
  ['Feb', 110],
  ['Mar', 98],
  ['Abr', 130],
  ['May', 125],
  ['Jun', 140],
  ['Jul', 118],
  ['Ago', 152],
  ['Sep', 160],
  ['Oct', 178],
] as const

export function DashboardView() {
  const [updatedAt, setUpdatedAt] = useState('Ahora')
  const [alert, setAlert] = useState('#f97316')

  function exportReport() {
    const rows = ['Mes,Trámites', ...bars.map(([month, value]) => `${month},${value}`)]
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }))
    link.download = 'reporte-siprec-2026.csv'
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Dashboard de Indicadores
          </h1>
          <p className="text-sm text-slate-500">
            Métricas operativas en tiempo real · Actualizado: {updatedAt}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold shadow-md transition hover:-translate-y-0.5"
            onClick={() =>
              setUpdatedAt(
                new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
              )
            }
          >
            <RefreshIcon className="size-4" /> Actualizar
          </button>
          <button
            className="flex items-center gap-2 rounded-lg bg-[#2457df] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700"
            onClick={exportReport}
          >
            <DownloadIcon className="size-4" /> Exportar reporte
          </button>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric, index) => (
          <article
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_3px_12px_rgba(15,23,42,0.07)]"
            key={metric.label}
          >
            <div className="mb-3 flex items-start gap-3">
              <span
                className={`grid size-10 shrink-0 place-items-center rounded-xl ${metric.tone}`}
              >
                {index === 1 ? (
                  <TrayIcon className="size-5" />
                ) : (
                  <span className="size-3 rounded-full bg-current" />
                )}
              </span>
              <p className="text-sm font-semibold leading-tight text-slate-500">{metric.label}</p>
            </div>
            <strong className="block text-3xl font-extrabold text-[#19365f]">{metric.value}</strong>
            <small
              className={`mt-1 block font-semibold ${index === 1 ? 'text-orange-700' : 'text-emerald-700'}`}
            >
              {metric.note}
            </small>
          </article>
        ))}
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,2.2fr)_minmax(280px,1fr)]">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_3px_12px_rgba(15,23,42,0.07)] sm:p-6">
          <h2 className="font-extrabold">Trámites recibidos por mes · 2026</h2>
          <div className="mt-7 flex h-56 items-end gap-2 border-b border-slate-200 px-1 sm:gap-4">
            {bars.map(([month, value], index) => (
              <div
                className="flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                key={month}
              >
                <span className="mb-1 text-[10px] font-bold sm:text-xs">{value}</span>
                <div
                  className={`w-full max-w-10 rounded-t ${index === bars.length - 1 ? 'bg-[#d0a12b]' : 'bg-[#193b68]'}`}
                  style={{ height: `${(value / 200) * 100}%` }}
                />
                <span className="mt-2 text-[10px] text-slate-500 sm:text-xs">{month}</span>
              </div>
            ))}
          </div>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_3px_12px_rgba(15,23,42,0.07)]">
          <h2 className="font-extrabold">Distribución de trámites</h2>
          <div className="mx-auto mt-5 grid size-40 place-items-center rounded-full bg-[conic-gradient(#2457df_0_58%,#d0a12b_58%_100%)] shadow-inner">
            <div className="grid size-24 place-items-center rounded-full bg-white text-center">
              <span>
                <strong className="block text-2xl text-[#19365f]">1,284</strong>
                <small className="text-slate-500">trámites</small>
              </span>
            </div>
          </div>
          <div className="mt-5 space-y-2 text-sm">
            <p className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-blue-600" /> Vistos Buenos{' '}
              <strong className="ml-auto">58% · 745</strong>
            </p>
            <p className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-[#d0a12b]" /> Licencias{' '}
              <strong className="ml-auto">42% · 539</strong>
            </p>
          </div>
        </article>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_3px_12px_rgba(15,23,42,0.07)]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-extrabold">Semáforo SIAT-CT · Estado actual</h2>
            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
              En inspección
            </span>
          </div>
          <div className="mt-3 flex items-center gap-4 rounded-xl border-2 border-orange-500 bg-orange-50 p-4">
            <span className="size-10 shrink-0 rounded-full" style={{ backgroundColor: alert }} />
            <div>
              <strong className="block text-lg text-orange-900">
                ALERTA NARANJA · Peligro Alto
              </strong>
              <small className="text-orange-700">
                Emitida hoy 08:15 h · Huracán en aproximación
              </small>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-2">
              {['#2563eb', '#16a34a', '#facc15', '#f97316', '#dc2626'].map((color) => (
                <button
                  aria-label={`Seleccionar alerta ${color}`}
                  className={`size-7 rounded-full shadow-md transition hover:scale-110 ${alert === color ? 'ring-2 ring-slate-900 ring-offset-2' : ''}`}
                  key={color}
                  onClick={() => setAlert(color)}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <button className="rounded-lg bg-[#2457df] px-4 py-2 text-sm font-bold text-white shadow-lg shadow-blue-600/20">
              Cambiar alerta
            </button>
          </div>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_3px_12px_rgba(15,23,42,0.07)]">
          <h2 className="font-extrabold">Actividad reciente</h2>
          <ul className="mt-3 space-y-3 text-sm">
            <li className="flex justify-between gap-3 border-b border-slate-100 pb-3">
              <span>TR-2026-00871 pasó a Inspección</span>
              <time className="shrink-0 text-slate-400">hace 12 min</time>
            </li>
            <li className="flex justify-between gap-3">
              <span>TR-2026-00640 dictaminado: Aprobado</span>
              <time className="shrink-0 text-slate-400">hace 38 min</time>
            </li>
          </ul>
          <Link
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#19365f] px-4 py-2 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5"
            href="/tramites"
          >
            <TrayIcon className="size-4" /> Ir a bandeja de revisión
          </Link>
        </article>
      </section>
    </div>
  )
}
