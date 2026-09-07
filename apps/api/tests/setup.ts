process.env.NODE_ENV = 'test'
process.env.LOG_LEVEL ??= 'error'
process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@127.0.0.1:5432/hono_starter'
process.env.BETTER_AUTH_SECRET ??= 'test-secret-0123456789abcdef0123456789abcdef'
process.env.WEB_URL ??= 'http://localhost:5173'
process.env.API_URL ??= 'http://localhost:3001'
process.env.RATE_LIMIT_AUTH_MAX ??= '5'
delete process.env.WEB_DIST_DIR

const { sql } = await import('kysely')
const { connectDb } = await import('@/infra/db')
const { migrateToLatest } = await import('@/migrate')
const { TEMPLATE_DB, templateUrl } = await import('./database')

const admin = connectDb()
try {
  const stale = await sql<{ datname: string }>`
    select datname from pg_database where datname like 'test_%' or datname = ${TEMPLATE_DB}
  `.execute(admin.db)
  for (const { datname } of stale.rows) {
    await sql`drop database ${sql.id(datname)} with (force)`.execute(admin.db)
  }
  await sql`create database ${sql.id(TEMPLATE_DB)}`.execute(admin.db)
} finally {
  await admin.close()
}

const template = connectDb(templateUrl())
try {
  await migrateToLatest(template.db)
} finally {
  await template.close()
}
