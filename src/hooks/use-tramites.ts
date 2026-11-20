'use client'

import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { mapTramite, type Tramite } from '@/lib/tramites'

export function useTramites() {
  const [tramites, setTramites] = useState<Tramite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return onSnapshot(
      collection(db, 'tramites_ciudadanos'),
      (snapshot) => {
        const nextTramites = snapshot.docs
          .map((item) => mapTramite(item.id, item.data()))
          .sort(
            (left, right) => (right.createdAt?.getTime() || 0) - (left.createdAt?.getTime() || 0),
          )
        setTramites(nextTramites)
        setError(null)
        setLoading(false)
      },
      (snapshotError) => {
        console.error('Error al escuchar los trámites ciudadanos en Firestore:', snapshotError)
        setError('No fue posible cargar los trámites. Verifique sus permisos y conexión.')
        setLoading(false)
      },
    )
  }, [])

  return { tramites, loading, error }
}
