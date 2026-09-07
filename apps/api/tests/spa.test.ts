import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'bun:test'

import { withTestApp } from './helpers'

const dist = mkdtempSync(path.join(tmpdir(), 'web-dist-'))

beforeAll(() => {
  writeFileSync(path.join(dist, 'index.html'), '<!doctype html><title>spa</title>')
  writeFileSync(path.join(dist, 'app.js'), 'console.log("bundle")')
})

afterAll(() => {
  rmSync(dist, { recursive: true, force: true })
})

describe('spa serving', () => {
  it('serves the bundle, falls back to index.html for html navigations, and keeps api 404s json', async () => {
    await withTestApp(
      async ({ api }) => {
        const bundle = await api('GET', '/app.js')
        expect(bundle.status).toBe(200)
        expect(await bundle.text()).toContain('bundle')

        const root = await api('GET', '/', { headers: { accept: 'text/html' } })
        expect(root.status).toBe(200)
        expect(await root.text()).toContain('<title>spa</title>')

        const nav = await api('GET', '/dashboard', { headers: { accept: 'text/html,*/*' } })
        expect(nav.status).toBe(200)
        expect(await nav.text()).toContain('<title>spa</title>')

        const apiMiss = await api('GET', '/projects/00000000-0000-7000-8000-000000000000', {
          headers: { accept: 'text/html' },
        })
        expect(apiMiss.status).toBe(401)

        const unknownJson = await api('GET', '/does-not-exist', {
          headers: { accept: 'application/json' },
        })
        expect(unknownJson.status).toBe(404)
        expect((await unknownJson.json()).error.code).toBe('ROUTE_NOT_FOUND')
      },
      { webDist: dist },
    )
  })
})
