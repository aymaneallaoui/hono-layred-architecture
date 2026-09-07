import { describe, expect, it } from 'bun:test'

import { withTestApp } from './helpers'
import { waitFor } from './wait-for'

describe('organization', () => {
  it('reads and renames the active organization', async () => {
    await withTestApp(async ({ register, api }) => {
      const { session, json } = await register()
      const current = await (await api('GET', '/organizations/current', { session })).json()
      expect(current.id).toBe(json.organization.id)

      const renamed = await api('PATCH', '/organizations/current', {
        session,
        body: { name: 'Renamed Co' },
      })
      expect(renamed.status).toBe(200)
      expect((await renamed.json()).name).toBe('Renamed Co')
    })
  })

  it('forbids members from renaming', async () => {
    await withTestApp(async ({ register, addMember, api }) => {
      const owner = await register()
      const member = await addMember(owner.json.organization.id, 'member')
      const res = await api('PATCH', '/organizations/current', {
        session: member.session,
        body: { name: 'Nope' },
      })
      expect(res.status).toBe(403)
      expect((await res.json()).error.code).toBe('FORBIDDEN')
    })
  })

  it('lists members with their roles', async () => {
    await withTestApp(async ({ register, addMember, api }) => {
      const owner = await register()
      const admin = await addMember(owner.json.organization.id, 'admin')
      const members = await (
        await api('GET', '/organizations/current/members', { session: owner.session })
      ).json()
      expect(members.map((m: { userId: string; role: string }) => [m.userId, m.role])).toEqual([
        [owner.json.user.id, 'owner'],
        [admin.userId, 'admin'],
      ])
    })
  })

  it('lets only owners change roles and protects the sole owner', async () => {
    await withTestApp(async ({ register, addMember, api }) => {
      const owner = await register()
      const orgId = owner.json.organization.id
      const admin = await addMember(orgId, 'admin')
      const member = await addMember(orgId, 'member')

      const byAdmin = await api('PATCH', `/organizations/current/members/${member.userId}`, {
        session: admin.session,
        body: { role: 'admin' },
      })
      expect(byAdmin.status).toBe(403)

      const demoteSelf = await api(
        'PATCH',
        `/organizations/current/members/${owner.json.user.id}`,
        {
          session: owner.session,
          body: { role: 'member' },
        },
      )
      expect(demoteSelf.status).toBe(409)
      expect((await demoteSelf.json()).error.code).toBe('SOLE_OWNER')

      const promote = await api('PATCH', `/organizations/current/members/${member.userId}`, {
        session: owner.session,
        body: { role: 'owner' },
      })
      expect(promote.status).toBe(200)
      expect((await promote.json()).role).toBe('owner')

      const demoteNow = await api('PATCH', `/organizations/current/members/${owner.json.user.id}`, {
        session: owner.session,
        body: { role: 'member' },
      })
      expect(demoteNow.status).toBe(200)
    })
  })

  it('removes a member, notifies them, and revokes their access', async () => {
    await withTestApp(async ({ register, addMember, api, db, mailer }) => {
      const owner = await register()
      const member = await addMember(owner.json.organization.id, 'member')

      const res = await api('DELETE', `/organizations/current/members/${member.userId}`, {
        session: owner.session,
      })
      expect(res.status).toBe(204)

      const rows = await db
        .selectFrom('membership')
        .select('id')
        .where('user_id', '=', member.userId)
        .execute()
      expect(rows).toHaveLength(0)
      expect((await api('GET', '/auth/me', { session: member.session })).status).toBe(401)

      const types = await waitFor(
        async () =>
          (
            await db
              .selectFrom('notification')
              .select('type')
              .where('user_id', '=', member.userId)
              .execute()
          ).map((n) => n.type),
        (t) => t.length > 0,
      )
      expect(types).toEqual(['member.removed'])
      expect(mailer.lastFor(member.email, 'notification')?.title).toContain('removed')
    })
  })

  it('does not let an admin remove an owner', async () => {
    await withTestApp(async ({ register, addMember, api }) => {
      const owner = await register()
      const admin = await addMember(owner.json.organization.id, 'admin')
      const res = await api('DELETE', `/organizations/current/members/${owner.json.user.id}`, {
        session: admin.session,
      })
      expect(res.status).toBe(403)
    })
  })

  it('404s for a member of another organization', async () => {
    await withTestApp(async ({ register, api }) => {
      const a = await register()
      const b = await register()
      const res = await api('DELETE', `/organizations/current/members/${b.json.user.id}`, {
        session: a.session,
      })
      expect(res.status).toBe(404)
    })
  })
})
