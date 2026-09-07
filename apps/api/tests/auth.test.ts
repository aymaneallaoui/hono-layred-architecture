import { describe, expect, it } from 'bun:test'
import { uuidv7 } from 'uuidv7'

import { DEFAULT_PASSWORD, sessionFrom, tokenFromUrl, uniqueEmail, withTestApp } from './helpers'

describe('auth: register', () => {
  it('creates the user, an owner workspace, and a session cookie', async () => {
    await withTestApp(async ({ register, db }) => {
      const { res, json, session } = await register({ name: 'Ada Lovelace' })
      expect(res.status).toBe(201)
      expect(session).toBeTruthy()
      expect(json.user.name).toBe('Ada Lovelace')
      expect(json.organization).toMatchObject({ name: "Ada Lovelace's Workspace", role: 'owner' })

      const membership = await db
        .selectFrom('membership')
        .select(['role'])
        .where('user_id', '=', json.user.id)
        .executeTakeFirstOrThrow()
      expect(membership.role).toBe('owner')
    })
  })

  it('honours a chosen organization name', async () => {
    await withTestApp(async ({ register }) => {
      const { json } = await register({ organizationName: 'Hopper Industries' })
      expect(json.organization.name).toBe('Hopper Industries')
    })
  })

  it('sends a verification email with a usable token', async () => {
    await withTestApp(async ({ register, mailer, api, db }) => {
      const { email, json } = await register({}, { verify: false })
      const mail = mailer.lastFor(email, 'email_verification')
      expect(mail).toBeDefined()

      const res = await api('GET', `/api/auth/verify-email?token=${tokenFromUrl(mail!.url)}`)
      expect(res.status).toBeLessThan(400)
      const user = await db
        .selectFrom('app_user')
        .select('email_verified')
        .where('id', '=', json.user.id)
        .executeTakeFirstOrThrow()
      expect(user.email_verified).toBe(true)
    })
  })

  it('rejects a duplicate email with 409 in the house envelope', async () => {
    await withTestApp(async ({ register, api }) => {
      const { email } = await register()
      const res = await api('POST', '/auth/register', {
        body: { email, password: DEFAULT_PASSWORD, name: 'Again' },
      })
      expect(res.status).toBe(409)
      expect((await res.json()).error.code).toBe('CONFLICT')
    })
  })

  it('rejects a weak password with 422 and validation details', async () => {
    await withTestApp(async ({ api }) => {
      const res = await api('POST', '/auth/register', {
        body: { email: uniqueEmail(), password: 'short', name: 'x' },
      })
      expect(res.status).toBe(422)
      const body = await res.json()
      expect(body.error.code).toBe('UNPROCESSABLE')
      expect(body.error.details[0].path).toBe('/password')
    })
  })

  it('rate limits registration per ip', async () => {
    await withTestApp(async ({ api }) => {
      const ip = '198.18.1.1'
      let last: Response | undefined
      for (let i = 0; i < 6; i++) {
        last = await api('POST', '/auth/register', {
          ip,
          body: { email: uniqueEmail(), password: DEFAULT_PASSWORD, name: 'x' },
        })
      }
      expect(last!.status).toBe(429)
      expect(last!.headers.get('retry-after')).toBeTruthy()
    })
  })
})

describe('auth: session', () => {
  it('signs in with better auth and reads /auth/me', async () => {
    await withTestApp(async ({ register, signIn, api }) => {
      const { email, json } = await register()
      const session = await signIn(email)
      const res = await api('GET', '/auth/me', { session })
      expect(res.status).toBe(200)
      const me = await res.json()
      expect(me.user.email).toBe(email)
      expect(me.organization.id).toBe(json.organization.id)
    })
  })

  it('rejects a wrong password and a missing session', async () => {
    await withTestApp(async ({ register, api }) => {
      const { email } = await register()
      const bad = await api('POST', '/api/auth/sign-in/email', {
        body: { email, password: 'not-the-password' },
      })
      expect(bad.status).toBe(401)
      expect(sessionFrom(bad)).toBeNull()

      const anon = await api('GET', '/auth/me')
      expect(anon.status).toBe(401)
      expect((await anon.json()).error.code).toBe('UNAUTHORIZED')
    })
  })

  it('signs out and the cookie stops working', async () => {
    await withTestApp(async ({ register, api }) => {
      const { session } = await register()
      const out = await api('POST', '/api/auth/sign-out', { session, body: {} })
      expect(out.status).toBeLessThan(400)
      expect((await api('GET', '/auth/me', { session })).status).toBe(401)
    })
  })

  it('resets a password through the emailed token and revokes old sessions', async () => {
    await withTestApp(async ({ register, api, mailer, signIn }) => {
      const { email, session } = await register()
      await api('POST', '/api/auth/request-password-reset', {
        body: { email, redirectTo: '/reset-password' },
      })
      const mail = mailer.lastFor(email, 'password_reset')
      expect(mail).toBeDefined()

      const reset = await api('POST', '/api/auth/reset-password', {
        body: { token: tokenFromUrl(mail!.url), newPassword: 'brand-new-password-1' },
      })
      expect(reset.status).toBeLessThan(400)
      expect((await api('GET', '/auth/me', { session })).status).toBe(401)
      expect(await signIn(email, 'brand-new-password-1')).toBeTruthy()
    })
  })

  it('switches the active organization for the session', async () => {
    await withTestApp(async ({ register, api, db }) => {
      const { json, session } = await register()
      const otherOrg = uuidv7()
      await db
        .insertInto('organization')
        .values({ id: otherOrg, name: 'Second', slug: `second-${otherOrg.slice(0, 8)}` })
        .execute()
      await db
        .insertInto('membership')
        .values({ id: uuidv7(), organization_id: otherOrg, user_id: json.user.id, role: 'admin' })
        .execute()

      const memberships = await (await api('GET', '/auth/memberships', { session })).json()
      expect(memberships.map((m: { id: string }) => m.id)).toEqual([json.organization.id, otherOrg])

      const switched = await api('POST', '/auth/switch-org', {
        session,
        body: { organizationId: otherOrg },
      })
      expect(switched.status).toBe(200)
      expect((await switched.json()).organization).toMatchObject({ id: otherOrg, role: 'admin' })
      expect((await (await api('GET', '/auth/me', { session })).json()).organization.id).toBe(
        otherOrg,
      )

      const foreign = await api('POST', '/auth/switch-org', {
        session,
        body: { organizationId: uuidv7() },
      })
      expect(foreign.status).toBe(403)
    })
  })

  it('seeds a workspace for a never-seeded user, but never for a revoked one', async () => {
    await withTestApp(async ({ register, api, db }) => {
      const { json, session } = await register()
      await db.deleteFrom('membership').where('user_id', '=', json.user.id).execute()
      expect((await api('GET', '/auth/me', { session })).status).toBe(401)

      await db
        .updateTable('app_user')
        .set({ tenant_seeded_at: null })
        .where('id', '=', json.user.id)
        .execute()
      const healed = await api('GET', '/auth/me', { session })
      expect(healed.status).toBe(200)
      expect((await healed.json()).organization.role).toBe('owner')
    })
  })
})

describe('account', () => {
  it('updates the profile name', async () => {
    await withTestApp(async ({ register, api }) => {
      const { session } = await register()
      const res = await api('PATCH', '/account/profile', { session, body: { name: '  Grace  ' } })
      expect(res.status).toBe(200)
      expect((await res.json()).name).toBe('Grace')
      expect((await (await api('GET', '/auth/me', { session })).json()).user.name).toBe('Grace')
    })
  })
})
