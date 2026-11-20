'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { normalizeRole, type UserRole } from '@/lib/rbac'

type AuthContextValue = {
  firebaseUser: User | null
  role: UserRole | null
  profile: { nombre: string; correo: string; estado: string; photoURL: string | null } | null
  loading: boolean
  syncProfile: (nombre: string, photoURL: string | null) => void
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  role: null,
  profile: null,
  loading: true,
  syncProfile: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [profile, setProfile] = useState<AuthContextValue['profile']>(null)
  const [loading, setLoading] = useState(true)

  const syncProfile = useCallback((nombre: string, photoURL: string | null) => {
    setProfile((current) => (current ? { ...current, nombre, photoURL } : current))
  }, [])

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user)
      setProfile(null)
      setRole(null)

      if (!user) {
        setLoading(false)
        return
      }

      try {
        const snapshot = await getDoc(doc(db, 'usuarios', user.uid))
        if (!snapshot.exists()) {
          setLoading(false)
          return
        }

        const data = snapshot.data()
        setRole(normalizeRole(data.rol))
        setProfile({
          nombre: String(data.nombre || user.displayName || user.email || 'Usuario'),
          correo: String(data.correo || user.email || ''),
          estado: String(data.estado || 'Activo'),
          photoURL: String(data.photoURL || user.photoURL || '') || null,
        })
      } catch {
        setRole(null)
        setProfile(null)
      } finally {
        setLoading(false)
      }
    })
  }, [])

  const value = useMemo(
    () => ({ firebaseUser, role, profile, loading, syncProfile }),
    [firebaseUser, role, profile, loading, syncProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
