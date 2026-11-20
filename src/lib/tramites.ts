import { doc, runTransaction } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export type TramiteDocument = Record<string, unknown>

export type Tramite = {
  id: string
  businessName: string
  procedureType: string
  status: string
  createdAt: Date | null
  documents: TramiteDocument[]
  data: Record<string, unknown>
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function firstText(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
    const record = asRecord(value)
    for (const key of ['nombre', 'name', 'razonSocial', 'nombreComercial']) {
      if (typeof record[key] === 'string' && record[key].trim()) {
        return record[key].trim()
      }
    }
  }
  return null
}

export function mapTramite(id: string, value: Record<string, unknown>): Tramite {
  const establishment = asRecord(value.establecimiento)
  const citizen = asRecord(value.ciudadano)
  const applicant = asRecord(value.solicitante)
  const establishmentData = asRecord(value.datosEstablecimiento)

  const createdAtValue = value.createdAt
  const createdAt =
    createdAtValue instanceof Date
      ? createdAtValue
      : typeof asRecord(createdAtValue).toDate === 'function'
        ? (asRecord(createdAtValue).toDate as () => Date)()
        : typeof createdAtValue === 'string' || typeof createdAtValue === 'number'
          ? new Date(createdAtValue)
          : null

  return {
    id,
    businessName:
      firstText(
        value.establecimientoNombre,
        value.nombreEstablecimiento,
        value.razonSocial,
        value.nombreComercial,
        establishmentData,
        establishment,
        value.ciudadanoNombre,
        value.nombreCiudadano,
        citizen,
        applicant,
        value.nombre,
      ) || 'Sin identificar',
    procedureType:
      firstText(value.tipoTramite, value.tipoSolicitud, value.tramite, value.tipo) ||
      'Sin especificar',
    status: firstText(value.estatusGeneral) || 'Sin estado',
    createdAt: createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt : null,
    documents: Array.isArray(value.documentos)
      ? value.documentos.map((item) => asRecord(item))
      : [],
    data: value,
  }
}

export function formatTramiteDate(date: Date | null): string {
  return date ? date.toLocaleDateString('es-MX') : 'Sin fecha'
}

export function getDocumentName(document: TramiteDocument, index: number): string {
  return (
    firstText(
      document.nombre,
      document.nombreDocumento,
      document.tipo,
      document.titulo,
      document.fileName,
      document.filename,
      document.name,
    ) || `Documento ${index + 1}`
  )
}

export function getDocumentUrl(document: TramiteDocument): string | null {
  const file = asRecord(document.archivo)
  const storageFile = asRecord(document.file)
  const value = firstText(
    document.url,
    document.urlArchivo,
    document.archivoURL,
    document.archivo,
    document.archivoUrl,
    document.downloadURL,
    document.fileUrl,
    document.storageUrl,
    file.url,
    file.downloadURL,
    storageFile.url,
    storageFile.downloadURL,
  )
  return value
}

export function getDocumentStatus(document: TramiteDocument): string {
  return firstText(document.estatus, document.estado, document.status) || 'Pendiente'
}

export async function updateTramiteDocument(
  tramiteId: string,
  documentIndex: number,
  action: 'Aceptado' | 'Rechazado',
  comment = '',
): Promise<boolean> {
  const cleanComment = comment.trim()
  if (action === 'Rechazado' && !cleanComment) {
    throw new Error('Escribe el motivo del rechazo antes de continuar.')
  }

  const tramiteRef = doc(db, 'tramites_ciudadanos', tramiteId)
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(tramiteRef)
    if (!snapshot.exists()) {
      throw new Error('El trámite ya no existe o fue eliminado.')
    }

    const data = snapshot.data()
    if (!Array.isArray(data.documentos) || !data.documentos[documentIndex]) {
      throw new Error('No se encontró el documento que intentas revisar.')
    }

    const documents = data.documentos.map((item: unknown) => ({ ...asRecord(item) }))
    const target = documents[documentIndex]
    const statusField = Object.hasOwn(target, 'estatus')
      ? 'estatus'
      : Object.hasOwn(target, 'estado')
        ? 'estado'
        : Object.hasOwn(target, 'status')
          ? 'status'
          : 'estatus'

    target[statusField] = action
    if (action === 'Rechazado') {
      target.comentarioAdmin = cleanComment
    }

    const allAccepted =
      documents.length > 0 &&
      documents.every(
        (item) => getDocumentStatus(item).trim().toLocaleLowerCase('es-MX') === 'aceptado',
      )

    transaction.update(tramiteRef, {
      documentos: documents,
      ...(allAccepted ? { estatusGeneral: 'Listo para sucursal' } : {}),
    })

    return allAccepted
  })
}
