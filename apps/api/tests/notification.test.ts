import { describe, expect, it } from 'bun:test'

import { asId, type UserId } from '@/models/ids'

import { withTestApp } from './helpers'

describe('notifications', () => {
  it('pages newest first with a stable cursor and scopes to the caller', async () => {
    await withTestApp(async ({ register, api, container }) => {
      const me = await register()
      const other = await register()
      const notify = container.notificationService
      for (let i = 0; i < 5; i++) {
        await notify.notify({
          userId: asId<UserId>(me.json.user.id),
          type: 'member.joined',
          title: `Title ${i}`,
          body: 'Body',
        })
      }
      await notify.notify({
        userId: asId<UserId>(other.json.user.id),
        type: 'member.joined',
        title: 'Not yours',
        body: 'Body',
      })

      const first = await (
        await api('GET', '/notifications?limit=3', { session: me.session })
      ).json()
      expect(first.data.map((n: { title: string }) => n.title)).toEqual([
        'Title 4',
        'Title 3',
        'Title 2',
      ])
      expect(first.nextCursor).toBe(first.data[2].id)

      const second = await (
        await api('GET', `/notifications?limit=3&cursor=${first.nextCursor}`, {
          session: me.session,
        })
      ).json()
      expect(second.data.map((n: { title: string }) => n.title)).toEqual(['Title 1', 'Title 0'])
      expect(second.nextCursor).toBeNull()
    })
  })

  it('tracks unread counts, single reads, and read-all idempotently', async () => {
    await withTestApp(async ({ register, api, container, db }) => {
      const me = await register()
      const other = await register()
      const mine = await container.notificationService.notify({
        userId: asId<UserId>(me.json.user.id),
        type: 'member.joined',
        title: 'Mine',
        body: 'Body',
      })
      const theirs = await container.notificationService.notify({
        userId: asId<UserId>(other.json.user.id),
        type: 'member.joined',
        title: 'Theirs',
        body: 'Body',
      })

      const unread = async () =>
        (await (await api('GET', '/notifications/unread-count', { session: me.session })).json())
          .unread
      expect(await unread()).toBe(1)

      expect(
        (await api('POST', `/notifications/${theirs.id}/read`, { session: me.session })).status,
      ).toBe(204)
      const foreign = await db
        .selectFrom('notification')
        .select('read_at')
        .where('id', '=', theirs.id)
        .executeTakeFirstOrThrow()
      expect(foreign.read_at).toBeNull()

      expect(
        (await api('POST', `/notifications/${mine.id}/read`, { session: me.session })).status,
      ).toBe(204)
      expect(await unread()).toBe(0)

      const all = await api('POST', '/notifications/read-all', { session: me.session })
      expect(await all.json()).toEqual({ updated: 0 })
    })
  })

  it('rejects unauthenticated access', async () => {
    await withTestApp(async ({ api }) => {
      expect((await api('GET', '/notifications')).status).toBe(401)
      expect((await api('POST', '/notifications/read-all')).status).toBe(401)
    })
  })
})
