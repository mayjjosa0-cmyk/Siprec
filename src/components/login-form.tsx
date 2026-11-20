'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { EyeIcon } from '@/components/icons'
import { auth, db } from '@/lib/firebase'
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'

export function LoginForm() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    setEmail('')
    setPassword('')
    setShowPassword(false)
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMsg('')

    const normalizedEmail = email.trim()
    if (!normalizedEmail.toLowerCase().endsWith('@cancun.gob.mx')) {
      setErrorMsg('Usa un correo institucional que termine en @cancun.gob.mx.')
      return
    }

    setLoading(true)

    try {
      const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password)
      const user = userCredential.user

      const userDocRef = doc(db, 'usuarios', user.uid)
      const userDoc = await getDoc(userDocRef)

      if (userDoc.exists()) {
        const userData = userDoc.data()
        const rol = String(userData.rol || '')
          .trim()
          .toLowerCase()
        const estado = String(userData.estado || 'Activo')
          .trim()
          .toLowerCase()

        if (estado === 'baja' || estado === 'inactivo') {
          await signOut(auth)
          setErrorMsg('Acceso denegado. La cuenta se encuentra dada de baja.')
        } else if (
          rol === 'admin' ||
          rol === 'administrador' ||
          rol === 'validador' ||
          rol === 'inspector' ||
          rol === 'capturista'
        ) {
          router.push('/dashboard')
        } else {
          await signOut(auth)
          setErrorMsg(
            'Acceso denegado. Este portal es de uso exclusivo para el personal de Protección Civil.',
          )
        }
      } else {
        await signOut(auth)
        setErrorMsg('Esta cuenta no existe en la base de datos de usuarios.')
      }
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        setErrorMsg('El correo ingresado es inexistente.')
      } else if (error.code === 'auth/wrong-password') {
        setErrorMsg('La contraseña ingresada es incorrecta.')
      } else if (error.code === 'auth/invalid-credential') {
        setErrorMsg('El correo es inexistente o la contraseña está mal.')
      } else if (error.code === 'auth/too-many-requests') {
        setErrorMsg('Demasiados intentos fallidos. Intenta más tarde.')
      } else {
        setErrorMsg('Ocurrió un error al conectar con el servidor.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form autoComplete="off" onSubmit={handleSubmit} className="space-y-5">
      {errorMsg && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
          {errorMsg}
        </div>
      )}
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-slate-600">
          Correo institucional (@cancun.gob.mx)
        </span>
        <input
          aria-label="Correo institucional"
          autoComplete="off"
          name="login-email"
          className="h-12 w-full rounded-lg border border-slate-300 px-4 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
          placeholder="usuario@cancun.gob.mx"
          pattern="[^\s@]+@[cC][aA][nN][cC][uU][nN]\.[gG][oO][bB]\.[mM][xX]"
          required
          type="email"
          value={email}
          title="El correo debe terminar en @cancun.gob.mx."
          onInvalid={() =>
            setErrorMsg('Usa un correo institucional que termine en @cancun.gob.mx.')
          }
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-slate-600">Contraseña</span>
        <span className="relative block">
          <input
            aria-label="Contraseña"
            autoComplete="off"
            name="login-password"
            className="h-12 w-full rounded-lg border border-slate-300 px-4 pr-28 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            placeholder="••••••••"
            required
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-slate-600 shadow-sm hover:text-blue-700"
            onClick={() => setShowPassword((value) => !value)}
            type="button"
          >
            <EyeIcon className="size-4" />
            {showPassword ? 'Ocultar' : 'Mostrar'}
          </button>
        </span>
      </label>
      <button
        className="flex h-12 w-full items-center justify-center rounded-lg bg-[#2457df] px-4 font-bold text-white shadow-[0_8px_20px_rgba(37,87,223,0.3)] transition hover:-translate-y-0.5 hover:bg-[#1949cb] disabled:cursor-wait disabled:opacity-70"
        disabled={loading}
        type="submit"
      >
        {loading ? 'Validando credenciales…' : 'Ingresar al sistema'}
      </button>
      <p className="px-3 text-center text-xs leading-relaxed text-slate-500">
        Acceso monitoreado. Toda acción queda registrada en la bitácora de auditoría inmutable.
      </p>
    </form>
  )
}
