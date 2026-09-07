import { showRoutes } from 'hono/dev'

import { createApp } from '@/app'
import { createContainer } from '@/container'
import { env, isProd } from '@/infra/env'
import { logger } from '@/infra/logger'
import { migrateWithLock } from '@/migrate'

const container = createContainer()
if (env.MIGRATE_ON_BOOT ?? isProd) {
  await migrateWithLock(container.connection, (migrator) => migrator.migrateToLatest())
}

const app = createApp(container)
if (env.NODE_ENV === 'development') showRoutes(app)
const server = Bun.serve({ port: env.PORT, fetch: app.fetch })
logger.info(
  { url: server.url.href, docs: isProd ? undefined : `${server.url.href}openapi` },
  'listening',
)

let shuttingDown = false

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return
  shuttingDown = true
  logger.info({ signal }, 'draining and shutting down')
  await server.stop()
  await container.close()
  process.exit(0)
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))
