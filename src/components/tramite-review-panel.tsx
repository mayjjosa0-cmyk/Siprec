'use client'

import { useState } from 'react'
import {
  getDocumentName,
  getDocumentStatus,
  getDocumentUrl,
  updateTramiteDocument,
  type Tramite,
} from '@/lib/tramites'

type TramiteReviewPanelProps = {
  tramite: Tramite | null
  canReview: boolean
  onClose: () => void
  onUpdated: (message: string) => void
}

function statusStyle(status: string) {
  const normalized = status.trim().toLocaleLowerCase('es-MX')
  if (normalized === 'aceptado') return 'bg-emerald-50 text-emerald-800 ring-emerald-200'
  if (normalized === 'rechazado') return 'bg-rose-50 text-rose-800 ring-rose-200'
  return 'bg-amber-50 text-amber-800 ring-amber-200'
}

export function TramiteReviewPanel({
  tramite,
  canReview,
  onClose,
  onUpdated,
}: TramiteReviewPanelProps) {
  const [rejectingIndex, setRejectingIndex] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [savingIndex, setSavingIndex] = useState<number | null>(null)
  const [error, setError] = useState('')

  const activeTramite = tramite
  if (!activeTramite) return null
  const activeTramiteId = activeTramite.id

  async function saveReview(index: number, status: 'Aceptado' | 'Rechazado') {
    if (status === 'Rechazado' && !comment.trim()) {
      setError('El motivo del rechazo es obligatorio.')
      return
    }
    setSavingIndex(index)
    setError('')
    try {
      const allAccepted = await updateTramiteDocument(activeTramiteId, index, status, comment)
      setRejectingIndex(null)
      setComment('')
      onUpdated(
        allAccepted
          ? 'Documento actualizado. El expediente quedó listo para sucursal.'
          : `Documento marcado como ${status.toLowerCase()}.`,
      )
    } catch (reviewError) {
      console.error('Error al actualizar el documento del trámite:', reviewError)
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : 'No fue posible guardar la revisión del documento.',
      )
    } finally {
      setSavingIndex(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/45"
      role="dialog"
      aria-modal="true"
      aria-label={`Revisión del trámite ${tramite.id}`}
    >
      <button
        aria-label="Cerrar revisión"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white p-5 shadow-2xl sm:p-7">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
              Revisión de expediente
            </p>
            <h2 className="mt-1 break-all text-2xl font-extrabold text-[#19365f]">
              {activeTramite.id}
            </h2>
            <p className="mt-1 text-sm text-slate-600">{activeTramite.businessName}</p>
          </div>
          <button
            className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold"
            onClick={onClose}
            type="button"
          >
            Cerrar
          </button>
        </header>

        <div className="mt-5 space-y-1">
          <p className="text-sm">
            <strong>Trámite:</strong> {activeTramite.procedureType}
          </p>
          <p className="text-sm">
            <strong>Estado:</strong> {activeTramite.status}
          </p>
        </div>

        {error && (
          <p
            className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800"
            role="alert"
          >
            {error}
          </p>
        )}

        <section className="mt-6 flex-1">
          <h3 className="mb-3 text-lg font-extrabold">
            Documentos ({activeTramite.documents.length})
          </h3>
          {activeTramite.documents.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
              Este trámite todavía no tiene documentos adjuntos.
            </p>
          ) : (
            <ul className="space-y-3">
              {activeTramite.documents.map((document, index) => {
                const documentStatus = getDocumentStatus(document)
                const documentUrl = getDocumentUrl(document)
                const rejecting = rejectingIndex === index
                const saving = savingIndex === index
                const adminComment =
                  typeof document.comentarioAdmin === 'string' ? document.comentarioAdmin : ''

                return (
                  <li
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                    key={`${index}-${getDocumentName(document, index)}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-slate-900">
                          {getDocumentName(document, index)}
                        </h4>
                        <span
                          className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${statusStyle(documentStatus)}`}
                        >
                          {documentStatus}
                        </span>
                      </div>
                      {documentUrl ? (
                        <a
                          className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-800 hover:bg-blue-100"
                          href={documentUrl}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          Abrir archivo
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">Sin archivo disponible</span>
                      )}
                    </div>

                    {adminComment && (
                      <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
                        <strong>Motivo:</strong> {adminComment}
                      </p>
                    )}

                    {rejecting ? (
                      <div className="mt-4 space-y-2">
                        <label
                          className="block text-xs font-bold text-slate-600"
                          htmlFor={`reject-comment-${index}`}
                        >
                          Motivo del rechazo (obligatorio)
                        </label>
                        <textarea
                          className="min-h-20 w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                          id={`reject-comment-${index}`}
                          onChange={(event) => setComment(event.target.value)}
                          value={comment}
                        />
                        <div className="flex gap-2">
                          <button
                            className="rounded-lg bg-rose-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                            disabled={!canReview || saving || !comment.trim()}
                            onClick={() => void saveReview(index, 'Rechazado')}
                            type="button"
                          >
                            {saving ? 'Guardando…' : 'Confirmar rechazo'}
                          </button>
                          <button
                            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold"
                            onClick={() => {
                              setRejectingIndex(null)
                              setComment('')
                              setError('')
                            }}
                            type="button"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={
                            !canReview || savingIndex !== null || documentStatus === 'Aceptado'
                          }
                          onClick={() => void saveReview(index, 'Aceptado')}
                          type="button"
                        >
                          Aceptar
                        </button>
                        <button
                          className="rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs font-bold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={
                            !canReview || savingIndex !== null || documentStatus === 'Rechazado'
                          }
                          onClick={() => {
                            setRejectingIndex(index)
                            setComment('')
                            setError('')
                          }}
                          type="button"
                        >
                          Rechazar
                        </button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </aside>
    </div>
  )
}
