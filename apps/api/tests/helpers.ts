import { uuidv7 } from 'uuidv7'

import { type App, type AppOptions, createApp } from '@/app'
import { type Container, createContainer } from '@/container'
import { CapturingMailer } from '@/infra/mail'
import { MemoryRateLimiter } from '@/infra/rate-limit'
import type { Role } from '@/models/auth'

import { createTestDatabase } from './database'

const SESSION_COOKIE = 'better-auth.session_token'
export const DEFAULT_PASSWORD = 'super-secret-password'

export interface ApiOptions {
  body?: unknown
  session?: string
  cookie?: string
  ip?: string
  headers?: Record<string, string>
}

export interface TestContext {
  app: App
  container: Container
  mailer: CapturingMailer
  rateLimiter: MemoryRateLimiter
  db: Container['connection']['db']
  api(method: string, path: string, opts?: ApiOptions): Promise<Response>
  register(body?: Record<string, unknown>, opts?: { verify?: boolean }): Promise<Registered>
  signIn(email: string, password?: string): Promise<string>
  addMember(organizationId: string, role?: Exclude<Role, 'owner'>): Promise<SeededMember>
}

export interface Registered {
  email: string
  password: string
  res: Response
  json: {
    user: { id: string; email: string; name: string; emailVerified: boolean }
    organization: { id: string; name: string; slug: string; role: string }
  }
  session: string
}

export interface SeededMember {
  email: string
  userId: string
  session: string
}

export function randomIp(): string {
  return `198.18.${(Math.random() * 256) | 0}.${((Math.random() * 254) | 0) + 1}`
}

export function uniqueEmail(prefix = 'user'): string {
  return `${prefix}-${crypto.randomUUID()}@test.local`
}

export function sessionFrom(res: Response): string | null {
  const cookie = res.headers.getSetCookie().find((c) => c.startsWith(`${SESSION_COOKIE}=`))
  const value = cookie ? cookie.split(';')[0]!.slice(SESSION_COOKIE.length + 1) : ''
  return value === '' ? null : value
}

export function tokenFromUrl(url: string): string {
  const token = new URL(url).searchParams.get('token')
  if (!token) throw new Error(`no token in url: ${url}`)
  return token
}

export async function withTestApp(
  run: (ctx: TestContext) => Promise<void>,
  options: AppOptions = {},
): Promise<void> {
  const database = await createTestDatabase()
  const mailer = new CapturingMailer()
  const rateLimiter = new MemoryRateLimiter()
  const container = createContainer({ connection: database.connection, mailer, rateLimiter })
  const app = createApp(container, options)

  const api: TestContext['api'] = async (method, path, opts = {}) => {
    const headers: Record<string, string> = {
      'x-forwarded-for': opts.ip ?? randomIp(),
      ...opts.headers,
    }
    if (opts.body !== undefined) headers['content-type'] = 'application/json'
    const cookie = opts.session ? `${SESSION_COOKIE}=${opts.session}` : opts.cookie
    if (cookie) headers.cookie = cookie
    return app.request(
      new Request(`http://localhost${path}`, {
        method,
        headers,
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      }),
    )
  }

  const signIn: TestContext['signIn'] = async (email, password = DEFAULT_PASSWORD) => {
    const res = await api('POST', '/api/auth/sign-in/email', { body: { email, password } })
    const session = sessionFrom(res)
    if (!session) throw new Error(`sign-in failed for ${email}: ${res.status} ${await res.text()}`)
    return session
  }

  const register: TestContext['register'] = async (body = {}, opts = {}) => {
    const email = (body.email as string) ?? uniqueEmail()
    const res = await api('POST', '/auth/register', {
      body: { email, password: DEFAULT_PASSWORD, name: 'Test User', ...body },
    })
    const json = (await res.json()) as Registered['json']
    if (opts.verify !== false && res.status === 201) {
      await database.connection.db
        .updateTable('app_user')
        .set({ email_verified: true })
        .where('email', '=', email)
        .execute()
    }
    return {
      email,
      password: (body.password as string) ?? DEFAULT_PASSWORD,
      res,
      json,
      session: sessionFrom(res) as string,
    }
  }

  const addMember: TestContext['addMember'] = async (organizationId, role = 'member') => {
    const email = uniqueEmail(role)
    const userId = uuidv7()
    const db = database.connection.db
    await db
      .insertInto('app_user')
      .values({
        id: userId,
        email,
        name: `${role} user`,
        email_verified: true,
        tenant_seeded_at: new Date(),
      })
      .execute()
    await db
      .insertInto('account')
      .values({
        id: uuidv7(),
        user_id: userId,
        issuer: 'local:credential',
        account_id: userId,
        provider_id: 'credential',
        password: await (await container.auth.$context).password.hash(DEFAULT_PASSWORD),
      })
      .execute()
    await db
      .insertInto('membership')
      .values({ id: uuidv7(), organization_id: organizationId, user_id: userId, role })
      .execute()
    return { email, userId, session: await signIn(email) }
  }

  try {
    await run({
      app,
      container,
      mailer,
      rateLimiter,
      db: database.connection.db,
      api,
      register,
      signIn,
      addMember,
    })
  } finally {
    await database.drop()
  }
}
