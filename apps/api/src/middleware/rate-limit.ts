import { createMiddleware } from 'hono/factory'

import type { RateLimiter } from '@/infra/rate-limit'
import type { Account } from '@/models/auth'
import { TooManyRequestsError } from '@/models/errors'
import { requestIp } from '@/utils/client-ip'

export interface RateLimitRule {
  scope: string
  max: number
  windowSeconds: number
  by?: 'ip' | 'email' | 'account'
}

export type RateLimitConfig = RateLimitRule | readonly RateLimitRule[]

type RateLimitEnv = { Variables: { account?: Account } }

function accountKey(account: Account | undefined): string | null {
  if (!account?.organizationId || !account.userId) return null
  return `${account.organizationId}:${account.userId}`
}

function emailKey(body: unknown): string | null {
  const email = (body as { email?: unknown } | null)?.email
  return typeof email === 'string' ? email.trim().toLowerCase() : null
}

export function createRateLimitMiddleware(rateLimiter: RateLimiter) {
  return (config: RateLimitConfig) => {
    const rules: readonly RateLimitRule[] = Array.isArray(config) ? config : [config]
    return createMiddleware<RateLimitEnv>(async (c, next) => {
      for (const rule of rules) {
        const by = rule.by ?? 'ip'
        const identity =
          by === 'email'
            ? emailKey(await c.req.json().catch(() => null))
            : by === 'account'
              ? accountKey(c.get('account'))
              : requestIp(c)
        if (!identity) continue

        const result = await rateLimiter.consume(
          `rl:${rule.scope}:${by}:${identity}`,
          rule.max,
          rule.windowSeconds,
        )
        if (!result.allowed) {
          c.header('retry-after', String(result.retryAfterSeconds))
          throw new TooManyRequestsError('Too many requests. Please try again later.')
        }
      }
      await next()
    })
  }
}

export type RateLimitMiddleware = ReturnType<typeof createRateLimitMiddleware>
