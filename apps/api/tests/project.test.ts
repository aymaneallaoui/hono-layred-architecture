import { describe, expect, it } from 'bun:test'
import { uuidv7 } from 'uuidv7'

import { withTestApp } from './helpers'

describe('projects', () => {
  it('creates, reads, updates, archives, and deletes', async () => {
    await withTestApp(async ({ register, api, db }) => {
      const { session } = await register()
      const created = await api('POST', '/projects', {
        session,
        body: { name: '  Website  ', description: 'Marketing site' },
      })
      expect(created.status).toBe(201)
      const project = await created.json()
      expect(project.name).toBe('Website')

      expect((await (await api('GET', `/projects/${project.id}`, { session })).json()).id).toBe(
        project.id,
      )

      const archived = await api('PATCH', `/projects/${project.id}`, {
        session,
        body: { archived: true },
      })
      expect((await archived.json()).archivedAt).not.toBeNull()

      const active = await (await api('GET', '/projects', { session })).json()
      expect(active.data).toHaveLength(0)
      const all = await (await api('GET', '/projects?status=all', { session })).json()
      expect(all.total).toBe(1)

      expect((await api('DELETE', `/projects/${project.id}`, { session })).status).toBe(204)
      expect(await db.selectFrom('project').select('id').execute()).toHaveLength(0)
      expect((await api('GET', `/projects/${project.id}`, { session })).status).toBe(404)
    })
  })

  it('searches, sorts, and pages', async () => {
    await withTestApp(async ({ register, api }) => {
      const { session } = await register()
      for (const name of ['Charlie', 'Alpha', 'Bravo', 'Delta', 'Echo']) {
        await api('POST', '/projects', { session, body: { name } })
      }

      const byName = await (
        await api('GET', '/projects?sort=name&order=asc&limit=2&page=0', { session })
      ).json()
      expect(byName.total).toBe(5)
      expect(byName.data.map((p: { name: string }) => p.name)).toEqual(['Alpha', 'Bravo'])

      const page1 = await (
        await api('GET', '/projects?sort=name&order=asc&limit=2&page=1', { session })
      ).json()
      expect(page1.data.map((p: { name: string }) => p.name)).toEqual(['Charlie', 'Delta'])

      const search = await (await api('GET', '/projects?q=lph', { session })).json()
      expect(search.data.map((p: { name: string }) => p.name)).toEqual(['Alpha'])

      const wildcard = await (await api('GET', '/projects?q=%25', { session })).json()
      expect(wildcard.total).toBe(0)
    })
  })

  it('is tenant scoped and role gated', async () => {
    await withTestApp(async ({ register, addMember, api }) => {
      const a = await register()
      const b = await register()
      const member = await addMember(a.json.organization.id, 'member')
      const project = await (
        await api('POST', '/projects', { session: a.session, body: { name: 'Private' } })
      ).json()

      expect((await api('GET', `/projects/${project.id}`, { session: b.session })).status).toBe(404)
      expect(
        (await api('PATCH', `/projects/${project.id}`, { session: b.session, body: { name: 'x' } }))
          .status,
      ).toBe(404)
      expect(
        (await api('GET', `/projects/${project.id}`, { session: member.session })).status,
      ).toBe(200)
      expect(
        (await api('POST', '/projects', { session: member.session, body: { name: 'Nope' } }))
          .status,
      ).toBe(403)
    })
  })

  it('deletes a batch and never touches another organization', async () => {
    await withTestApp(async ({ register, api }) => {
      const a = await register()
      const b = await register()
      const mine = await (
        await api('POST', '/projects', { session: a.session, body: { name: 'Mine' } })
      ).json()
      const theirs = await (
        await api('POST', '/projects', { session: b.session, body: { name: 'Theirs' } })
      ).json()

      const res = await api('POST', '/projects/delete-batch', {
        session: a.session,
        body: { ids: [mine.id, theirs.id, uuidv7()] },
      })
      expect(await res.json()).toEqual({ requested: 3, removed: 1 })
      expect((await api('GET', `/projects/${theirs.id}`, { session: b.session })).status).toBe(200)
    })
  })

  it('rejects an invalid body with field-level details', async () => {
    await withTestApp(async ({ register, api }) => {
      const { session } = await register()
      const res = await api('POST', '/projects', { session, body: { name: '' } })
      expect(res.status).toBe(422)
      expect((await res.json()).error.details[0].path).toBe('/name')
    })
  })
})
