import { describe, expect, it } from 'bun:test'

import { hashToken } from '@/utils/token'

import { tokenFromUrl, uniqueEmail, withTestApp } from './helpers'
import { waitFor } from './wait-for'

describe('invitations', () => {
  it('invites by email, stores only the token hash, and lists it as pending', async () => {
    await withTestApp(async ({ register, api, mailer, db }) => {
      const owner = await register()
      const email = uniqueEmail('invitee')
      const res = await api('POST', '/organizations/current/invitations', {
        session: owner.session,
        body: { email, role: 'admin' },
      })
      expect(res.status).toBe(201)
      const invitation = await res.json()
      expect(invitation).toMatchObject({ email, role: 'admin' })

      const mail = mailer.lastFor(email, 'organization_invite')
      expect(mail).toBeDefined()
      const row = await db
        .selectFrom('invitation')
        .select('token_hash')
        .where('id', '=', invitation.id)
        .executeTakeFirstOrThrow()
      expect(row.token_hash).toBe(hashToken(tokenFromUrl(mail!.url)))

      const pending = await (
        await api('GET', '/organizations/current/invitations', { session: owner.session })
      ).json()
      expect(pending.map((i: { id: string }) => i.id)).toEqual([invitation.id])
    })
  })

  it('refuses duplicates, existing members, and unverified inviters', async () => {
    await withTestApp(async ({ register, addMember, api }) => {
      const owner = await register()
      const member = await addMember(owner.json.organization.id, 'member')
      const email = uniqueEmail('dup')
      const invite = (session: string, to = email) =>
        api('POST', '/organizations/current/invitations', {
          session,
          body: { email: to, role: 'member' },
        })

      expect((await invite(owner.session)).status).toBe(201)
      expect((await invite(owner.session)).status).toBe(409)
      expect((await invite(owner.session, member.email)).status).toBe(409)
      expect((await invite(member.session, uniqueEmail())).status).toBe(403)

      const unverified = await register({}, { verify: false })
      const res = await invite(unverified.session, uniqueEmail())
      expect(res.status).toBe(403)
      expect((await res.json()).error.code).toBe('EMAIL_NOT_VERIFIED')
    })
  })

  it('rolls the invitation back when the email cannot be delivered', async () => {
    await withTestApp(async ({ register, api, mailer, db }) => {
      const owner = await register()
      mailer.sendOrganizationInvite = async () => {
        throw new Error('smtp down')
      }
      const res = await api('POST', '/organizations/current/invitations', {
        session: owner.session,
        body: { email: uniqueEmail(), role: 'member' },
      })
      expect(res.status).toBe(500)
      expect(await db.selectFrom('invitation').select('id').execute()).toHaveLength(0)
    })
  })

  it('previews publicly, then joins the org for the invited address only', async () => {
    await withTestApp(async ({ register, api, mailer, db }) => {
      const owner = await register({ organizationName: 'Acme' })
      const email = uniqueEmail('joiner')
      await api('POST', '/organizations/current/invitations', {
        session: owner.session,
        body: { email, role: 'admin' },
      })
      const token = tokenFromUrl(mailer.lastFor(email, 'organization_invite')!.url)

      const preview = await api('GET', `/invitations/${token}`)
      expect(preview.status).toBe(200)
      expect(await preview.json()).toMatchObject({
        organizationName: 'Acme',
        inviterName: 'Test User',
        email,
        role: 'admin',
      })

      const stranger = await register()
      const wrong = await api('POST', `/invitations/${token}/accept`, { session: stranger.session })
      expect(wrong.status).toBe(403)

      const joiner = await register({ email })
      const accepted = await api('POST', `/invitations/${token}/accept`, {
        session: joiner.session,
      })
      expect(accepted.status).toBe(200)
      expect(await accepted.json()).toMatchObject({ id: owner.json.organization.id, role: 'admin' })

      const me = await (await api('GET', '/auth/me', { session: joiner.session })).json()
      expect(me.organization.id).toBe(owner.json.organization.id)

      const again = await api('POST', `/invitations/${token}/accept`, { session: joiner.session })
      expect(again.status).toBe(404)

      const types = await waitFor(
        async () =>
          (
            await db
              .selectFrom('notification')
              .select('type')
              .where('user_id', '=', owner.json.user.id)
              .execute()
          ).map((n) => n.type),
        (t) => t.length > 0,
      )
      expect(types).toEqual(['member.joined'])
    })
  })

  it('reports an expired invitation as 410', async () => {
    await withTestApp(async ({ register, api, mailer, db }) => {
      const owner = await register()
      const email = uniqueEmail()
      await api('POST', '/organizations/current/invitations', {
        session: owner.session,
        body: { email, role: 'member' },
      })
      await db
        .updateTable('invitation')
        .set({ expires_at: new Date(0) })
        .execute()
      const token = tokenFromUrl(mailer.lastFor(email, 'organization_invite')!.url)
      const res = await api('GET', `/invitations/${token}`)
      expect(res.status).toBe(410)
      expect((await res.json()).error.code).toBe('INVITATION_EXPIRED')
    })
  })

  it('revokes a pending invitation', async () => {
    await withTestApp(async ({ register, api, mailer }) => {
      const owner = await register()
      const email = uniqueEmail()
      const created = await (
        await api('POST', '/organizations/current/invitations', {
          session: owner.session,
          body: { email, role: 'member' },
        })
      ).json()
      const res = await api('DELETE', `/organizations/current/invitations/${created.id}`, {
        session: owner.session,
      })
      expect(res.status).toBe(204)
      const token = tokenFromUrl(mailer.lastFor(email, 'organization_invite')!.url)
      expect((await api('GET', `/invitations/${token}`)).status).toBe(404)
    })
  })
})
