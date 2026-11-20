'use client'

import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'

type Enrollment = {
  id: string
  name: string
  status: string
}

type CourseEnrollmentPanelProps = {
  course: { id: string; titulo: string } | null
  onClose: () => void
}

function readName(data: Record<string, unknown>): string {
  const citizen = data.ciudadano
  if (typeof citizen === 'string' && citizen.trim()) return citizen.trim()
  if (citizen && typeof citizen === 'object' && !Array.isArray(citizen)) {
    const citizenData = citizen as Record<string, unknown>
    const nestedName = citizenData.nombreCompleto || citizenData.nombre || citizenData.name
    if (typeof nestedName === 'string' && nestedName.trim()) return nestedName.trim()
  }

  for (const key of ['nombreCompleto', 'nombre', 'name', 'displayName', 'nombreCiudadano']) {
    if (typeof data[key] === 'string' && (data[key] as string).trim()) {
      return (data[key] as string).trim()
    }
  }
  return 'Ciudadano sin nombre'
}

function readStatus(data: Record<string, unknown>): string {
  for (const key of ['estatus', 'estado', 'status']) {
    if (typeof data[key] === 'string' && (data[key] as string).trim()) {
      return (data[key] as string).trim()
    }
  }
  return 'Inscrito'
}

function isCancelled(status: string): boolean {
  const normalized = status.trim().toLocaleLowerCase('es-MX')
  return normalized.includes('cancel')
}

export function CourseEnrollmentPanel({ course, onClose }: CourseEnrollmentPanelProps) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!course) return

    setLoading(true)
    setError('')
    return onSnapshot(
      collection(db, 'cursos', course.id, 'inscripciones'),
      (snapshot) => {
        setEnrollments(
          snapshot.docs.map((item) => {
            const data = item.data()
            return { id: item.id, name: readName(data), status: readStatus(data) }
          }),
        )
        setError('')
        setLoading(false)
      },
      (snapshotError) => {
        console.error('Error al escuchar las inscripciones del curso:', snapshotError)
        setError('No fue posible cargar las inscripciones. Verifique la conexión y los permisos.')
        setLoading(false)
      },
    )
  }, [course])

  if (!course) return null

  const cancelledCount = enrollments.filter((item) => isCancelled(item.status)).length
  const activeCount = enrollments.length - cancelledCount

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/45"
      role="dialog"
      aria-modal="true"
      aria-label={`Inscripciones de ${course.titulo}`}
    >
      <button
        aria-label="Cerrar panel de inscritos"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <aside className="relative flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-white p-5 shadow-2xl sm:p-7">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
              Panel de asistencia
            </p>
            <h2 className="mt-1 text-2xl font-extrabold text-[#19365f]">{course.titulo}</h2>
          </div>
          <button
            className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold"
            onClick={onClose}
            type="button"
          >
            Cerrar
          </button>
        </header>

        <div className="mt-5 flex flex-wrap gap-3 text-sm">
          <span className="rounded-lg bg-blue-50 px-3 py-2 font-semibold text-blue-800">
            Inscritos: {activeCount}
          </span>
          <span className="rounded-lg bg-rose-50 px-3 py-2 font-semibold text-rose-800">
            Cancelaciones: {cancelledCount}
          </span>
        </div>

        {error && (
          <p
            className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800"
            role="alert"
          >
            {error}
          </p>
        )}

        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Ciudadano</th>
                <th className="px-4 py-3">Estado de inscripción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {enrollments.map((item) => {
                const cancelled = isCancelled(item.status)
                return (
                  <tr className={cancelled ? 'bg-slate-50 opacity-60' : 'bg-white'} key={item.id}>
                    <td className="px-4 py-3 font-semibold text-slate-800">{item.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                          cancelled
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {cancelled ? 'Canceló asistencia' : 'Inscrito'}
                      </span>
                    </td>
                  </tr>
                )
              })}
              {loading && (
                <tr>
                  <td className="px-4 py-10 text-center text-slate-500" colSpan={2}>
                    Cargando inscripciones…
                  </td>
                </tr>
              )}
              {!loading && enrollments.length === 0 && !error && (
                <tr>
                  <td className="px-4 py-10 text-center text-slate-500" colSpan={2}>
                    Aún no hay personas inscritas en este curso.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </aside>
    </div>
  )
}
