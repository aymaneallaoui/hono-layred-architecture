import { Kysely, PostgresDialect } from 'kysely'
import { Pool } from 'pg'

import { env } from '@/infra/env'
import type { Database } from '@/infra/types'

export interface DbConnection {
  pool: Pool
  db: Kysely<Database>
  close(): Promise<void>
}

export function connectDb(connectionString = env.DATABASE_URL): DbConnection {
  const pool = new Pool({
    connectionString,
    max: env.DB_POOL_MAX,
    idleTimeoutMillis: env.DB_IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: env.DB_CONNECTION_TIMEOUT_MS,
    statement_timeout: env.DB_STATEMENT_TIMEOUT_MS,
    idle_in_transaction_session_timeout: env.DB_STATEMENT_TIMEOUT_MS,
    application_name: 'api',
  })
  const db = new Kysely<Database>({ dialect: new PostgresDialect({ pool }) })
  return { pool, db, close: () => db.destroy() }
}
