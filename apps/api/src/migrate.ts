import { promises as fs } from 'node:fs'
import path from 'node:path'

import type { Kysely } from 'kysely'
import { type MigrationResultSet, Migrator } from 'kysely/migration'

import { connectDb } from '@/infra/db'
import type { Database } from '@/infra/types'
import { migrations } from '@/migrations'

const MIGRATION_LOCK_ID = 727_442_699

export function createMigrator(db: Kysely<Database>): Migrator {
  return new Migrator({ db, provider: { getMigrations: async () => migrations } })
}

function report({ error, results }: MigrationResultSet): void {
  for (const result of results ?? []) {
    console.log(`[migrate] ${result.status.padEnd(8)} ${result.migrationName}`)
  }
  if (error) throw error
}

export async function migrateToLatest(db: Kysely<Database>): Promise<void> {
  report(await createMigrator(db).migrateToLatest())
}

export async function migrateWithLock(
  connection: ReturnType<typeof connectDb>,
  run: (migrator: Migrator) => Promise<MigrationResultSet>,
): Promise<void> {
  const client = await connection.pool.connect()
  try {
    await client.query('select pg_advisory_lock($1)', [MIGRATION_LOCK_ID])
    report(await run(createMigrator(connection.db)))
  } finally {
    client.release()
  }
}

async function make(name: string | undefined): Promise<void> {
  if (!name) throw new Error('usage: migrate make <name>')
  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
  const file = `${stamp}_${name}`
  await fs.writeFile(
    path.join(import.meta.dir, 'migrations', `${file}.ts`),
    [
      "import type { Kysely } from 'kysely'",
      '',
      'export async function up(db: Kysely<any>): Promise<void> {}',
      '',
      'export async function down(db: Kysely<any>): Promise<void> {}',
      '',
    ].join('\n'),
  )
  console.log(`[migrate] created src/migrations/${file}.ts; register it in src/migrations/index.ts`)
}

if (import.meta.main) {
  const [command, arg] = process.argv.slice(2)
  if (command === 'make') {
    await make(arg)
    process.exit(0)
  }

  const connection = connectDb()
  try {
    await migrateWithLock(connection, (migrator) =>
      command === 'up'
        ? migrator.migrateUp()
        : command === 'down'
          ? migrator.migrateDown()
          : migrator.migrateToLatest(),
    )
  } catch (error) {
    console.error('[migrate] failed', error)
    process.exitCode = 1
  } finally {
    await connection.close()
  }
}
