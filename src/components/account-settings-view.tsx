'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useAuth } from '@/components/auth-provider'
import { useTheme, type Theme } from '@/components/theme-provider'
import {
  changeAccountPassword,
  getAccountAuthErrorMessage,
  saveAccountProfile,
} from '@/lib/account-settings'

type Toast = { type: 'success' | 'error'; message: string }

const fieldClass =
  'mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900 outline-none transition-colors duration-300 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-950'

function getInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'U'
  )
}

export function AccountSettingsView() {
  const { firebaseUser, profile, syncProfile } = useAuth()
  const { theme, setTheme } = useTheme()
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [displayName, setDisplayName] = useState(profile?.nombre || firebaseUser?.displayName || '')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)

  useEffect(() => {
    setDisplayName(profile?.nombre || firebaseUser?.displayName || '')
  }, [firebaseUser?.displayName, profile?.nombre])

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview('')
      return
    }

    const previewUrl = URL.createObjectURL(photoFile)
    setPhotoPreview(previewUrl)
    return () => URL.revokeObjectURL(previewUrl)
  }, [photoFile])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 5000)
    return () => window.clearTimeout(timer)
  }, [toast])

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!firebaseUser) {
      setToast({ type: 'error', message: 'No hay una sesión activa.' })
      return
    }
    if (!displayName.trim()) {
      setToast({ type: 'error', message: 'El nombre de usuario es obligatorio.' })
      return
    }
    if (photoFile && !photoFile.type.startsWith('image/')) {
      setToast({ type: 'error', message: 'Selecciona un archivo de imagen válido.' })
      return
    }
    if (photoFile && photoFile.size > 5 * 1024 * 1024) {
      setToast({ type: 'error', message: 'La imagen debe pesar 5 MB o menos.' })
      return
    }

    setIsSavingProfile(true)
    try {
      const saved = await saveAccountProfile(firebaseUser, displayName, photoFile || undefined)
      syncProfile(saved.displayName, saved.photoURL)
      setPhotoFile(null)
      if (photoInputRef.current) photoInputRef.current.value = ''
      setToast({ type: 'success', message: 'Tu perfil se actualizó correctamente.' })
    } catch (error) {
      console.error('Error al guardar los ajustes del perfil:', error)
      setToast({ type: 'error', message: getAccountAuthErrorMessage(error) })
    } finally {
      setIsSavingProfile(false)
    }
  }

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!firebaseUser) {
      setToast({ type: 'error', message: 'No hay una sesión activa.' })
      return
    }
    if (newPassword.length < 6) {
      setToast({ type: 'error', message: 'La contraseña nueva debe tener al menos 6 caracteres.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setToast({ type: 'error', message: 'La confirmación no coincide con la contraseña nueva.' })
      return
    }

    setIsSavingPassword(true)
    try {
      await changeAccountPassword(firebaseUser, currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setToast({ type: 'success', message: 'Tu contraseña se actualizó correctamente.' })
    } catch (error) {
      console.error('Error al cambiar la contraseña de Firebase Auth:', error)
      setToast({ type: 'error', message: getAccountAuthErrorMessage(error) })
    } finally {
      setIsSavingPassword(false)
    }
  }

  const name = profile?.nombre || firebaseUser?.displayName || 'Usuario SIPREC'
  const currentPhoto = photoPreview || profile?.photoURL || firebaseUser?.photoURL || ''

  return (
    <div className="mx-auto max-w-5xl text-slate-900 transition-colors duration-300 dark:text-white">
      {toast && (
        <div
          className={`fixed right-4 top-20 z-[70] flex max-w-md items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-bold shadow-2xl transition-colors duration-300 sm:right-7 ${
            toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
              : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200'
          }`}
          role={toast.type === 'error' ? 'alert' : 'status'}
        >
          <span>{toast.message}</span>
          <button
            aria-label="Cerrar notificación"
            className="text-xs opacity-70 transition-opacity hover:opacity-100"
            onClick={() => setToast(null)}
            type="button"
          >
            Cerrar
          </button>
        </div>
      )}

      <header className="mb-7">
        <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
          Preferencias personales
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#19365f] transition-colors duration-300 dark:text-white sm:text-3xl">
          Ajustes de Cuenta
        </h1>
        <p className="mt-1 text-sm text-slate-600 transition-colors duration-300 dark:text-slate-300">
          Administra tu perfil, contraseña y apariencia del panel.
        </p>
      </header>

      <div className="grid gap-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.08)] transition-colors duration-300 dark:border-slate-700 dark:bg-slate-800 sm:p-7">
          <div className="mb-5">
            <h2 className="text-lg font-extrabold text-[#19365f] transition-colors duration-300 dark:text-white">
              Perfil de usuario
            </h2>
            <p className="mt-1 text-sm text-slate-600 transition-colors duration-300 dark:text-slate-300">
              Estos datos se sincronizan con Firebase Auth y tu cuenta SIPREC.
            </p>
          </div>

          <form onSubmit={handleSaveProfile}>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                {currentPhoto ? (
                  <img
                    alt={`Foto de ${name}`}
                    className="size-20 rounded-full border-2 border-slate-200 object-cover transition-colors duration-300 dark:border-slate-600"
                    src={currentPhoto}
                  />
                ) : (
                  <div className="grid size-20 place-items-center rounded-full bg-[#19365f] text-xl font-extrabold text-white">
                    {getInitials(name)}
                  </div>
                )}
                <div>
                  <p className="font-bold text-slate-900 transition-colors duration-300 dark:text-white">
                    {name}
                  </p>
                  <p className="text-sm text-slate-500 transition-colors duration-300 dark:text-slate-400">
                    {profile?.correo || firebaseUser?.email || 'Cuenta institucional'}
                  </p>
                </div>
              </div>
              <div>
                <input
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => setPhotoFile(event.target.files?.[0] || null)}
                  ref={photoInputRef}
                  type="file"
                />
                <button
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-[#19365f] transition-colors duration-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-700"
                  onClick={() => photoInputRef.current?.click()}
                  type="button"
                >
                  Cambiar foto
                </button>
                {photoFile && (
                  <p className="mt-2 max-w-56 truncate text-xs text-slate-500 dark:text-slate-400">
                    {photoFile.name}
                  </p>
                )}
              </div>
            </div>

            <label className="mt-6 block text-sm font-semibold text-slate-700 transition-colors duration-300 dark:text-slate-200">
              Nombre de usuario
              <input
                autoComplete="name"
                className={fieldClass}
                maxLength={100}
                onChange={(event) => setDisplayName(event.target.value)}
                required
                value={displayName}
              />
            </label>

            <button
              className="mt-5 rounded-lg bg-[#19365f] px-5 py-3 text-sm font-bold text-white shadow-lg transition-colors duration-300 hover:bg-[#244b7a] disabled:cursor-wait disabled:opacity-60"
              disabled={isSavingProfile}
              type="submit"
            >
              {isSavingProfile ? 'Guardando cambios…' : 'Guardar cambios'}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.08)] transition-colors duration-300 dark:border-slate-700 dark:bg-slate-800 sm:p-7">
          <div className="mb-5">
            <h2 className="text-lg font-extrabold text-[#19365f] transition-colors duration-300 dark:text-white">
              Seguridad y contraseña
            </h2>
            <p className="mt-1 text-sm text-slate-600 transition-colors duration-300 dark:text-slate-300">
              Confirma tu contraseña actual antes de elegir una nueva.
            </p>
          </div>

          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleChangePassword}>
            <label className="block text-sm font-semibold text-slate-700 transition-colors duration-300 dark:text-slate-200 md:col-span-2">
              Contraseña actual
              <input
                autoComplete="current-password"
                className={fieldClass}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
                type="password"
                value={currentPassword}
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700 transition-colors duration-300 dark:text-slate-200">
              Nueva contraseña
              <input
                autoComplete="new-password"
                className={fieldClass}
                minLength={6}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                type="password"
                value={newPassword}
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700 transition-colors duration-300 dark:text-slate-200">
              Confirmar nueva contraseña
              <input
                autoComplete="new-password"
                className={fieldClass}
                minLength={6}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                type="password"
                value={confirmPassword}
              />
            </label>
            <div className="md:col-span-2">
              <button
                className="rounded-lg bg-[#19365f] px-5 py-3 text-sm font-bold text-white shadow-lg transition-colors duration-300 hover:bg-[#244b7a] disabled:cursor-wait disabled:opacity-60"
                disabled={isSavingPassword}
                type="submit"
              >
                {isSavingPassword ? 'Actualizando contraseña…' : 'Actualizar contraseña'}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.08)] transition-colors duration-300 dark:border-slate-700 dark:bg-slate-800 sm:p-7">
          <div className="mb-5">
            <h2 className="text-lg font-extrabold text-[#19365f] transition-colors duration-300 dark:text-white">
              Apariencia
            </h2>
            <p className="mt-1 text-sm text-slate-600 transition-colors duration-300 dark:text-slate-300">
              Selecciona el tema para el panel. Tu preferencia se guarda en este navegador.
            </p>
          </div>
          <div aria-label="Tema del panel" className="flex flex-wrap gap-3" role="group">
            {(
              [
                ['light', 'Tema Claro'],
                ['dark', 'Tema Oscuro'],
              ] as [Theme, string][]
            ).map(([value, label]) => (
              <button
                aria-pressed={theme === value}
                className={`rounded-lg border px-5 py-3 text-sm font-bold transition-colors duration-300 ${
                  theme === value
                    ? 'border-[#19365f] bg-[#19365f] text-white dark:border-blue-400 dark:bg-blue-700'
                    : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-700'
                }`}
                key={value}
                onClick={() => setTheme(value)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
