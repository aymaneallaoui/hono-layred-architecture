import { describe, expect, it } from 'bun:test'

import { childLogger } from '@/infra/logger'
import { MemoryRateLimiter } from '@/infra/rate-limit/memory-rate-limiter'
import { RedisRateLimiter } from '@/infra/rate-limit/redis-rate-limiter'
import { clientIp } from '@/utils/client-ip'

describe('MemoryRateLimiter', () => {
  it('allows up to the limit within the window, then blocks with a retry hint', async () => {
    const rl = new MemoryRateLimiter(() => 1000)
    for (let i = 0; i < 3; i++) expect((await rl.consume('k', 3, 60)).allowed).toBe(true)
    const blocked = await rl.consume('k', 3, 60)
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterSeconds).toBe(60)
  })

  it('slides: a slot frees once the oldest hit leaves the window', async () => {
    let now = 1000
    const rl = new MemoryRateLimiter(() => now)
    await rl.consume('k', 2, 60)
    now = 30_000
    await rl.consume('k', 2, 60)
    expect((await rl.consume('k', 2, 60)).allowed).toBe(false)
    now = 61_001
    expect((await rl.consume('k', 2, 60)).allowed).toBe(true)
  })

  it('tracks keys independently', async () => {
    const rl = new MemoryRateLimiter(() => 1000)
    await rl.consume('a', 1, 60)
    expect((await rl.consume('b', 1, 60)).allowed).toBe(true)
  })
})

describe('RedisRateLimiter', () => {
  const logger = childLogger('test')

  it('evaluates the sliding window script and parses an allow reply', async () => {
    const calls: string[] = []
    const client = {
      send: async (cmd: string) => {
        calls.push(cmd)
        return [1, 4, 0]
      },
    }
    const result = await new RedisRateLimiter(client, logger).consume('k', 5, 60)
    expect(calls).toEqual(['EVAL'])
    expect(result).toEqual({ allowed: true, remaining: 4, retryAfterSeconds: 0 })
  })

  it('converts a deny retry from milliseconds to whole seconds', async () => {
    const client = { send: async () => [0, 0, 4200] }
    const result = await new RedisRateLimiter(client, logger).consume('k', 1, 60)
    expect(result.allowed).toBe(false)
    expect(result.retryAfterSeconds).toBe(5)
  })

  it('fails open when redis errors', async () => {
    const client = {
      send: async () => {
        throw new Error('redis down')
      },
    }
    expect((await new RedisRateLimiter(client, logger).consume('k', 1, 60)).allowed).toBe(true)
  })
})

describe('clientIp', () => {
  const peer = '10.0.0.9'

  it('takes the nth-from-right forwarded address for the trusted hop count', () => {
    const forwarded = '1.1.1.1, 2.2.2.2, 3.3.3.3'
    expect(clientIp(peer, forwarded, 1)).toBe('3.3.3.3')
    expect(clientIp(peer, forwarded, 2)).toBe('2.2.2.2')
  })

  it('falls back to the socket peer when the chain is short or untrusted', () => {
    expect(clientIp(peer, '1.1.1.1', 2)).toBe('10.0.0.9')
    expect(clientIp(peer, '1.1.1.1', 0)).toBe('10.0.0.9')
    expect(clientIp(null, undefined, 1)).toBe('unknown')
  })
})
