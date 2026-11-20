'use client'

import { useEffect, useRef, useState } from 'react'
import { TrashIcon } from '@/components/icons'
import { auth, db, storage } from '@/lib/firebase'
import { FirebaseError } from 'firebase/app'
import { useAuth } from '@/components/auth-provider'
import { registrarAccionAuditoria } from '@/lib/audit'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'

const levels = [
  ['AZUL', 'Peligro muy bajo', 'bg-blue-600', 'border-blue-800'],
  ['VERDE', 'Peligro bajo', 'bg-emerald-700', 'border-emerald-900'],
  ['AMARILLO', 'Peligro moderado', 'bg-yellow-400 text-slate-950', 'border-yellow-600'],
  ['NARANJA', 'Peligro alto', 'bg-orange-500 text-slate-950', 'border-orange-800'],
  ['ROJO', 'Peligro máximo', 'bg-red-600', 'border-red-900'],
] as const

const levelDetails: Record<string, string> = {
  AZUL: 'Peligro muy bajo',
  VERDE: 'Peligro bajo',
  AMARILLO: 'Peligro moderado',
  NARANJA: 'Peligro alto',
  ROJO: 'Peligro máximo',
}

const levelColors: Record<string, string> = {
  AZUL: 'bg-blue-600 border-blue-800',
  VERDE: 'bg-emerald-700 border-emerald-900',
  AMARILLO: 'bg-yellow-400 border-yellow-600 text-slate-950',
  NARANJA: 'bg-orange-500 border-orange-800 text-slate-950',
  ROJO: 'bg-red-600 border-red-900',
}

type Publication = {
  id: string
  title: string
  message: string
  location: string
  level: string
  imageUrl?: string
  likes?: string[]
  publishedAt?: { toDate?: () => Date }
  createdAt?: { toDate?: () => Date }
}

type PostComment = {
  id: string
  text?: string
  message?: string
  userName?: string
  authorName?: string
  photoUrl?: string
  official?: boolean
  createdAt?: { toDate?: () => Date }
}

export function SiatView() {
  const { role, profile } = useAuth()
  const canEmit = role === 'admin' || role === 'administrador' || role === 'validador'
  const [level, setLevel] = useState('NARANJA')
  const [pendingLevel, setPendingLevel] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [location, setLocation] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState('')
  const imageFileInput = useRef<HTMLInputElement>(null)
  const [feedback, setFeedback] = useState('')
  const [filter, setFilter] = useState('Todas')
  const [publishAlerts, setPublishAlerts] = useState(true)
  const [sendPush, setSendPush] = useState(true)
  const [publications, setPublications] = useState<Publication[]>([])
  const [selectedPost, setSelectedPost] = useState<Publication | null>(null)
  const [comments, setComments] = useState<PostComment[]>([])
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({})
  const [responseDraft, setResponseDraft] = useState('')
  const [sendingResponse, setSendingResponse] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [savingAlert, setSavingAlert] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message })
    window.setTimeout(() => setToast(null), 4500)
  }

  useEffect(() => {
    const alertRef = doc(db, 'configuracion', 'semaforo')
    getDoc(alertRef).then((snapshot) => {
      if (snapshot.exists() && snapshot.data().level) {
        const current = String(snapshot.data().level).toUpperCase()
        setLevel(current)
      }
    })
    return onSnapshot(alertRef, (snapshot) => {
      if (snapshot.exists() && snapshot.data().level) {
        setLevel(String(snapshot.data().level).toUpperCase())
        setPendingLevel(null)
      }
    })
  }, [])

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl('')
      return
    }
    const previewUrl = URL.createObjectURL(imageFile)
    setImagePreviewUrl(previewUrl)
    return () => URL.revokeObjectURL(previewUrl)
  }, [imageFile])

  useEffect(() => {
    const publicationsQuery = query(collection(db, 'posts'), orderBy('publishedAt', 'desc'))
    return onSnapshot(publicationsQuery, (snapshot) => {
      setPublications(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Publication)))
    })
  }, [])

  useEffect(() => {
    const unsubscribers = publications.map((item) =>
      onSnapshot(collection(db, 'posts', item.id, 'comments'), (snapshot) => {
        setCommentCounts((current) => ({ ...current, [item.id]: snapshot.size }))
      }),
    )
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe())
  }, [publications])

  useEffect(() => {
    if (!selectedPost) {
      setComments([])
      setResponseDraft('')
      return
    }
    const commentsQuery = collection(db, 'posts', selectedPost.id, 'comments')
    return onSnapshot(commentsQuery, (snapshot) => {
      setComments(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as PostComment)))
    })
  }, [selectedPost])

  async function confirmAlert(selectedLevel = pendingLevel) {
    if (!selectedLevel || !canEmit) return
    setSavingAlert(true)
    try {
      await setDoc(doc(db, 'configuracion', 'semaforo'), {
        level: selectedLevel,
        detail: levelDetails[selectedLevel],
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.email || profile?.correo || 'sistema',
        active: true,
      }, { merge: true })
      await registrarAccionAuditoria(`EMITIÓ ALERTA SIAT-CT · ${selectedLevel}`, 'Éxito')
      setLevel(selectedLevel)
      setPendingLevel(null)
      setFeedback(`Alerta ${selectedLevel} emitida oficialmente y publicada en la app ciudadana.`)
      showToast('success', `Alerta ${selectedLevel} actualizada y sincronizada con la app móvil.`)
    } catch {
      await registrarAccionAuditoria(`FALLO EMISIÓN ALERTA SIAT-CT · ${selectedLevel}`, 'Fallo')
      setFeedback('No fue posible emitir la alerta. Verifique su conexión e permisos.')
      showToast('error', 'No fue posible actualizar el semáforo.')
    } finally {
      setSavingAlert(false)
    }
  }

  function selectAlertLevel(selectedLevel: string) {
    if (!canEmit || selectedLevel === level) return
    const confirmed = window.confirm(
      `¿Desea emitir oficialmente la Alerta ${selectedLevel}?\n\nEste cambio se sincronizará inmediatamente con la app móvil.`,
    )
    if (!confirmed) return
    setPendingLevel(selectedLevel)
    void confirmAlert(selectedLevel)
  }

  async function publishPost() {
    const cleanTitle = title.trim()
    const cleanMessage = message.trim()
    if (!cleanTitle || !cleanMessage) {
      setFeedback('Capture el título y las instrucciones antes de publicar.')
      showToast('error', 'Complete el título y las instrucciones antes de publicar.')
      return
    }
    setPublishing(true)
    try {
      const postRef = doc(collection(db, 'posts'))
      let cleanImageUrl = imageUrl.trim()
      if (imageFile) {
        const safeFileName = imageFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const imageRef = ref(storage, `posts/${postRef.id}/${Date.now()}-${safeFileName}`)
        const uploadResult = await uploadBytes(imageRef, imageFile, {
          contentType: imageFile.type,
        })
        cleanImageUrl = await getDownloadURL(uploadResult.ref)
      }

      await setDoc(postRef, {
        title: cleanTitle,
        message: cleanMessage,
        location: location.trim(),
        level,
        imageUrl: cleanImageUrl,
        publishAlerts,
        sendPush,
        likes: [],
        publishedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        publishedBy: auth.currentUser?.email || profile?.correo || 'sistema',
      })
      await registrarAccionAuditoria(`PUBLICÓ COMUNICADO OFICIAL · ${cleanTitle}`, 'Éxito')
      const successMessage = sendPush
        ? 'Comunicado publicado. La notificación push fue registrada para envío masivo.'
        : 'Comunicado publicado correctamente en el Muro de Alertas.'
      setFeedback(successMessage)
      showToast('success', successMessage)
      setTitle('')
      setMessage('')
      setLocation('')
      setImageUrl('')
      setImageFile(null)
      if (imageFileInput.current) imageFileInput.current.value = ''
    } catch {
      await registrarAccionAuditoria('FALLO PUBLICACIÓN COMUNICADO OFICIAL', 'Fallo')
      setFeedback('No fue posible subir la imagen o publicar el comunicado. Verifique la conexión y vuelva a intentarlo.')
      showToast('error', 'No fue posible subir la imagen o publicar el comunicado.')
    } finally {
      setPublishing(false)
    }
  }

  async function sendOfficialResponse() {
    const cleanResponse = responseDraft.trim()
    if (!selectedPost || !cleanResponse) return
    const user = auth.currentUser
    if (!canEmit || !user) {
      showToast('error', 'Inicie sesión con una cuenta autorizada para responder.')
      return
    }

    setSendingResponse(true)
    try {
      await addDoc(collection(db, 'posts', selectedPost.id, 'comments'), {
        text: cleanResponse,
        uid: user.uid,
        userName: profile?.nombre || 'Protección Civil Benito Juárez',
        photoUrl: user.photoURL,
        official: true,
        createdAt: serverTimestamp(),
      })
      setResponseDraft('')
      showToast('success', 'Respuesta oficial publicada y sincronizada con la app.')
      await registrarAccionAuditoria(`RESPONDió COMENTARIO · ${selectedPost.title}`, 'Éxito')
    } catch (error) {
      console.error('Error al publicar la respuesta oficial en Firestore:', error)
      const detail = error instanceof FirebaseError
        ? `${error.code}: ${error.message}`
        : error instanceof Error
          ? error.message
          : 'Error desconocido'
      showToast('error', `No fue posible publicar la respuesta: ${detail}`)
      await registrarAccionAuditoria(`FALLO RESPUESTA COMENTARIO · ${selectedPost.title}`, 'Fallo')
    } finally {
      setSendingResponse(false)
    }
  }

  async function deletePublication(item: Publication) {
    if (!canEmit) return
    const confirmed = window.confirm(
      '¿Estás seguro de que deseas eliminar esta publicación de forma permanente?',
    )
    if (!confirmed) return

    setDeletingId(item.id)
    try {
      await deleteDoc(doc(db, 'posts', item.id))
      await registrarAccionAuditoria(`ELIMINACIÓN PUBLICACIÓN · ${item.title}`, 'Éxito')
      setFeedback('La publicación fue eliminada del muro.')
      showToast('success', 'La publicación fue eliminada del muro.')
    } catch {
      setFeedback('No fue posible eliminar la publicación.')
      showToast('error', 'No fue posible eliminar la publicación.')
      await registrarAccionAuditoria(`FALLO ELIMINACIÓN PUBLICACIÓN · ${item.title}`, 'Fallo')
    } finally {
      setDeletingId(null)
    }
  }

  const previewLevel = pendingLevel || level
  const previewStyle = levelColors[previewLevel] || levelColors.NARANJA

  return (
    <div className="mx-auto max-w-[1400px]">
      <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Emisión de Alertas Meteorológicas Oficiales (SIAT-CT)
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Los cambios se publican de inmediato en la app ciudadana y en el Muro de Alertas.
          </p>
        </div>
        <button
          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold shadow-md"
          onClick={() => setFeedback('Historial de emisiones disponible en la bitácora de auditoría.')}
        >
          Historial de emisiones
        </button>
      </header>

      {toast && (
        <div
          role="status"
          className={`fixed right-4 top-20 z-[70] flex max-w-sm items-center gap-3 rounded-xl border px-4 py-3 text-sm font-bold shadow-2xl transition-all sm:right-7 ${
            toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          <span className={`grid size-8 shrink-0 place-items-center rounded-full text-white ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
            {toast.type === 'success' ? '✓' : '!'}
          </span>
          <span>{toast.message}</span>
          <button className="ml-2 text-xs opacity-70 hover:opacity-100" type="button" onClick={() => setToast(null)}>
            Cerrar
          </button>
        </div>
      )}

      {feedback && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900 shadow-sm">
          <span>{feedback}</span>
          <button className="text-xs underline" onClick={() => setFeedback('')}>Cerrar</button>
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.08)]">
        <h2 className="mb-3 text-sm font-extrabold">Nivel de alerta vigente del municipio</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {levels.map(([name, detail, color]) => (
            <button
              className={`rounded-xl px-4 py-4 text-white shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${color} ${level === name ? 'ring-4 ring-slate-900 ring-offset-2' : ''} ${pendingLevel === name ? 'outline outline-4 outline-white' : ''}`}
              key={name}
              disabled={!canEmit || savingAlert}
              onClick={() => selectAlertLevel(name)}
            >
              <strong className="block text-lg">{name}</strong>
              <span className="block text-xs">{detail}</span>
              <small className="font-bold">
                {level === name ? 'ALERTA ACTIVA' : pendingLevel === name ? 'SELECCIONADO' : 'Seleccionar'}
              </small>
            </button>
          ))}
        </div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,2fr)_360px]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.08)]">
          <h2 className="font-extrabold">Editor de comunicado oficial</h2>
          <label className="mt-4 block text-xs font-semibold text-slate-500">
            Título del aviso
            <input
              className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-600"
              placeholder="Ej. Evacuación preventiva en zona costera"
              onChange={(e) => setTitle(e.target.value)}
              value={title}
            />
          </label>
          <label className="mt-3 block text-xs font-semibold text-slate-500">
            Instrucciones de evacuación
            <textarea
              className="mt-1 min-h-28 w-full resize-none rounded-lg border border-slate-300 p-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-600"
              placeholder="Ej. Acuda al refugio más cercano con documentos, medicamentos y agua potable."
              onChange={(e) => setMessage(e.target.value)}
              value={message}
            />
          </label>
          <label className="mt-3 block text-xs font-semibold text-slate-500">
            Ubicación o coordenadas
            <input
              className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-600"
              placeholder="Ej. Zona costera, Cancún · 21.1619, -86.8515"
              onChange={(e) => setLocation(e.target.value)}
              value={location}
            />
          </label>
          <label className="mt-3 block text-xs font-semibold text-slate-500">
            Imagen o mapa del comunicado (Opcional)
            <input
              ref={imageFileInput}
              accept="image/*"
              className="mt-1 block w-full cursor-pointer rounded-lg border border-slate-300 bg-white text-sm text-slate-600 file:mr-4 file:rounded-l-lg file:border-0 file:bg-slate-100 file:px-4 file:py-3 file:text-sm file:font-bold file:text-[#19365f] hover:file:bg-slate-200"
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0] || null
                if (file && !file.type.startsWith('image/')) {
                  setImageFile(null)
                  event.target.value = ''
                  showToast('error', 'Seleccione un archivo de imagen válido.')
                  return
                }
                setImageFile(file)
              }}
            />
            {imageFile && <span className="mt-1 block text-xs text-slate-500">Se subirá: {imageFile.name}</span>}
          </label>
          <label className="mt-3 block text-xs font-semibold text-slate-500">
            O usa una URL de imagen existente
            <input
              className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-600"
              placeholder="https://ejemplo.com/imagen.jpg"
              type="text"
              onChange={(e) => setImageUrl(e.target.value)}
              value={imageUrl}
            />
          </label>
          <div className="mt-4 flex flex-wrap gap-5 text-sm">
            <label>
              <input className="mr-2 accent-blue-600" type="checkbox" checked={publishAlerts} onChange={(e) => setPublishAlerts(e.target.checked)} />
              Publicar en Muro de Alertas
            </label>
            <label>
              <input className="mr-2 accent-blue-600" type="checkbox" checked={sendPush} onChange={(e) => setSendPush(e.target.checked)} />
              Notificación Push masiva
            </label>
          </div>
          <button
            className="mt-4 flex h-12 w-full items-center justify-center rounded-lg bg-[#713249] px-4 font-bold text-white shadow-lg disabled:opacity-60"
            disabled={publishing || !canEmit}
            onClick={publishPost}
          >
            {publishing ? (
              <span className="flex items-center gap-2">
                <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Publicando comunicado…
              </span>
            ) : (
              'Publicar Noticia y Disparar Notificación Push'
            )}
          </button>
        </section>

        <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.08)]">
          <h2 className="font-extrabold">Vista previa en la app ciudadana</h2>
          <div className="mt-3 rounded-2xl border border-slate-300 bg-slate-50 p-3 shadow-inner">
            <div className={`rounded-xl border-2 p-4 ${previewStyle}`}>
              <small className="font-bold">SEMÁFORO SIAT-CT</small>
              <strong className="block text-xl">ALERTA {previewLevel}</strong>
              <span className="text-sm font-bold">{levelDetails[previewLevel]}</span>
            </div>
            <div className="mt-2 rounded-xl bg-white p-3">
              <small className="text-slate-400">Protección Civil Benito Juárez · Ahora</small>
              <h3 className="mt-2 text-sm font-extrabold">{title || 'Título del aviso oficial'}</h3>
              <p className="mt-1 line-clamp-3 text-xs">{message || 'Las instrucciones oficiales aparecerán aquí.'}</p>
              {location && <p className="mt-2 text-xs font-semibold text-slate-600">Ubicación: {location}</p>}
              <div className="mt-3 grid h-24 place-items-center overflow-hidden rounded-lg bg-slate-300 text-xs font-bold">
                {imagePreviewUrl || imageUrl.trim()
                  ? <img className="h-full w-full object-cover" src={imagePreviewUrl || imageUrl.trim()} alt="Vista previa del comunicado" />
                  : 'Mapa de trayectoria'}
              </div>
            </div>
          </div>
          <div className="mt-3 rounded-lg bg-[#19365f] p-3 text-xs text-white shadow-md">
            Notificación push<br />
            <strong>SIPREC: {title || 'Comunicado oficial'}</strong>
          </div>
        </aside>
      </div>

      <section className="mt-8">
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-xl font-extrabold">Feed de Publicaciones Pasadas</h2>
            <p className="text-sm text-slate-500">Muro público de alertas · sincronizado con Firestore.</p>
          </div>
          <div className="flex gap-2">
            {['Todas', 'Alertas SIAT-CT', 'Avisos'].map((item) => (
              <button
                className={`rounded-full px-4 py-2 text-xs font-bold shadow-md ${filter === item ? 'bg-[#19365f] text-white' : 'bg-white'}`}
                key={item}
                onClick={() => setFilter(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          {publications
            .filter((item) => filter === 'Todas' || (filter === 'Alertas SIAT-CT' ? item.level : !item.level))
            .map((item) => {
              const date = item.publishedAt?.toDate?.() || item.createdAt?.toDate?.()
              return (
                <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.08)]" key={item.id}>
                  <header className="flex items-start gap-3">
                    <span className="grid size-10 place-items-center rounded-full border-2 border-[#d0a12b] bg-[#713249] text-xs font-bold text-white">PC</span>
                    <div>
                      <strong className="block text-[#19365f]">Protección Civil Benito Juárez</strong>
                      <small className="text-slate-400">{date ? date.toLocaleString('es-MX') : 'Reciente'}</small>
                    </div>
                    <button
                      aria-label={`Eliminar publicación: ${item.title}`}
                      title="Eliminar publicación"
                      className="ml-auto rounded-md border border-red-200 bg-red-50 p-2 text-red-700 shadow-sm transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!canEmit || deletingId === item.id}
                      onClick={() => deletePublication(item)}
                    >
                      {deletingId === item.id ? (
                        <span className="block size-4 animate-spin rounded-full border-2 border-red-200 border-t-red-700" />
                      ) : (
                        <TrashIcon className="size-4" />
                      )}
                    </button>
                  </header>
                  <span className="mt-3 inline-block rounded bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800">
                    ALERTA {item.level || 'OFICIAL'}
                  </span>
                  <h3 className="mt-2 text-sm font-extrabold">{item.title}</h3>
                  <p className="mt-1 text-sm">{item.message}</p>
                  {item.location && <p className="mt-2 text-xs font-semibold text-slate-600">Ubicación: {item.location}</p>}
                  {item.imageUrl ? (
                    <img className="mt-3 h-44 w-full rounded-lg object-cover" src={item.imageUrl} alt={item.title} />
                  ) : (
                    <div className="mt-3 h-44 rounded-lg bg-slate-200" />
                  )}
                  <footer className="mt-4 flex items-center border-t border-slate-100 pt-3">
                    <span className="flex items-center gap-1.5 text-sm font-bold text-slate-600">
                      <svg aria-hidden="true" className="size-5 text-[#713249]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 21s-7.2-4.35-9.5-9.1C.35 7.45 3 3 7.55 3c2.05 0 3.6 1.15 4.45 2.25C12.85 4.15 14.4 3 16.45 3 21 3 23.65 7.45 21.5 11.9 19.2 16.65 12 21 12 21Z" />
                      </svg>
                      {(item.likes?.length || 0).toLocaleString('es-MX')}
                    </span>
                    <button
                      type="button"
                      className="ml-5 flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-[#19365f]"
                      onClick={() => setSelectedPost(item)}
                    >
                      <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                      </svg>
                      {(commentCounts[item.id] || 0).toLocaleString('es-MX')}
                      <span className="hidden sm:inline">Comentarios</span>
                    </button>
                  </footer>
                </article>
              )
            })}
        </div>
      </section>
      {selectedPost && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Comentarios de ${selectedPost.title}`}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedPost(null)
          }}
        >
          <div className="flex max-h-[82vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-white/60 bg-white shadow-2xl">
            <header className="flex items-start border-b border-slate-200 px-5 py-4">
              <div className="min-w-0 pr-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[#713249]">Moderación de comentarios</p>
                <h3 className="mt-1 truncate text-lg font-extrabold text-[#19365f]">{selectedPost.title}</h3>
              </div>
              <button
                type="button"
                aria-label="Cerrar comentarios"
                className="ml-auto grid size-9 shrink-0 place-items-center rounded-full bg-slate-100 text-xl text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
                onClick={() => setSelectedPost(null)}
              >
                ×
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {comments.length === 0 ? (
                <div className="grid min-h-44 place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
                  <div>
                    <p className="font-bold text-slate-700">Aún no hay comentarios</p>
                    <p className="mt-1 text-sm text-slate-500">Las participaciones de los ciudadanos aparecerán aquí al instante.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => {
                    const commentDate = comment.createdAt?.toDate?.()
                    const name = comment.userName || comment.authorName || 'Ciudadano'
                    const text = comment.text || comment.message || ''
                    return (
                      <div key={comment.id} className={`flex gap-3 ${comment.official ? 'rounded-xl bg-[#f8f3f5] p-3 ring-1 ring-[#713249]/10' : ''}`}>
                        <div className={`grid size-10 shrink-0 place-items-center rounded-full text-xs font-black text-white ${comment.official ? 'bg-[#713249]' : 'bg-[#19365f]'}`}>
                          {comment.photoUrl ? (
                            <img className="size-full rounded-full object-cover" src={comment.photoUrl} alt="" />
                          ) : (
                            name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <strong className="text-sm text-[#19365f]">{name}</strong>
                            {comment.official && (
                              <span className="rounded-full bg-[#713249] px-2 py-0.5 text-[10px] font-bold text-white">OFICIAL</span>
                            )}
                          </div>
                          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{text}</p>
                          {commentDate && <small className="mt-1 block text-xs text-slate-400">{commentDate.toLocaleString('es-MX')}</small>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <form
              className="border-t border-slate-200 bg-slate-50 p-4"
              onSubmit={(event) => {
                event.preventDefault()
                void sendOfficialResponse()
              }}
            >
              <label className="mb-2 block text-xs font-bold text-slate-600">Respuesta oficial del administrador</label>
              <div className="flex gap-2">
                <input
                  className="h-11 min-w-0 flex-1 rounded-full border border-slate-300 bg-white px-4 text-sm outline-none focus:border-[#713249] focus:ring-2 focus:ring-[#713249]/10"
                  placeholder="Escribir una respuesta institucional..."
                  value={responseDraft}
                  onChange={(event) => setResponseDraft(event.target.value)}
                  disabled={sendingResponse}
                />
                <button
                  type="button"
                  className="h-11 rounded-full bg-[#713249] px-5 text-sm font-bold text-white shadow-md transition hover:bg-[#62283a] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!responseDraft.trim() || sendingResponse}
                  onClick={sendOfficialResponse}
                >
                  {sendingResponse ? 'Enviando…' : 'Responder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
