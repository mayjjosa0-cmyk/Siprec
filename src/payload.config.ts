import path from 'path'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { mcpPlugin } from '@payloadcms/plugin-mcp'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import { en as adminLanguage } from '@payloadcms/translations/languages/en'
import { fileURLToPath } from 'url'
import { buildConfig } from 'payload'
import { Admins } from './collections/Admins'
import { Media } from './collections/Media'
import { Folders } from './collections/Folders'
import { Tags } from './collections/Tags'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const blobReadWriteToken = process.env.BLOB_READ_WRITE_TOKEN ?? process.env.GOTA2_READ_WRITE_TOKEN
const isMigrationCreate = process.argv.includes('migrate:create')
const storageToken =
  blobReadWriteToken ??
  (isMigrationCreate ? undefined : requireEnvironmentVariable('BLOB_READ_WRITE_TOKEN'))

function requireEnvironmentVariable(name: string): string {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

export default buildConfig({
  secret: requireEnvironmentVariable('PAYLOAD_SECRET'),
  db: postgresAdapter({
    pool: {
      connectionString: requireEnvironmentVariable('DATABASE_URL'),
    },
  }),
  admin: {
    user: Admins.slug,
    constrainWidth: true,
    dashboard: {
      widgets: [],
      defaultLayout: [
        { widgetSlug: 'activity', width: 'full' },
        { widgetSlug: 'collections', width: 'full' },
      ],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  i18n: {
    fallbackLanguage: 'en',
    supportedLanguages: { en: adminLanguage },
  },
  collections: [Admins, Media, Folders, Tags],
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  localization: {
    locales: [{ code: 'en', label: 'English' }],
    fallback: true,
    defaultLocale: 'en',
  },
  plugins: [mcpPlugin({})],
  storage: storageToken
    ? [
        vercelBlobStorage({
          collections: { media: true },
          clientUploads: true,
          token: storageToken,
        }),
      ]
    : [],
})
