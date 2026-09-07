import { sql } from 'kysely'

import { connectDb, type DbConnection } from '@/infra/db'
import { env } from '@/infra/env'

export const TEMPLATE_DB = 'app_test_template'

export function databaseUrl(name: string): string {
  const url = new URL(env.DATABASE_URL)
  url.pathname = `/${name}`
  return url.toString()
}

export const templateUrl = () => databaseUrl(TEMPLATE_DB)

export interface TestDatabase {
  name: string
  connection: DbConnection
  drop(): Promise<void>
}

export async function createTestDatabase(): Promise<TestDatabase> {
  const name = `test_${crypto.randomUUID().replaceAll('-', '')}`
  const admin = connectDb()
  try {
    await sql`create database ${sql.id(name)} template ${sql.id(TEMPLATE_DB)}`.execute(admin.db)
  } finally {
    await admin.close()
  }
  const connection = connectDb(databaseUrl(name))
  return {
    name,
    connection,
    drop: async () => {
      await connection.close()
      const cleanup = connectDb()
      try {
        await sql`drop database ${sql.id(name)} with (force)`.execute(cleanup.db)
      } finally {
        await cleanup.close()
      }
    },
  }
}
