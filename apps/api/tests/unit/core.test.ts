import { describe, expect, it } from 'bun:test'

import { EventBus } from '@/infra/events'
import { childLogger } from '@/infra/logger'
import { AppError, NotFoundError, SoleOwnerError } from '@/models/errors'
import { BaseService } from '@/services/shared/base.service'
import { escapeLike } from '@/utils/filters'
import { defaultOrganizationName, normalizeEmail, slugify } from '@/utils/text'
import { generateToken, hashToken } from '@/utils/token'

import { waitFor } from '../wait-for'

class Probe extends BaseService {
  found<T>(value: T | null | undefined): T {
    return this.assertFound(value, 'Widget', 'w1')
  }
}

describe('BaseService.assertFound', () => {
  const probe = new Probe(childLogger('Probe'))

  it('returns present values, including falsy ones', () => {
    expect(probe.found(0)).toBe(0)
    expect(probe.found('')).toBe('')
    expect(probe.found(false)).toBe(false)
  })

  it('throws a catalog-backed NotFoundError on null or undefined', () => {
    expect(() => probe.found(null)).toThrow(NotFoundError)
    expect(() => probe.found(undefined)).toThrow('Widget "w1" was not found.')
  })
})

describe('AppError', () => {
  it('derives status and default message from the catalog', () => {
    const error = new SoleOwnerError()
    expect(error).toBeInstanceOf(AppError)
    expect(error.status).toBe(409)
    expect(error.code).toBe('SOLE_OWNER')
    expect(error.name).toBe('SoleOwnerError')
    expect(error.message).toContain('at least one owner')
  })
})

describe('EventBus', () => {
  it('delivers to every subscriber and isolates a failing one', async () => {
    const bus = new EventBus(childLogger('EventBusTest'))
    const seen: string[] = []
    bus.on('member.removed', () => {
      throw new Error('boom')
    })
    bus.on('member.removed', (payload) => {
      seen.push(payload.userId)
    })
    bus.emit('member.removed', { organizationId: 'o', organizationName: 'Org', userId: 'u1' })
    expect(
      await waitFor(
        () => seen,
        (s) => s.length > 0,
      ),
    ).toEqual(['u1'])
  })
})

describe('text utils', () => {
  it('normalizes emails and slugs', () => {
    expect(normalizeEmail('  Ada@Example.COM ')).toBe('ada@example.com')
    expect(slugify('Hopper Industries, Inc.')).toBe('hopper-industries-inc')
    expect(slugify('!!!')).toBe('org')
  })

  it('names a workspace after the person, else the email local part', () => {
    expect(defaultOrganizationName('Grace', 'g@x.com')).toBe("Grace's Workspace")
    expect(defaultOrganizationName('  ', 'grace.h@x.com')).toBe("grace.h's Workspace")
  })

  it('escapes like wildcards', () => {
    expect(escapeLike('50%_off\\')).toBe('50\\%\\_off\\\\')
  })
})

describe('tokens', () => {
  it('generates url-safe tokens and stable hashes', () => {
    const token = generateToken()
    expect(token).toMatch(/^[A-Za-z0-9_-]{40,}$/)
    expect(hashToken(token)).toBe(hashToken(token))
    expect(hashToken(token)).not.toBe(hashToken(generateToken()))
  })
})
