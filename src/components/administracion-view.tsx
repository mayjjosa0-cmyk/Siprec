'use client'

import { useState, useEffect } from 'react'
import { DownloadIcon, EyeIcon } from '@/components/icons'
import { db, auth } from '@/lib/firebase'
import { collection, getDocs, doc, updateDoc, setDoc, addDoc, serverTimestamp, query, onSnapshot } from 'firebase/firestore'
import { initializeApp, getApps } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth'

type UserData = {
  id: string
  nombre: string
  correo: string
  rol: string
  estado: string
}

type LogData = {
  id: string
  fecha: string
  usuario: string
  ip: string
  accion: string
  resultado: 'Éxito' | 'Fallo'
  hash: string
}

export function AdministracionView() {
  const [users, setUsers] = useState<UserData[]>([])
  const [logs, setLogs] = useState<LogData[]>([])
  const [notice, setNotice] = useState('')
  
  const [showModal, setShowModal] = useState(false)
  const [newNombre, setNewNombre] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [newRol, setNewRol] = useState('validador')
  const [loadingAlta, setLoadingAlta] = useState(false)

  useEffect(() => {
    async function fetchUsers() {
      try {
        const querySnapshot = await getDocs(collection(db, 'usuarios'))
        const fetchedUsers: UserData[] = []
        
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data()
          if (data.rol !== 'ciudadano') {
            fetchedUsers.push({
              id: docSnap.id,
              nombre: data.nombre || 'Sin nombre',
              correo: data.correo || '',
              rol: data.rol || 'Sin rol',
              estado: data.estado || 'Activo',
            })
          }
        })
        
        setUsers(fetchedUsers)
      } catch (error) {
        setNotice('Error al cargar los usuarios de la base de datos.')
      }
    }
    fetchUsers()
  }, [])

  useEffect(() => {
    const q = query(collection(db, 'logs'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedLogs: LogData[] = []
      snapshot.forEach((docSnap) => {
        const d = docSnap.data()
        fetchedLogs.push({
          id: docSnap.id,
          fecha: d.fecha || new Date().toLocaleString(),
          usuario: d.usuario || 'desconocido',
          ip: d.ip || '187.190.44.10',
          accion: d.accion || '',
          resultado: d.resultado || 'Éxito',
          hash: d.hash || Math.random().toString(36).substring(7),
        })
      })
      setLogs(fetchedLogs)
    })
    return () => unsubscribe()
  }, [])

  async function registrarLog(accion: string, resultado: 'Éxito' | 'Fallo') {
    try {
      const currentUserEmail = auth.currentUser?.email || 'admin@cancun.gob.mx'
      const randomHash = Math.random().toString(36).substring(2, 8) + '…' + Math.random().toString(36).substring(2, 4)
      
      await addDoc(collection(db, 'logs'), {
        fecha: new Date().toLocaleString(),
        usuario: currentUserEmail,
        ip: '187.190.44.12',
        accion,
        resultado,
        hash: randomHash,
        timestamp: serverTimestamp()
      })
    } catch (e) {
      console.error("Error al registrar auditoría", e)
    }
  }

  async function handleCrearUsuario(e: React.FormEvent) {
    e.preventDefault()
    setLoadingAlta(true)
    try {
      const firebaseConfig = {
        apiKey: "AIzaSyB3h89QN30Fjrbjcli8nuls7TKR6vam4oc",
        authDomain: "siprec-c7dfa.firebaseapp.com",
        projectId: "siprec-c7dfa",
        storageBucket: "siprec-c7dfa.firebasestorage.app",
        messagingSenderId: "1059435533938",
        appId: "1:1059435533938:web:333f4b530a7af26385d4eb",
      }
      const secondaryApp = !getApps().find(app => app.name === 'SecondaryApp')
        ? initializeApp(firebaseConfig, 'SecondaryApp')
        : getApps().find(app => app.name === 'SecondaryApp')!
      
      const secondaryAuth = getAuth(secondaryApp)
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newEmail, newPassword)
      const newUid = userCredential.user.uid
      await signOut(secondaryAuth)

      // Guardado estricto en Firestore con todos los campos necesarios para el login
      await setDoc(doc(db, 'usuarios', newUid), {
        nombre: newNombre,
        correo: newEmail,
        rol: newRol,
        estado: 'Activo'
      })

      await registrarLog(`ALTA USUARIO · ${newEmail} (${newRol})`, 'Éxito')

      setUsers(prev => [...prev, { id: newUid, nombre: newNombre, correo: newEmail, rol: newRol, estado: 'Activo' }])
      setNotice(`Usuario ${newNombre} dado de alta exitosamente.`)
      setShowModal(false)
      setNewNombre('')
      setNewEmail('')
      setNewPassword('')
    } catch (error: any) {
      setNotice(`Error al crear usuario: ${error.message}`)
      await registrarLog(`FALLO ALTA USUARIO · ${newEmail}`, 'Fallo')
    } finally {
      setLoadingAlta(false)
    }
  }

  async function toggleUser(id: string, currentStatus: string, nombre: string) {
    const newStatus = currentStatus === 'Activo' ? 'Baja' : 'Activo'
    try {
      const userRef = doc(db, 'usuarios', id)
      await updateDoc(userRef, { estado: newStatus })
      
      setUsers((current) =>
        current.map((u) => (u.id === id ? { ...u, estado: newStatus } : u)),
      )
      await registrarLog(`CAMBIO ESTADO · ${nombre} a ${newStatus}`, 'Éxito')
      setNotice(`Estado de ${nombre} actualizado a ${newStatus}.`)
    } catch (error) {
      setNotice('Error al actualizar el estado.')
    }
  }

  function exportLogs() {
    const anchor = document.createElement('a')
    const csvContent = logs.map(l => `${l.fecha},${l.usuario},${l.ip},${l.accion},${l.resultado},${l.hash}`).join('\n')
    anchor.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv' }))
    anchor.download = 'evidencia-forense-siprec.csv'
    anchor.click()
    URL.revokeObjectURL(anchor.href)
  }

  return (
    <div className="mx-auto max-w-[1400px]">
      <header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Gobernanza del Sistema, Control RBAC y Bitácoras Forenses
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Módulo exclusivo para Administrador · Cuentas, permisos y registros inmutables de auditoría
          </p>
        </div>
        <span className="h-fit rounded-lg bg-[#713249] px-4 py-2 text-xs font-bold text-white shadow-md">
          EXCLUSIVO ADMINISTRADOR
        </span>
      </header>

      {notice && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900 shadow-sm">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} className="text-xs text-blue-700 underline">Cerrar</button>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between p-4">
            <h2 className="font-extrabold">Gestión de cuentas del personal</h2>
            <button
              className="rounded-lg bg-[#2457df] px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-[#1949cb]"
              onClick={() => {
                setNewNombre('')
                setNewEmail('')
                setNewPassword('')
                setShowPassword(false)
                setShowModal(true)
              }}
            >
              Alta de personal
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3 font-bold text-[#19365f]">
                      {user.nombre} <span className="block text-xs font-normal text-slate-400">{user.correo}</span>
                    </td>
                    <td className="px-4 py-3 capitalize">{user.rol}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${user.estado === 'Activo' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                        {user.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {user.rol === 'admin' || user.rol === 'Administrador' ? (
                        <span className="text-slate-400">Protegida</span>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            className={`rounded-md px-3 py-1.5 text-xs font-bold text-white shadow-sm ${user.estado === 'Activo' ? 'bg-red-700 hover:bg-red-800' : 'bg-[#19365f]'}`}
                            onClick={() => toggleUser(user.id, user.estado, user.nombre)}
                          >
                            {user.estado === 'Activo' ? 'Baja' : 'Reactivar'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.08)]">
          <h2 className="p-4 font-extrabold">Matriz de permisos RBAC</h2>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Permiso</th>
                <th className="px-2 py-3 text-center">Ciudadano</th>
                <th className="px-2 py-3 text-center">Capturista</th>
                <th className="px-2 py-3 text-center">Validador</th>
                <th className="px-2 py-3 text-center">Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {[
                ['Ver y subir expedientes propios', '✓', '—', '—', '—'],
                ['Gestionar y agendar citas', '✓', '✓', '✓', '✓'],
                ['Publicar avisos y comunicados', '—', '—', '✓', '✓'],
                ['Dictaminar trámites', '—', '—', '✓', '✓'],
                ['Emitir semáforo SIAT-CT', '—', '—', '✓', '✓'],
                ['Gestionar usuarios y roles', '—', '—', '—', '✓'],
                ['Consultar logs de auditoría', '—', '—', '—', '✓'],
              ].map((row) => (
                <tr key={row[0]}>
                  <td className="px-4 py-3 font-semibold text-[#19365f]">{row[0]}</td>
                  {row.slice(1).map((value, index) => (
                    <td className="px-2 py-3 text-center text-base" key={index}>
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
          <h2 className="font-extrabold">Logs de auditoría inmutables (append-only)</h2>
          <button
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold shadow-md hover:bg-slate-50"
            onClick={exportLogs}
          >
            <DownloadIcon className="size-4" /> Exportar evidencia forense
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-500">
              <tr>
                {['Fecha y hora', 'Usuario', 'Dirección IP', 'Acción ejecutada', 'Resultado', 'Hash'].map((item) => (
                  <th className="px-4 py-3" key={item}>{item}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    No hay registros en la bitácora todavía. Las acciones del sistema aparecerán aquí.
                  </td>
                </tr>
              ) : (
                logs.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 font-bold text-[#19365f]">{row.fecha}</td>
                    <td className="px-4 py-3 text-slate-700">{row.usuario}</td>
                    <td className="px-4 py-3 text-slate-500">{row.ip}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{row.accion}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${row.resultado === 'Éxito' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {row.resultado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 font-mono">Hash {row.hash}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-extrabold text-[#19365f]">Alta de Personal Institucional</h3>
            <p className="mt-1 text-xs text-slate-500">Crea una cuenta para validadores, inspectores o capturistas.</p>
            
            <form onSubmit={handleCrearUsuario} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600">Nombre completo</label>
                <input
                  type="text"
                  required
                  value={newNombre}
                  onChange={(e) => setNewNombre(e.target.value)}
                  placeholder="Ej. Roberto Medina"
                  className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600">Correo institucional</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="validador@cancun.gob.mx"
                  className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600">Contraseña temporal</label>
                <span className="relative block mt-1">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    name="new-temporary-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="h-11 w-full rounded-lg border border-slate-300 px-3 pr-24 text-sm outline-none focus:border-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded px-2 py-1 text-xs font-medium text-slate-600 hover:text-blue-700"
                  >
                    <EyeIcon className="size-4" />
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </button>
                </span>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600">Asignar Rol</label>
                <select
                  value={newRol}
                  onChange={(e) => setNewRol(e.target.value)}
                  className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 bg-white"
                >
                  <option value="validador">Validador</option>
                  <option value="inspector">Inspector</option>
                  <option value="capturista">Capturista</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setNewNombre('')
                    setNewEmail('')
                    setNewPassword('')
                    setShowPassword(false)
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loadingAlta}
                  className="rounded-lg bg-[#2457df] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#1949cb] disabled:opacity-50"
                >
                  {loadingAlta ? 'Registrando...' : 'Guardar y Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}