import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  updateProfile,
  type User,
} from 'firebase/auth'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'

export async function saveAccountProfile(user: User, displayName: string, photo?: File) {
  const cleanName = displayName.trim()
  if (!cleanName) {
    throw new Error('El nombre de usuario es obligatorio.')
  }

  const previousDisplayName = user.displayName
  const previousPhotoURL = user.photoURL
  let photoURL = user.photoURL
  let authProfileUpdated = false
  let uploadedPhotoRef: ReturnType<typeof ref> | null = null
  if (photo) {
    if (!photo.type.startsWith('image/')) {
      throw new Error('El archivo seleccionado debe ser una imagen.')
    }

    const safeFileName = photo.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    uploadedPhotoRef = ref(
      storage,
      `usuarios/${user.uid}/perfil/${crypto.randomUUID()}-${safeFileName}`,
    )
    try {
      const upload = await uploadBytes(uploadedPhotoRef, photo, { contentType: photo.type })
      photoURL = await getDownloadURL(upload.ref)
    } catch (error) {
      console.error('Error al subir la foto de perfil a Firebase Storage:', error)
      try {
        await deleteObject(uploadedPhotoRef)
      } catch (cleanupError) {
        console.error(
          'No fue posible limpiar la foto de perfil que no se pudo cargar:',
          cleanupError,
        )
      }
      throw new Error('No fue posible subir la imagen. Inténtalo nuevamente.')
    }
  }

  try {
    await updateProfile(user, {
      displayName: cleanName,
      photoURL,
    })
    authProfileUpdated = true
    await setDoc(
      doc(db, 'usuarios', user.uid),
      {
        nombre: cleanName,
        displayName: cleanName,
        photoURL: photoURL || '',
        correo: user.email || '',
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )
  } catch (error) {
    console.error('Error al guardar el perfil de usuario:', error)
    let authProfileRestored = !authProfileUpdated
    if (authProfileUpdated) {
      try {
        await updateProfile(user, {
          displayName: previousDisplayName,
          photoURL: previousPhotoURL,
        })
        authProfileRestored = true
      } catch (restoreError) {
        console.error('No fue posible restaurar el perfil anterior de Firebase Auth:', restoreError)
      }
    }

    if (uploadedPhotoRef && authProfileRestored) {
      try {
        await deleteObject(uploadedPhotoRef)
      } catch (cleanupError) {
        console.error('No fue posible eliminar la foto de perfil que no se guardó:', cleanupError)
      }
    }
    if (!authProfileRestored) {
      throw new Error(
        'El perfil cambió en Firebase Auth, pero no pudo sincronizarse con Firestore ni restaurarse. Contacta al administrador.',
      )
    }
    throw error
  }

  return { displayName: cleanName, photoURL }
}

export async function changeAccountPassword(
  user: User,
  currentPassword: string,
  newPassword: string,
) {
  if (!user.email) {
    throw new Error('La cuenta no tiene un correo asociado para reautenticar.')
  }

  const credential = EmailAuthProvider.credential(user.email, currentPassword)
  await reauthenticateWithCredential(user, credential)
  await updatePassword(user, newPassword)
}

export function getAccountAuthErrorMessage(error: unknown): string {
  const code =
    error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
      ? error.code
      : ''

  switch (code) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'La contraseña actual es incorrecta.'
    case 'auth/requires-recent-login':
      return 'Por seguridad, cierra sesión e inicia sesión nuevamente antes de cambiar este dato.'
    case 'auth/weak-password':
      return 'La contraseña nueva debe cumplir los requisitos de seguridad de Firebase.'
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Espera un momento antes de volver a intentarlo.'
    case 'storage/unauthorized':
      return 'No tienes permiso para subir fotos de perfil.'
    case 'storage/unknown':
    case 'storage/retry-limit-exceeded':
      return 'No se pudo completar la carga de la imagen. Inténtalo nuevamente.'
    case 'permission-denied':
    case 'firestore/permission-denied':
      return 'No tienes permiso para actualizar el perfil en Firestore.'
    default:
      return error instanceof Error ? error.message : 'Ocurrió un error inesperado.'
  }
}
