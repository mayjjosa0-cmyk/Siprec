'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { useAuth } from '@/components/auth-provider'
import { CourseEnrollmentPanel } from '@/components/course-enrollment-panel'
import { db, storage } from '@/lib/firebase'

type Course = {
  id: string
  titulo: string
  descripcion: string
  imageUrl: string
  estatus: string
  createdAt: Date | null
  createdBy: string
}

function toCourseDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (value && typeof value === 'object' && 'toDate' in value) {
    const toDate = value.toDate
    if (typeof toDate === 'function') {
      const date = toDate.call(value)
      return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null
    }
  }
  return null
}

function formatCourseDate(date: Date | null): string {
  return date ? date.toLocaleDateString('es-MX') : '—'
}

function courseStatusStyle(status: string): string {
  return status.toLocaleLowerCase('es-MX') === 'cancelado'
    ? 'bg-rose-100 text-rose-800'
    : 'bg-emerald-100 text-emerald-800'
}

export function CapacitacionesView() {
  const { firebaseUser, profile } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [loadingCourses, setLoadingCourses] = useState(true)
  const [coursesError, setCoursesError] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    const coursesQuery = query(collection(db, 'cursos'), orderBy('createdAt', 'desc'))
    return onSnapshot(
      coursesQuery,
      (snapshot) => {
        const nextCourses = snapshot.docs
          .map((item) => {
            const data = item.data()
            return {
              id: item.id,
              titulo: typeof data.titulo === 'string' ? data.titulo : 'Curso sin título',
              descripcion: typeof data.descripcion === 'string' ? data.descripcion : '',
              imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : '',
              estatus: typeof data.estatus === 'string' ? data.estatus : 'Publicado',
              createdAt: toCourseDate(data.createdAt),
              createdBy: typeof data.createdBy === 'string' ? data.createdBy : '—',
            }
          })
        setCourses(nextCourses)
        setCoursesError('')
        setLoadingCourses(false)
      },
      (snapshotError) => {
        console.error('Error al escuchar los cursos en Firestore:', snapshotError)
        setCoursesError('No fue posible cargar los cursos. Verifique la conexión y los permisos.')
        setLoadingCourses(false)
      },
    )
  }, [])

  async function createCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanTitle = title.trim()
    const cleanDescription = description.trim()
    if (!cleanTitle || !cleanDescription || !imageFile) {
      setNotice({
        type: 'error',
        text: 'Capture el título, la descripción y seleccione una imagen.',
      })
      return
    }
    if (!firebaseUser) {
      setNotice({ type: 'error', text: 'Inicie sesión para publicar un curso.' })
      return
    }
    if (!imageFile.type.startsWith('image/')) {
      setNotice({ type: 'error', text: 'El archivo seleccionado debe ser una imagen.' })
      return
    }

    setIsSubmitting(true)
    setNotice(null)
    let uploadedImage: ReturnType<typeof ref> | null = null
    try {
      const safeFileName = imageFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      uploadedImage = ref(storage, `cursos/${crypto.randomUUID()}-${safeFileName}`)
      const uploaded = await uploadBytes(uploadedImage, imageFile, {
        contentType: imageFile.type,
      })
      const imageUrl = (await getDownloadURL(uploaded.ref)).trim()
      if (!imageUrl) throw new Error('Firebase Storage no devolvió una URL de imagen válida.')

      await addDoc(collection(db, 'cursos'), {
        titulo: cleanTitle,
        descripcion: cleanDescription,
        imageUrl: imageUrl.trim(),
        estatus: 'Publicado',
        createdAt: serverTimestamp(),
        createdBy:
          profile?.nombre || firebaseUser.displayName || firebaseUser.email || firebaseUser.uid,
      })

      setTitle('')
      setDescription('')
      setImageFile(null)
      formRef.current?.reset()
      setNotice({ type: 'success', text: 'Curso publicado correctamente.' })
    } catch (error) {
      console.error('Error al publicar el curso en Firebase:', error)
      if (uploadedImage) {
        try {
          await deleteObject(uploadedImage)
        } catch (cleanupError) {
          console.error(
            'No fue posible limpiar la imagen del curso que no se publicó:',
            cleanupError,
          )
        }
      }
      setNotice({
        type: 'error',
        text:
          error instanceof Error
            ? `No fue posible publicar el curso: ${error.message}`
            : 'No fue posible publicar el curso.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function cancelCourse(course: Course) {
    if (course.estatus.toLocaleLowerCase('es-MX') === 'cancelado' || cancellingId) return
    if (!window.confirm(`¿Desea cancelar el curso "${course.titulo}"?`)) return

    setCancellingId(course.id)
    setNotice(null)
    try {
      await updateDoc(doc(db, 'cursos', course.id), { estatus: 'Cancelado' })
      setNotice({ type: 'success', text: `El curso "${course.titulo}" fue cancelado.` })
    } catch (error) {
      console.error('Error al cancelar el curso en Firestore:', error)
      setNotice({
        type: 'error',
        text:
          error instanceof Error
            ? `No fue posible cancelar el curso: ${error.message}`
            : 'No fue posible cancelar el curso.',
      })
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-[1400px]">
      <header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Gestión de Capacitaciones y Cursos
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Publica cursos y consulta en tiempo real las inscripciones de la ciudadanía.
          </p>
        </div>
        <a
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold shadow-md"
          href="#nuevo-curso"
        >
          Nuevo curso
        </a>
      </header>

      {notice && (
        <div
          className={`mb-4 rounded-lg px-4 py-3 text-sm font-semibold ${
            notice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800'
              : 'bg-rose-50 text-rose-800'
          }`}
          role={notice.type === 'error' ? 'alert' : 'status'}
        >
          {notice.text}
        </div>
      )}
      {coursesError && (
        <p
          className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800"
          role="alert"
        >
          {coursesError}
        </p>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <form
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.08)]"
          id="nuevo-curso"
          onSubmit={createCourse}
          ref={formRef}
        >
          <h2 className="font-extrabold text-[#19365f]">Crear y publicar curso</h2>
          <label className="mt-4 block text-sm font-semibold text-slate-600">
            Título del curso
            <input
              className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              maxLength={160}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ej. Primeros auxilios básicos"
              required
              value={title}
            />
          </label>
          <label className="mt-3 block text-sm font-semibold text-slate-600">
            Descripción detallada
            <textarea
              className="mt-1 min-h-32 w-full rounded-lg border border-slate-300 p-3 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              maxLength={5000}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe el contenido y objetivo del curso…"
              required
              value={description}
            />
          </label>
          <label className="mt-3 block text-sm font-semibold text-slate-600">
            Imagen del curso
            <input
              accept="image/*"
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-bold file:text-blue-800"
              onChange={(event) => setImageFile(event.target.files?.[0] || null)}
              required
              type="file"
            />
          </label>
          {imageFile && (
            <p className="mt-2 truncate text-xs text-slate-500">Seleccionada: {imageFile.name}</p>
          )}
          <button
            className="mt-5 w-full rounded-lg bg-[#19365f] px-4 py-3 font-bold text-white shadow-lg transition hover:bg-[#244b7a] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'Subiendo imagen y publicando…' : 'Publicar curso'}
          </button>
        </form>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="font-extrabold text-[#19365f]">Cursos publicados</h2>
              <p className="mt-1 text-xs text-slate-500">
                Sincronizado en tiempo real con Firestore
              </p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">
              {courses.length} cursos
            </span>
          </div>

          {loadingCourses ? (
            <p className="px-5 py-12 text-center text-sm text-slate-500">Cargando cursos…</p>
          ) : courses.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-slate-500">
              Aún no hay cursos publicados.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {courses.map((course) => {
                const cancelled = course.estatus.toLocaleLowerCase('es-MX') === 'cancelado'
                return (
                  <li
                    className={`flex flex-col gap-4 p-5 sm:flex-row ${cancelled ? 'bg-slate-50' : 'bg-white'}`}
                    key={course.id}
                  >
                    {course.imageUrl ? (
                      <img
                        alt=""
                        className={`h-28 w-full shrink-0 rounded-lg object-cover sm:w-40 ${cancelled ? 'opacity-50 grayscale' : ''}`}
                        src={course.imageUrl}
                      />
                    ) : (
                      <div className="grid h-28 w-full shrink-0 place-items-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-400 sm:w-40">
                        Sin imagen
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-extrabold text-[#19365f]">{course.titulo}</h3>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${courseStatusStyle(course.estatus)}`}
                        >
                          {course.estatus}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-slate-600">
                        {course.descripcion}
                      </p>
                      <p className="mt-2 text-xs text-slate-400">
                        Publicado {formatCourseDate(course.createdAt)} · {course.createdBy}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          className="rounded-lg bg-[#19365f] px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#244b7a]"
                          onClick={() => setSelectedCourse(course)}
                          type="button"
                        >
                          Ver inscritos
                        </button>
                        <button
                          className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={cancelled || cancellingId !== null}
                          onClick={() => void cancelCourse(course)}
                          type="button"
                        >
                          {cancellingId === course.id
                            ? 'Cancelando…'
                            : cancelled
                              ? 'Curso cancelado'
                              : 'Cancelar curso'}
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      <CourseEnrollmentPanel course={selectedCourse} onClose={() => setSelectedCourse(null)} />
    </div>
  )
}
