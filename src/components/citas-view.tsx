'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  type DocumentReference,
} from 'firebase/firestore'
import { useAuth } from '@/components/auth-provider'
import { AppointmentQrModal } from '@/components/appointment-qr-modal'
import { QrScannerModal } from '@/components/qr-scanner-modal'
import { db } from '@/lib/firebase'

type Appointment = {
  id: string
  idCita: string
  citizen: string
  date: Date | null
  reason: string
  origin: string
  status: string
}

type Toast = { type: 'success' | 'warning' | 'error'; message: string }

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

function citizenName(data: Record<string, unknown>): string {
  const citizen = data.ciudadano
  if (citizen && typeof citizen === 'object' && !Array.isArray(citizen)) {
    const record = citizen as Record<string, unknown>
    const nestedName = firstString(record.nombreCompleto, record.nombre, record.name)
    if (nestedName) return nestedName
  }
  return (
    firstString(
      data.nombreCiudadano,
      data.ciudadanoNombre,
      data.nombreCompleto,
      data.nombre,
      data.name,
    ) || 'Sin nombre'
  )
}

function appointmentDate(data: Record<string, unknown>): Date | null {
  const value = data.fecha ?? data.fechaCita ?? data.date
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (value && typeof value === 'object' && 'toDate' in value) {
    const toDate = value.toDate
    if (typeof toDate === 'function') {
      const date = toDate.call(value)
      return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null
    }
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  return null
}

function formatAppointmentDate(date: Date | null): string {
  return date
    ? date.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Sin fecha'
}

function normalizeStatus(status: unknown): string {
  return typeof status === 'string' ? status.trim().toLocaleLowerCase('es-MX') : ''
}

function statusStyle(status: string): string {
  const normalized = normalizeStatus(status)
  if (normalized === 'asistió' || normalized === 'asistio') return 'bg-emerald-100 text-emerald-800'
  if (normalized === 'cancelada' || normalized === 'cancelado') return 'bg-rose-100 text-rose-800'
  return 'bg-amber-100 text-amber-800'
}

function appointmentFromDocument(id: string, data: Record<string, unknown>): Appointment {
  return {
    id,
    idCita: firstString(data.idCita) || id,
    citizen: citizenName(data),
    date: appointmentDate(data),
    reason: firstString(data.motivo, data.motivoCita, data.reason) || '—',
    origin: firstString(data.origen, data.origin) || '—',
    status: firstString(data.estatus, data.status) || 'Pendiente',
  }
}

export function CitasView() {
  const { firebaseUser, profile, role } = useAuth()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [citizen, setCitizen] = useState('')
  const [dateTime, setDateTime] = useState('')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [qrAppointment, setQrAppointment] = useState<Appointment | null>(null)
  const [validating, setValidating] = useState(false)
  const [updatingAppointmentId, setUpdatingAppointmentId] = useState<string | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)

  const canValidate = role === 'admin' || role === 'administrador' || role === 'validador'
  const canManageAppointments = canValidate || role === 'capturista'

  useEffect(() => {
    return onSnapshot(
      collection(db, 'citas'),
      (snapshot) => {
        const nextAppointments = snapshot.docs
          .map((item) => appointmentFromDocument(item.id, item.data()))
          .sort((left, right) => (right.date?.getTime() || 0) - (left.date?.getTime() || 0))
        setAppointments(nextAppointments)
        setListError('')
        setLoading(false)
      },
      (snapshotError) => {
        console.error('Error al escuchar las citas en Firestore:', snapshotError)
        setListError('No fue posible cargar las citas. Verifique la conexión y los permisos.')
        setLoading(false)
      },
    )
  }, [])

  const pendingCount = useMemo(
    () => appointments.filter((item) => normalizeStatus(item.status) === 'pendiente').length,
    [appointments],
  )

  function showToast(toastMessage: Toast) {
    setToast(toastMessage)
    window.setTimeout(
      () => setToast((current) => (current === toastMessage ? null : current)),
      6000,
    )
  }

  async function createAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanCitizen = citizen.trim()
    const cleanReason = reason.trim()
    const date = new Date(dateTime)
    if (!cleanCitizen || !cleanReason || !dateTime || Number.isNaN(date.getTime())) {
      showToast({
        type: 'error',
        message: 'Capture el ciudadano, la fecha y el motivo de la cita.',
      })
      return
    }
    if (!firebaseUser) {
      showToast({ type: 'error', message: 'Inicie sesión para agendar una cita.' })
      return
    }

    setIsSubmitting(true)
    try {
      const appointmentRef = doc(collection(db, 'citas'))
      await setDoc(appointmentRef, {
        idCita: appointmentRef.id,
        nombreCiudadano: cleanCitizen,
        fecha: Timestamp.fromDate(date),
        motivo: cleanReason,
        origen: 'Web',
        estatus: 'Pendiente',
        createdAt: serverTimestamp(),
        createdBy: profile?.correo || firebaseUser.email || firebaseUser.uid,
      })
      setCitizen('')
      setDateTime('')
      setReason('')
      const newAppointment = appointmentFromDocument(appointmentRef.id, {
        idCita: appointmentRef.id,
        nombreCiudadano: cleanCitizen,
        fecha: Timestamp.fromDate(date),
        motivo: cleanReason,
        origen: 'Web',
        estatus: 'Pendiente',
      })
      setQrAppointment(newAppointment)
      showToast({
        type: 'success',
        message: `Cita agendada. Folio de cita: ${appointmentRef.id}`,
      })
    } catch (error) {
      console.error('Error al crear la cita en Firestore:', error)
      showToast({
        type: 'error',
        message:
          error instanceof Error
            ? `No fue posible agendar la cita: ${error.message}`
            : 'No fue posible agendar la cita.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function updateAppointmentStatus(
    appointment: Appointment,
    nextStatus: 'Aceptada' | 'Rechazada',
  ) {
    if (!canManageAppointments || updatingAppointmentId) {
      if (!canManageAppointments) {
        showToast({ type: 'error', message: 'Tu rol no tiene permiso para gestionar citas.' })
      }
      return
    }

    const action = nextStatus === 'Aceptada' ? 'aceptar' : 'rechazar'
    if (!window.confirm(`¿Confirma que desea ${action} la cita de ${appointment.citizen}?`)) return

    setUpdatingAppointmentId(appointment.id)
    try {
      const appointmentRef = doc(db, 'citas', appointment.id)
      const result = await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(appointmentRef)
        if (!snapshot.exists()) return { kind: 'not-found' as const }

        const currentStatus = firstString(snapshot.data().estatus, snapshot.data().status) || ''
        if (normalizeStatus(currentStatus) !== 'pendiente') {
          return { kind: 'already-updated' as const, status: currentStatus || 'Sin estado' }
        }

        transaction.update(appointmentRef, {
          estatus: nextStatus,
          fechaRespuestaAdmin: serverTimestamp(),
          respuestaAdminPor:
            profile?.correo || firebaseUser?.email || firebaseUser?.uid || 'administrador',
        })
        return { kind: 'updated' as const }
      })

      if (result.kind === 'not-found') {
        showToast({ type: 'error', message: 'La cita ya no existe.' })
      } else if (result.kind === 'already-updated') {
        showToast({
          type: 'warning',
          message: `La cita ya cambió de estado (${result.status}); actualiza la lista.`,
        })
      } else {
        showToast({
          type: 'success',
          message:
            nextStatus === 'Aceptada'
              ? 'Cita aceptada correctamente.'
              : 'Cita rechazada correctamente.',
        })
      }
    } catch (error) {
      console.error(`Error al marcar la cita como ${nextStatus}:`, error)
      showToast({
        type: 'error',
        message:
          error instanceof Error
            ? `No fue posible actualizar la cita: ${error.message}`
            : 'No fue posible actualizar la cita.',
      })
    } finally {
      setUpdatingAppointmentId(null)
    }
  }

  async function validateQr(scannedValue: string) {
    setShowScanner(false)
    const idCita = scannedValue.trim()
    if (!idCita || idCita.length > 200 || idCita.includes('/')) {
      showToast({ type: 'error', message: 'Código QR inválido o no encontrado.' })
      return
    }
    if (!canValidate) {
      showToast({ type: 'error', message: 'Tu rol no tiene permiso para validar citas.' })
      return
    }

    setValidating(true)
    try {
      const matches = await getDocs(
        query(collection(db, 'citas'), where('idCita', '==', idCita), limit(2)),
      )
      if (matches.size > 1) {
        showToast({
          type: 'error',
          message: 'Código QR inválido: el identificador está asociado a más de una cita.',
        })
        return
      }

      let citaRef: DocumentReference
      if (!matches.empty) {
        citaRef = matches.docs[0].ref
      } else {
        citaRef = doc(db, 'citas', idCita)
        const directSnapshot = await getDoc(citaRef)
        if (!directSnapshot.exists()) {
          showToast({ type: 'error', message: 'Código QR inválido o no encontrado.' })
          return
        }
      }

      const result = await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(citaRef)
        if (!snapshot.exists()) return { kind: 'not-found' as const }

        const status = firstString(snapshot.data().estatus, snapshot.data().status) || ''
        const normalized = normalizeStatus(status)
        if (
          normalized === 'asistió' ||
          normalized === 'asistio' ||
          normalized === 'cancelada' ||
          normalized === 'cancelado' ||
          normalized === 'rechazada' ||
          normalized === 'rechazado'
        ) {
          return { kind: 'used' as const }
        }
        if (normalized !== 'pendiente' && normalized !== 'aceptada') {
          return { kind: 'invalid-status' as const, status: status || 'Sin estado' }
        }

        transaction.update(citaRef, {
          estatus: 'Asistió',
          fechaValidacion: serverTimestamp(),
        })
        return { kind: 'validated' as const }
      })

      if (result.kind === 'not-found') {
        showToast({ type: 'error', message: 'Código QR inválido o no encontrado.' })
      } else if (result.kind === 'used') {
        showToast({
          type: 'warning',
          message: 'Error: Este código QR ya fue utilizado o la cita está cancelada.',
        })
      } else if (result.kind === 'invalid-status') {
        showToast({
          type: 'warning',
          message: `La cita tiene el estado "${result.status}" y no se puede validar.`,
        })
      } else {
        showToast({ type: 'success', message: 'Asistencia confirmada correctamente.' })
      }
    } catch (error) {
      console.error('Error al validar la cita escaneada:', error)
      showToast({
        type: 'error',
        message:
          error instanceof Error
            ? `No fue posible validar la cita: ${error.message}`
            : 'No fue posible validar la cita.',
      })
    } finally {
      setValidating(false)
    }
  }

  return (
    <div className="mx-auto max-w-[1400px]">
      {toast && (
        <div
          className={`fixed right-4 top-20 z-[70] flex max-w-md items-start gap-3 rounded-xl border px-4 py-3 text-sm font-bold shadow-2xl sm:right-7 ${
            toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : toast.type === 'warning'
                ? 'border-amber-200 bg-amber-50 text-amber-900'
                : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
          role={toast.type === 'error' ? 'alert' : 'status'}
        >
          <span>{toast.message}</span>
          <button
            aria-label="Cerrar aviso"
            className="ml-2 text-xs opacity-70 hover:opacity-100"
            onClick={() => setToast(null)}
            type="button"
          >
            Cerrar
          </button>
        </div>
      )}

      <header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
            Atención ciudadana
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#19365f] sm:text-3xl">
            Gestión y Validación de Citas por QR
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Agenda citas y confirma la asistencia validando el código QR único.
          </p>
        </div>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#19365f] px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-[#244b7a] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!canValidate || validating}
          onClick={() => setShowScanner(true)}
          type="button"
        >
          <span aria-hidden="true">▦</span>
          {validating ? 'Validando cita…' : 'Escanear Cita'}
        </button>
      </header>

      {listError && (
        <p
          className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800"
          role="alert"
        >
          {listError}
        </p>
      )}

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <article className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-[0_3px_12px_rgba(15,23,42,0.07)]">
          <span className="text-sm font-semibold text-slate-500">Citas registradas</span>
          <strong className="grid size-11 place-items-center rounded-xl bg-blue-50 text-xl text-blue-800">
            {appointments.length}
          </strong>
        </article>
        <article className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-[0_3px_12px_rgba(15,23,42,0.07)]">
          <span className="text-sm font-semibold text-slate-500">Pendientes de validar</span>
          <strong className="grid size-11 place-items-center rounded-xl bg-amber-50 text-xl text-amber-800">
            {pendingCount}
          </strong>
        </article>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[350px_minmax(0,1fr)]">
        <form
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.08)]"
          onSubmit={createAppointment}
        >
          <h2 className="font-extrabold text-[#19365f]">Agendamiento manual</h2>
          <p className="mt-1 text-sm text-slate-500">
            La cita se registrará con origen Web y estado Pendiente.
          </p>
          <label className="mt-4 block text-sm font-semibold text-slate-600">
            Ciudadano
            <input
              autoComplete="name"
              className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              maxLength={160}
              onChange={(event) => setCitizen(event.target.value)}
              placeholder="Nombre completo"
              required
              value={citizen}
            />
          </label>
          <label className="mt-3 block text-sm font-semibold text-slate-600">
            Fecha y hora
            <input
              className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              onChange={(event) => setDateTime(event.target.value)}
              required
              type="datetime-local"
              value={dateTime}
            />
          </label>
          <label className="mt-3 block text-sm font-semibold text-slate-600">
            Motivo
            <textarea
              className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 p-3 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              maxLength={1000}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Motivo de la cita"
              required
              value={reason}
            />
          </label>
          <button
            className="mt-4 w-full rounded-lg bg-[#19365f] px-4 py-3 font-bold text-white shadow-lg transition hover:bg-[#244b7a] disabled:cursor-wait disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'Agendando cita…' : 'Crear cita'}
          </button>
        </form>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.08)]">
          <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="font-extrabold text-[#19365f]">Citas registradas</h2>
              <p className="mt-1 text-xs text-slate-500">Actualización en tiempo real</p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">
              {appointments.length} citas
            </span>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  {['ID cita', 'Ciudadano', 'Fecha', 'Motivo', 'Origen', 'Estatus', 'Acciones'].map(
                    (heading) => (
                      <th className="px-4 py-3" key={heading}>
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointments.map((appointment) => (
                  <tr className="transition hover:bg-slate-50" key={appointment.id}>
                    <td className="px-4 py-4 font-mono text-xs font-bold text-[#19365f]">
                      {appointment.id}
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-800">
                      {appointment.citizen}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {formatAppointmentDate(appointment.date)}
                    </td>
                    <td className="max-w-56 px-4 py-4 text-slate-600">{appointment.reason}</td>
                    <td className="px-4 py-4 text-slate-600">{appointment.origin}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyle(appointment.status)}`}
                      >
                        {appointment.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-800 hover:bg-blue-100"
                          onClick={() => setQrAppointment(appointment)}
                          type="button"
                        >
                          Ver QR
                        </button>
                        {normalizeStatus(appointment.status) === 'pendiente' && (
                          <>
                            <button
                              className="rounded-md bg-emerald-700 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
                              disabled={!canManageAppointments || updatingAppointmentId !== null}
                              onClick={() => void updateAppointmentStatus(appointment, 'Aceptada')}
                              type="button"
                            >
                              {updatingAppointmentId === appointment.id ? 'Guardando…' : 'Aceptar'}
                            </button>
                            <button
                              className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-800 hover:bg-rose-100 disabled:opacity-50"
                              disabled={!canManageAppointments || updatingAppointmentId !== null}
                              onClick={() => void updateAppointmentStatus(appointment, 'Rechazada')}
                              type="button"
                            >
                              Rechazar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {loading && (
                  <tr>
                    <td className="px-4 py-12 text-center text-slate-500" colSpan={7}>
                      Cargando citas…
                    </td>
                  </tr>
                )}
                {!loading && appointments.length === 0 && (
                  <tr>
                    <td className="px-4 py-12 text-center text-slate-500" colSpan={7}>
                      Aún no hay citas registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {showScanner && (
        <QrScannerModal
          onClose={() => setShowScanner(false)}
          onDetected={(value) => void validateQr(value)}
        />
      )}
      {qrAppointment && (
        <AppointmentQrModal idCita={qrAppointment.idCita} onClose={() => setQrAppointment(null)} />
      )}
    </div>
  )
}
