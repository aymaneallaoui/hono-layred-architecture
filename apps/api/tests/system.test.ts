import { describe, expect, it } from 'bun:test'

import { strictTransportSecurity } from '@/middleware/security-headers'

import { withTestApp } from './helpers'

describe('system', () => {
  it('reports ok when every dependency answers', async () => {
    await withTestApp(async ({ api }) => {
      const res = await api('GET', '/health')
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({
        status: 'ok',
        checks: { database: 'ok', mail: 'ok' },
      })
    })
  })

  it('degrades but stays up when only mail is unreachable', async () => {
    await withTestApp(async ({ api, mailer }) => {
      mailer.verifyShouldFail = true
      const res = await api('GET', '/health')
      expect(res.status).toBe(200)
      expect((await res.json()).status).toBe('degraded')
    })
  })

  it('sets hardening headers on every response', async () => {
    await withTestApp(async ({ api }) => {
      const res = await api('GET', '/api')
      expect(res.headers.get('x-content-type-options')).toBe('nosniff')
      expect(res.headers.get('x-frame-options')).toBe('DENY')
      expect(res.headers.get('referrer-policy')).toBe('no-referrer')
      expect(res.headers.get('strict-transport-security')).toBeNull()
    })
  })

  it('answers unknown routes with the error envelope', async () => {
    await withTestApp(async ({ api }) => {
      const res = await api('GET', '/nope')
      expect(res.status).toBe(404)
      expect(await res.json()).toEqual({
        error: { code: 'ROUTE_NOT_FOUND', message: 'Route not found.' },
      })
    })
  })
})

describe('strict transport security', () => {
  it('advertises HSTS only in production', () => {
    expect(strictTransportSecurity('production')).toContain('max-age=')
    expect(strictTransportSecurity('development')).toBeUndefined()
  })
})
