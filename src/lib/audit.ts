import { db, auth } from '@/lib/firebase'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'

export async function registrarAccionAuditoria(accion: string, resultado: 'Éxito' | 'Fallo') {
  try {
    const usuarioActual = auth.currentUser?.email || 'sistema@cancun.gob.mx'
    const randomHash = Math.random().toString(36).substring(2, 8) + '…' + Math.random().toString(36).substring(2, 4)

    await addDoc(collection(db, 'logs'), {
      fecha: new Date().toLocaleString(),
      usuario: usuarioActual,
      ip: '187.190.44.15', // IP simulada o institucional
      accion,
      resultado,
      hash: randomHash,
      timestamp: serverTimestamp(),
    })
  } catch (error) {
    console.error('Error al registrar en la bitácora forense:', error)
  }
}