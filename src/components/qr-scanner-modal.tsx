'use client'

import { useEffect, useRef, useState } from 'react'

type QrScannerModalProps = {
  onClose: () => void
  onDetected: (value: string) => void
}

export function QrScannerModal({ onClose, onDetected }: QrScannerModalProps) {
  const [cameraError, setCameraError] = useState('')
  const callbackRef = useRef(onDetected)

  callbackRef.current = onDetected

  useEffect(() => {
    let cancelled = false
    let scanner: import('html5-qrcode').Html5Qrcode | null = null

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        if (cancelled) return

        scanner = new Html5Qrcode('appointment-qr-reader')
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            if (cancelled) return
            cancelled = true
            callbackRef.current(decodedText)
          },
          () => {},
        )
        if (cancelled && scanner.isScanning) {
          await scanner.stop()
        }
      } catch (error) {
        if (cancelled) return
        console.error('No fue posible iniciar la cámara para escanear el QR:', error)
        setCameraError(
          error instanceof Error
            ? `No se pudo iniciar la cámara: ${error.message}`
            : 'No se pudo iniciar la cámara. Verifique los permisos del navegador.',
        )
      }
    }

    void startScanner()

    return () => {
      cancelled = true
      if (scanner?.isScanning) {
        void scanner.stop().catch((error: unknown) => {
          console.error('Error al cerrar la cámara del lector QR:', error)
        })
      }
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-scanner-title"
    >
      <button
        aria-label="Cerrar escáner"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <section className="relative w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
              Validación de asistencia
            </p>
            <h2 className="mt-1 text-xl font-extrabold text-[#19365f]" id="qr-scanner-title">
              Escanear cita
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Coloque el código QR de la cita dentro del recuadro.
            </p>
          </div>
          <button
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold"
            onClick={onClose}
            type="button"
          >
            Cerrar
          </button>
        </header>

        <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
          <div id="appointment-qr-reader" className="min-h-64 w-full" />
        </div>
        {cameraError ? (
          <p
            className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800"
            role="alert"
          >
            {cameraError}
          </p>
        ) : (
          <p className="mt-3 text-center text-xs text-slate-500">
            Permita el acceso a la cámara si el navegador lo solicita.
          </p>
        )}
      </section>
    </div>
  )
}
