'use client'

import { useEffect, useState } from 'react'

type AppointmentQrModalProps = {
  idCita: string
  onClose: () => void
}

export function AppointmentQrModal({ idCita, onClose }: AppointmentQrModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    import('qrcode')
      .then(({ default: QRCode }) =>
        QRCode.toDataURL(idCita, {
          errorCorrectionLevel: 'M',
          margin: 2,
          width: 320,
          color: { dark: '#081a2e', light: '#ffffff' },
        }),
      )
      .then((dataUrl) => {
        if (active) setQrDataUrl(dataUrl)
      })
      .catch((qrError: unknown) => {
        console.error('Error al generar el QR de la cita:', qrError)
        if (active) setError('No fue posible generar el código QR.')
      })

    return () => {
      active = false
    }
  }, [idCita])

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="appointment-qr-title"
    >
      <button
        aria-label="Cerrar código QR"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <section className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-2xl">
        <header className="flex items-start justify-between gap-4 text-left">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
              Código de la cita
            </p>
            <h2 className="mt-1 text-xl font-extrabold text-[#19365f]" id="appointment-qr-title">
              Mostrar QR
            </h2>
          </div>
          <button
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
            onClick={onClose}
            type="button"
          >
            Cerrar
          </button>
        </header>

        <div className="mx-auto mt-5 grid min-h-80 max-w-80 place-items-center rounded-xl border border-slate-200 bg-white p-4">
          {qrDataUrl ? (
            <img alt={`Código QR de la cita ${idCita}`} className="h-auto w-full" src={qrDataUrl} />
          ) : error ? (
            <p className="text-sm font-semibold text-rose-700" role="alert">
              {error}
            </p>
          ) : (
            <p className="text-sm text-slate-500">Generando código QR…</p>
          )}
        </div>

        <p className="mt-4 break-all font-mono text-xs text-slate-600">{idCita}</p>
        {qrDataUrl && (
          <a
            className="mt-4 inline-flex rounded-lg bg-[#19365f] px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#244b7a]"
            download={`cita-${idCita}-qr.png`}
            href={qrDataUrl}
          >
            Descargar QR
          </a>
        )}
      </section>
    </div>
  )
}
