'use client'

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { EditIcon, TrashIcon, UploadIcon } from '@/components/icons'
import { useAuth } from '@/components/auth-provider'
import { db, storage } from '@/lib/firebase'

type InstitutionalInfo = {
  mision: string
  vision: string
  funciones: string[]
  imagenes: string[]
}

type EditableField = 'mision' | 'vision' | 'funciones'
type Toast = { type: 'success' | 'error'; message: string }

const EMPTY_INFO: InstitutionalInfo = {
  mision: '',
  vision: '',
  funciones: [],
  imagenes: [],
}

const infoRef = doc(db, 'configuracion', 'acerca_de')

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      aria-label={label}
      className="grid size-9 shrink-0 place-items-center rounded-lg border border-transparent text-slate-400 transition-colors duration-200 hover:border-slate-200 hover:bg-slate-100 hover:text-[#19365f] focus-visible:outline-2 focus-visible:outline-blue-600"
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  )
}

function parseFunctions(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function InstitutionalInfoView() {
  const { firebaseUser } = useAuth()
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [info, setInfo] = useState<InstitutionalInfo>(EMPTY_INFO)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [editingField, setEditingField] = useState<EditableField | null>(null)
  const [draft, setDraft] = useState('')
  const [savingField, setSavingField] = useState<EditableField | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [removingImage, setRemovingImage] = useState<string | null>(null)
  const [activeImage, setActiveImage] = useState(0)
  const [toast, setToast] = useState<Toast | null>(null)

  useEffect(() => {
    return onSnapshot(
      infoRef,
      (snapshot) => {
        const data = snapshot.data()
        setInfo(
          data
            ? {
                mision: stringValue(data.mision),
                vision: stringValue(data.vision),
                funciones: stringList(data.funciones),
                imagenes: stringList(data.imagenes),
              }
            : EMPTY_INFO,
        )
        setActiveImage(0)
        setLoadError('')
        setLoading(false)
      },
      (error) => {
        console.error('Error al escuchar la información institucional:', error)
        setLoadError('No fue posible cargar la información. Verifica tu conexión y permisos.')
        setLoading(false)
      },
    )
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 4500)
    return () => window.clearTimeout(timer)
  }, [toast])

  function startEditing(field: EditableField) {
    setEditingField(field)
    setDraft(field === 'funciones' ? info.funciones.join('\n') : info[field])
  }

  async function saveField(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingField || !firebaseUser) {
      setToast({
        type: 'error',
        message: 'Inicia sesión con una cuenta autorizada para guardar cambios.',
      })
      return
    }

    const field = editingField
    const value = field === 'funciones' ? parseFunctions(draft) : draft.trim()
    if (field !== 'funciones' && !value) {
      setToast({ type: 'error', message: 'El contenido no puede quedar vacío.' })
      return
    }
    if (field === 'funciones' && value.length === 0) {
      setToast({ type: 'error', message: 'Agrega al menos una función antes de guardar.' })
      return
    }

    setSavingField(field)
    try {
      const update = {
        [field]: value,
        updatedAt: serverTimestamp(),
        updatedBy: firebaseUser.uid,
      }
      const snapshot = await getDoc(infoRef)
      if (snapshot.exists()) {
        await updateDoc(infoRef, update)
      } else {
        await setDoc(infoRef, { ...EMPTY_INFO, ...update }, { merge: true })
      }
      setEditingField(null)
      setDraft('')
      setToast({
        type: 'success',
        message:
          field === 'funciones'
            ? 'Funciones institucionales actualizadas correctamente.'
            : `${field === 'mision' ? 'Misión' : 'Visión'} actualizada correctamente.`,
      })
    } catch (error) {
      console.error(`Error al actualizar ${field} en Firestore:`, error)
      setToast({
        type: 'error',
        message:
          error instanceof Error
            ? `No fue posible guardar: ${error.message}`
            : 'No fue posible guardar los cambios.',
      })
    } finally {
      setSavingField(null)
    }
  }

  async function addImage(file: File | undefined) {
    if (!file) return
    if (!firebaseUser) {
      setToast({
        type: 'error',
        message: 'Inicia sesión con una cuenta autorizada para subir imágenes.',
      })
      return
    }
    if (!file.type.startsWith('image/')) {
      setToast({ type: 'error', message: 'Selecciona un archivo de imagen válido.' })
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setToast({ type: 'error', message: 'La imagen debe pesar 10 MB o menos.' })
      return
    }

    setUploadingImage(true)
    let uploadedRef: ReturnType<typeof ref> | null = null
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      uploadedRef = ref(storage, `informacion-institucional/${crypto.randomUUID()}-${safeName}`)
      const upload = await uploadBytes(uploadedRef, file, { contentType: file.type })
      const imageUrl = (await getDownloadURL(upload.ref)).trim()
      if (!imageUrl) throw new Error('Firebase Storage no devolvió una URL de imagen válida.')

      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(infoRef)
        const currentImages = stringList(snapshot.data()?.imagenes)
        transaction.set(
          infoRef,
          {
            ...(!snapshot.exists() ? EMPTY_INFO : {}),
            imagenes: [...currentImages, imageUrl.trim()],
            updatedAt: serverTimestamp(),
            updatedBy: firebaseUser.uid,
          },
          { merge: true },
        )
      })

      setToast({ type: 'success', message: 'Imagen agregada al carrusel institucional.' })
    } catch (error) {
      console.error('Error al subir imagen al carrusel institucional:', error)
      if (uploadedRef) {
        try {
          await deleteObject(uploadedRef)
        } catch (cleanupError) {
          console.error(
            'No fue posible limpiar la imagen del carrusel que no se guardó:',
            cleanupError,
          )
        }
      }
      setToast({
        type: 'error',
        message:
          error instanceof Error
            ? `No fue posible subir la imagen: ${error.message}`
            : 'No fue posible subir la imagen.',
      })
    } finally {
      setUploadingImage(false)
      if (imageInputRef.current) imageInputRef.current.value = ''
    }
  }

  async function removeImage(imageUrl: string) {
    if (!firebaseUser || removingImage) {
      if (!firebaseUser)
        setToast({ type: 'error', message: 'Inicia sesión para administrar las imágenes.' })
      return
    }
    if (!window.confirm('¿Quitar esta imagen del carrusel que ven los ciudadanos?')) return

    setRemovingImage(imageUrl)
    try {
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(infoRef)
        if (!snapshot.exists()) throw new Error('No existe la configuración institucional.')

        const currentImages = stringList(snapshot.data().imagenes)
        const imageIndex = currentImages.indexOf(imageUrl)
        if (imageIndex < 0) throw new Error('La imagen ya no está en el carrusel.')
        currentImages.splice(imageIndex, 1)
        transaction.update(infoRef, {
          imagenes: currentImages,
          updatedAt: serverTimestamp(),
          updatedBy: firebaseUser.uid,
        })
      })
      setToast({ type: 'success', message: 'Imagen quitada del carrusel.' })
    } catch (error) {
      console.error('Error al quitar imagen del carrusel institucional:', error)
      setToast({
        type: 'error',
        message:
          error instanceof Error
            ? `No fue posible quitar la imagen: ${error.message}`
            : 'No fue posible quitar la imagen.',
      })
    } finally {
      setRemovingImage(null)
    }
  }

  const editing = (field: EditableField) => editingField === field

  return (
    <div className="mx-auto max-w-6xl">
      {toast && (
        <div
          className={`fixed right-4 top-20 z-[70] flex max-w-md items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-bold shadow-2xl ${
            toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
          role={toast.type === 'error' ? 'alert' : 'status'}
        >
          <span>{toast.message}</span>
          <button
            aria-label="Cerrar notificación"
            className="text-xs opacity-70 hover:opacity-100"
            onClick={() => setToast(null)}
            type="button"
          >
            Cerrar
          </button>
        </div>
      )}

      <header className="mb-6">
        <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
          Contenido para la app ciudadana
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#19365f] sm:text-3xl">
          Información Institucional
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Administra la información de Protección Civil que aparece en la sección “Acerca de”.
        </p>
      </header>

      {loadError && (
        <p
          className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800"
          role="alert"
        >
          {loadError}
        </p>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <section
          aria-label="Vista previa de Acerca de Protección Civil"
          className="mx-auto w-full max-w-[500px] overflow-hidden rounded-[28px] border border-slate-200 bg-[#f0f4f7] shadow-[0_12px_36px_rgba(15,23,42,0.12)]"
        >
          <header className="flex h-[72px] items-center gap-3 bg-[#081a2e] px-5 text-white">
            <span className="grid size-10 shrink-0 place-items-center rounded-full border-2 border-[#d0a12b] bg-[#713249] text-xs font-extrabold">
              PC
            </span>
            <h2 className="text-base font-extrabold">Acerca de Protección Civil</h2>
            <span className="ml-auto grid size-9 place-items-center rounded-full bg-slate-100 text-sm font-bold text-[#19365f]">
              {firebaseUser?.displayName?.slice(0, 1).toUpperCase() || 'U'}
            </span>
          </header>

          <div className="space-y-3 p-4 sm:p-5">
            <section aria-label="Carrusel institucional" className="relative">
              <div className="relative aspect-[1.25] overflow-hidden rounded-2xl bg-slate-200 shadow-sm">
                {info.imagenes.length > 0 ? (
                  <img
                    alt={`Imagen institucional ${activeImage + 1}`}
                    className="h-full w-full object-cover"
                    src={info.imagenes[Math.min(activeImage, info.imagenes.length - 1)]}
                  />
                ) : (
                  <div className="grid h-full place-items-center px-6 text-center text-sm font-semibold text-slate-500">
                    {loading
                      ? 'Cargando imágenes institucionales…'
                      : 'Aún no hay imágenes en el carrusel'}
                  </div>
                )}
              </div>
              {info.imagenes.length > 1 && (
                <div className="mt-2 flex justify-center gap-2" aria-label="Seleccionar imagen">
                  {info.imagenes.map((image, index) => (
                    <button
                      aria-label={`Mostrar imagen ${index + 1}`}
                      aria-pressed={activeImage === index}
                      className={`h-2.5 rounded-full transition-all ${
                        activeImage === index ? 'w-7 bg-[#713249]' : 'w-2.5 bg-slate-300'
                      }`}
                      key={`${index}-${image}`}
                      onClick={() => setActiveImage(index)}
                      type="button"
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="grid size-9 place-items-center rounded-xl bg-[#f7eaed] text-lg text-[#713249]"
                  aria-hidden="true"
                >
                  ⚑
                </span>
                <h3 className="font-extrabold text-[#713249]">MISIÓN</h3>
                <IconButton label="Editar misión" onClick={() => startEditing('mision')}>
                  <EditIcon className="size-4" />
                </IconButton>
              </div>
              {editing('mision') ? (
                <form onSubmit={saveField}>
                  <textarea
                    aria-label="Editar misión"
                    autoFocus
                    className="min-h-28 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm leading-relaxed text-slate-800 outline-none focus:border-[#19365f] focus:ring-2 focus:ring-blue-100"
                    maxLength={3000}
                    onChange={(event) => setDraft(event.target.value)}
                    value={draft}
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      className="rounded-lg bg-[#19365f] px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                      disabled={savingField !== null}
                      type="submit"
                    >
                      {savingField === 'mision' ? 'Guardando…' : 'Guardar'}
                    </button>
                    <button
                      className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600"
                      onClick={() => setEditingField(null)}
                      type="button"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                  {info.mision ||
                    (loading ? 'Cargando misión…' : 'Agrega la misión institucional.')}
                </p>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="grid size-9 place-items-center rounded-xl bg-[#f7eaed] text-lg text-[#713249]"
                  aria-hidden="true"
                >
                  ◎
                </span>
                <h3 className="font-extrabold text-[#713249]">VISIÓN</h3>
                <IconButton label="Editar visión" onClick={() => startEditing('vision')}>
                  <EditIcon className="size-4" />
                </IconButton>
              </div>
              {editing('vision') ? (
                <form onSubmit={saveField}>
                  <textarea
                    aria-label="Editar visión"
                    autoFocus
                    className="min-h-28 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm leading-relaxed text-slate-800 outline-none focus:border-[#19365f] focus:ring-2 focus:ring-blue-100"
                    maxLength={3000}
                    onChange={(event) => setDraft(event.target.value)}
                    value={draft}
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      className="rounded-lg bg-[#19365f] px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                      disabled={savingField !== null}
                      type="submit"
                    >
                      {savingField === 'vision' ? 'Guardando…' : 'Guardar'}
                    </button>
                    <button
                      className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600"
                      onClick={() => setEditingField(null)}
                      type="button"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                  {info.vision ||
                    (loading ? 'Cargando visión…' : 'Agrega la visión institucional.')}
                </p>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="grid size-9 place-items-center rounded-xl bg-[#f7eaed] text-lg text-[#713249]"
                  aria-hidden="true"
                >
                  ▤
                </span>
                <h3 className="font-extrabold text-[#713249]">Funciones operativas</h3>
                <IconButton label="Editar funciones" onClick={() => startEditing('funciones')}>
                  <EditIcon className="size-4" />
                </IconButton>
              </div>
              {editing('funciones') ? (
                <form onSubmit={saveField}>
                  <label
                    className="block text-xs font-semibold text-slate-500"
                    htmlFor="institution-functions"
                  >
                    Una función por línea
                  </label>
                  <textarea
                    autoFocus
                    className="mt-1 min-h-36 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm leading-relaxed text-slate-800 outline-none focus:border-[#19365f] focus:ring-2 focus:ring-blue-100"
                    id="institution-functions"
                    maxLength={5000}
                    onChange={(event) => setDraft(event.target.value)}
                    value={draft}
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      className="rounded-lg bg-[#19365f] px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                      disabled={savingField !== null}
                      type="submit"
                    >
                      {savingField === 'funciones' ? 'Guardando…' : 'Guardar'}
                    </button>
                    <button
                      className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600"
                      onClick={() => setEditingField(null)}
                      type="button"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : info.funciones.length > 0 ? (
                <ul className="space-y-2.5">
                  {info.funciones.map((item, index) => (
                    <li
                      className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-700"
                      key={`${index}-${item}`}
                    >
                      <span className="mt-0.5 shrink-0 text-[#19365f]" aria-hidden="true">
                        ◇
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">
                  {loading ? 'Cargando funciones…' : 'Agrega las funciones operativas.'}
                </p>
              )}
            </section>
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.07)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-extrabold text-[#19365f]">Carrusel de imágenes</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Estas imágenes se muestran en la parte superior de “Acerca de”.
                </p>
              </div>
              <input
                accept="image/*"
                className="sr-only"
                onChange={(event) => void addImage(event.target.files?.[0])}
                ref={imageInputRef}
                type="file"
              />
              <button
                className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#19365f] px-3 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#244b7a] disabled:cursor-wait disabled:opacity-60"
                disabled={uploadingImage}
                onClick={() => imageInputRef.current?.click()}
                type="button"
              >
                <UploadIcon className="size-4" />
                {uploadingImage ? 'Subiendo…' : 'Subir imagen'}
              </button>
            </div>

            {info.imagenes.length === 0 ? (
              <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
                <p className="text-sm font-semibold text-slate-600">
                  {loading ? 'Cargando carrusel…' : 'No hay imágenes todavía.'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Selecciona una imagen para agregarla al carrusel de la app.
                </p>
              </div>
            ) : (
              <ul className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                {info.imagenes.map((image, index) => (
                  <li
                    className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                    key={`${index}-${image}`}
                  >
                    <div className="relative aspect-[4/3] bg-slate-100">
                      <img
                        alt={`Imagen del carrusel ${index + 1}`}
                        className="h-full w-full object-cover"
                        src={image}
                      />
                      <span className="absolute left-2 top-2 rounded-full bg-slate-950/70 px-2.5 py-1 text-[11px] font-bold text-white">
                        Imagen {index + 1}
                      </span>
                      <button
                        aria-label={`Quitar imagen ${index + 1} del carrusel`}
                        className="absolute right-2 top-2 grid size-9 place-items-center rounded-lg bg-white/95 text-rose-700 shadow-md transition hover:bg-rose-50 disabled:opacity-50"
                        disabled={removingImage !== null}
                        onClick={() => void removeImage(image)}
                        title="Quitar imagen del carrusel"
                        type="button"
                      >
                        <TrashIcon className="size-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950">
            <strong>Vista previa en tiempo real</strong>
            <p className="mt-1 leading-relaxed">
              Los textos e imágenes se leen directamente de
              <code className="mx-1 rounded bg-white/70 px-1.5 py-0.5 text-xs">
                configuracion/acerca_de
              </code>
              y se sincronizan con Firestore al guardar.
            </p>
          </section>
        </aside>
      </div>
    </div>
  )
}
