import { createHash } from 'node:crypto'

import { signJWT } from 'better-auth/crypto'
import { Kysely, PostgresDialect } from 'kysely'
import { Pool } from 'pg'

import type { Database } from '../infra/types'

export interface SeedConfig {
  apiUrl: string
  webOrigin: string
  databaseUrl: string
  authSecret: string
}

export interface SeededUser {
  userId: string
  email: string
  password: string
  name: string
}

const SESSION_COOKIE = 'better-auth.session_token'

async function withDb<T>(
  config: SeedConfig,
  run: (db: Kysely<Database>) => Promise<T>,
): Promise<T> {
  const pool = new Pool({ connectionString: config.databaseUrl, max: 2 })
  const db = new Kysely<Database>({ dialect: new PostgresDialect({ pool }) })
  try {
    return await run(db)
  } finally {
    await db.destroy()
  }
}

async function post(config: SeedConfig, path: string, body: unknown, cookie?: string) {
  return fetch(`${config.apiUrl}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: config.webOrigin,
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  })
}

function cookieFrom(response: Response): string {
  const raw = response.headers.getSetCookie().find((c) => c.startsWith(`${SESSION_COOKIE}=`))
  const value = raw?.split(';')[0]?.slice(SESSION_COOKIE.length + 1)
  if (!value) throw new Error(`no session cookie on ${response.url} (${response.status})`)
  return value
}

export async function createUser(
  config: SeedConfig,
  input: {
    email: string
    password: string
    name: string
    organizationName?: string
    verified?: boolean
  },
): Promise<SeededUser> {
  const response = await post(config, '/auth/register', {
    email: input.email,
    password: input.password,
    name: input.name,
    organizationName: input.organizationName,
  })
  if (response.status !== 201) {
    throw new Error(`register failed (${response.status}): ${await response.text()}`)
  }
  const { user } = (await response.json()) as { user: { id: string } }
  if (input.verified !== false) {
    await withDb(config, (db) =>
      db.updateTable('app_user').set({ email_verified: true }).where('id', '=', user.id).execute(),
    )
  }
  return { userId: user.id, email: input.email, password: input.password, name: input.name }
}

export async function signInCookie(
  config: SeedConfig,
  user: Pick<SeededUser, 'email' | 'password'>,
): Promise<{ name: string; value: string }> {
  const response = await post(config, '/api/auth/sign-in/email', {
    email: user.email,
    password: user.password,
  })
  return { name: SESSION_COOKIE, value: cookieFrom(response) }
}

export async function inviteToken(
  config: SeedConfig,
  inviter: Pick<SeededUser, 'email' | 'password'>,
  input: { email: string; role: 'admin' | 'member' },
): Promise<string> {
  const session = await signInCookie(config, inviter)
  const response = await post(
    config,
    '/organizations/current/invitations',
    input,
    `${session.name}=${session.value}`,
  )
  if (response.status !== 201) {
    throw new Error(`invite failed (${response.status}): ${await response.text()}`)
  }
  const { id } = (await response.json()) as { id: string }
  return withDb(config, async (db) => {
    const token = `e2e-${id}`
    await db
      .updateTable('invitation')
      .set({ token_hash: createHash('sha256').update(token).digest('hex') })
      .where('id', '=', id)
      .execute()
    return token
  })
}

export function verificationToken(config: SeedConfig, email: string): Promise<string> {
  return signJWT({ email: email.toLowerCase(), updateTo: undefined }, config.authSecret, 3600)
}

export async function isEmailVerified(config: SeedConfig, email: string): Promise<boolean> {
  return withDb(config, async (db) => {
    const row = await db
      .selectFrom('app_user')
      .select('email_verified')
      .where('email', '=', email.toLowerCase())
      .executeTakeFirstOrThrow()
    return row.email_verified
  })
}

export async function membershipRole(
  config: SeedConfig,
  userId: string,
  organizationName: string,
): Promise<string | null> {
  return withDb(config, async (db) => {
    const row = await db
      .selectFrom('membership')
      .innerJoin('organization', 'organization.id', 'membership.organization_id')
      .select('membership.role')
      .where('membership.user_id', '=', userId)
      .where('organization.name', '=', organizationName)
      .executeTakeFirst()
    return row?.role ?? null
  })
}
