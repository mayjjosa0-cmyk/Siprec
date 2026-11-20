'use client'

import Link from 'next/link'
import { useState } from 'react'
import { DownloadIcon, RotateIcon } from '@/components/icons'

const tabs = ['INE · Representante', 'Plano del inmueble', 'Comprobante de pago']

export function DictaminacionView() {
  const [tab, setTab] = useState('Plano del inmueble')
  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)
  const [result, setResult] = useState('')

  return (
    <div className="mx-auto max-w-[1400px]">
      <header className="mb-7">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          Centro de Dictaminación y Revisión Documental
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Expediente en etapa de Inspección · Validador: Ing. Roberto Medina
        </p>
      </header>

      {result && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900 shadow-sm">
          <span>{result}</span>
          <button className="rounded-md bg-white px-3 py-1 shadow-sm" onClick={() => setResult('')}>
            Cerrar
          </button>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[440px_minmax(0,1fr)]">
        <div className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.08)]">
            <div className="flex justify-between gap-3">
              <h2 className="text-xl font-extrabold text-[#19365f]">TR-2026-00871</h2>
              <span className="h-fit rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-800">
                En Inspección
              </span>
            </div>
            <p className="mt-3 font-bold">Abarrotes La Esperanza S.A. de C.V.</p>
            <dl className="mt-4 grid grid-cols-2 gap-4">
              <Info label="RFC" value="AES120304AB1" />
              <Info label="Tipo de trámite" value="Visto Bueno PC" />
              <Info label="Recepción" value="12/10/2026" />
              <Info label="Superficie" value="180 m²" />
            </dl>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.08)]">
            <h2 className="font-extrabold">Bitácora de trazabilidad</h2>
            <div className="relative mt-4 space-y-5 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-slate-200">
              {[
                ['Recepción', '12 oct · 09:14 h · Sistema', 'bg-blue-600'],
                [
                  'Revisión documental aprobada',
                  '14 oct · 11:02 h · Lic. Cervantes',
                  'bg-blue-600',
                ],
                ['Inspección programada', '16 oct · 16:40 h · Ing. R. Medina', 'bg-orange-500'],
              ].map(([title, meta, color]) => (
                <div className="relative flex gap-3" key={title}>
                  <span
                    className={`relative z-10 mt-1 size-3.5 shrink-0 rounded-full ring-4 ring-white ${color}`}
                  />
                  <p className="text-sm">
                    <strong className="block">{title}</strong>
                    <span className="text-slate-500">{meta}</span>
                  </p>
                </div>
              ))}
            </div>
          </section>

          <label className="block rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-500 shadow-[0_4px_16px_rgba(15,23,42,0.08)]">
            Observaciones técnicas del dictamen
            <textarea
              className="mt-2 min-h-28 w-full resize-none rounded-lg border border-slate-300 p-3 font-normal text-slate-800 outline-none focus:border-blue-600"
              placeholder="Escriba hallazgos, medidas correctivas o fundamento del dictamen…"
            />
          </label>

          <div className="grid gap-2">
            <button
              className="rounded-lg bg-emerald-700 px-4 py-3 font-bold text-white shadow-lg"
              onClick={() => setResult('Visto Bueno aprobado. El expediente avanzó a emisión.')}
            >
              Aprobar Visto Bueno
            </button>
            <button
              className="rounded-lg bg-red-700 px-4 py-3 font-bold text-white shadow-lg"
              onClick={() => setResult('Solicitud marcada para subsanación documental.')}
            >
              Rechazar / Requerir Subsanación
            </button>
            <button
              className="rounded-lg bg-[#d0a12b] px-4 py-3 font-bold text-slate-950 shadow-lg"
              onClick={() => setResult('Inspección física preparada para programación.')}
            >
              Programar Inspección Física
            </button>
          </div>
          <Link
            className="block rounded-lg border border-slate-300 bg-white px-4 py-3 text-center text-sm font-bold shadow-md"
            href="/expedientes"
          >
            Volver a expedientes
          </Link>
        </div>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.08)]">
          <div className="flex overflow-x-auto border-b border-slate-200 px-4">
            {tabs.map((item) => (
              <button
                className={`whitespace-nowrap border-b-3 px-4 py-4 text-sm font-semibold shadow-sm ${tab === item ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'}`}
                key={item}
                onClick={() => setTab(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-4">
            <button
              className="size-9 rounded-md border border-slate-300 bg-white font-bold shadow-sm"
              onClick={() => setZoom((value) => Math.max(50, value - 10))}
            >
              −
            </button>
            <span className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-bold">
              {zoom}%
            </span>
            <button
              className="size-9 rounded-md border border-slate-300 bg-white font-bold shadow-sm"
              onClick={() => setZoom((value) => Math.min(150, value + 10))}
            >
              +
            </button>
            <button
              className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-bold shadow-sm"
              onClick={() => setRotation((value) => value + 90)}
            >
              <RotateIcon className="size-4" /> Rotar
            </button>
            <span className="ml-auto text-xs text-slate-500">Cifrado · Cloud Storage</span>
            <button className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-bold shadow-sm">
              <DownloadIcon className="size-4" /> Descarga segura
            </button>
          </div>
          <div className="grid min-h-[560px] place-items-center overflow-auto bg-[#46586e] p-8">
            {tab === 'Plano del inmueble' ? (
              <div
                className="w-full max-w-[580px] origin-center bg-white p-7 shadow-2xl transition-transform"
                style={{ transform: `scale(${zoom / 100}) rotate(${rotation}deg)` }}
              >
                <h3 className="text-sm font-extrabold">PLANO ARQUITECTÓNICO · PLANTA BAJA</h3>
                <p className="mb-5 text-xs text-slate-500">Abarrotes La Esperanza · Escala 1:100</p>
                <div className="grid h-[390px] grid-cols-3 grid-rows-2 border-2 border-slate-800 text-xs font-bold">
                  <div className="col-span-2 grid place-items-center border-b-2 border-r-2 border-slate-800">
                    SALA DE VENTAS
                  </div>
                  <div className="grid place-items-center border-b-2 border-slate-800">BODEGA</div>
                  <div className="col-span-2 grid place-items-center border-r-2 border-slate-800">
                    ALMACÉN FRÍO
                  </div>
                  <div className="grid place-items-center">SANITARIOS</div>
                </div>
                <div className="mx-auto h-1.5 w-24 bg-emerald-600" />
                <p className="mt-2 text-center text-xs font-bold text-emerald-700">
                  SALIDA DE EMERGENCIA
                </p>
              </div>
            ) : (
              <div className="w-full max-w-lg rounded-lg bg-white p-10 text-center shadow-2xl">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-700">
                  Documento verificado
                </p>
                <h3 className="mt-3 text-xl font-extrabold">{tab}</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Vista documental segura del expediente TR-2026-00871.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase text-slate-500">{label}</dt>
      <dd className="text-sm font-bold">{value}</dd>
    </div>
  )
}
