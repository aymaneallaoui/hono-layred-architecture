import type { Logger } from '@/infra/logger'
import type { RateLimiter, RateLimitResult } from '@/infra/rate-limit/rate-limiter'

export interface RedisLike {
  send(command: string, args: string[]): Promise<unknown>
}

const SLIDING_WINDOW = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
local count = redis.call('ZCARD', key)
if count < limit then
  redis.call('ZADD', key, now, member)
  redis.call('PEXPIRE', key, window)
  return {1, limit - count - 1, 0}
end
local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
local retry = window
if oldest[2] then retry = (tonumber(oldest[2]) + window) - now end
redis.call('PEXPIRE', key, window)
return {0, 0, retry}
`

export class RedisRateLimiter implements RateLimiter {
  constructor(
    private readonly client: RedisLike,
    private readonly logger: Logger,
  ) {}

  async consume(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const now = Date.now()
    const windowMs = windowSeconds * 1000
    const member = `${now}-${Math.random().toString(36).slice(2)}`

    try {
      const reply = (await this.client.send('EVAL', [
        SLIDING_WINDOW,
        '1',
        key,
        String(now),
        String(windowMs),
        String(limit),
        member,
      ])) as [number, number, number]

      const allowed = Number(reply[0]) === 1
      return {
        allowed,
        remaining: Math.max(0, Number(reply[1]) || 0),
        retryAfterSeconds: allowed
          ? 0
          : Math.max(1, Math.ceil((Number(reply[2]) || windowMs) / 1000)),
      }
    } catch (err) {
      this.logger.error({ err }, 'redis rate limiter failed open')
      return { allowed: true, remaining: limit, retryAfterSeconds: 0 }
    }
  }
}
