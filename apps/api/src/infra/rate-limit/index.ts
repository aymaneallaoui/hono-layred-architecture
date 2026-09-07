import { RedisClient } from 'bun'

import { env, isProd } from '@/infra/env'
import { childLogger } from '@/infra/logger'
import { MemoryRateLimiter } from '@/infra/rate-limit/memory-rate-limiter'
import type { RateLimiter } from '@/infra/rate-limit/rate-limiter'
import { RedisRateLimiter } from '@/infra/rate-limit/redis-rate-limiter'

export { MemoryRateLimiter } from '@/infra/rate-limit/memory-rate-limiter'
export type { RateLimiter, RateLimitResult } from '@/infra/rate-limit/rate-limiter'

export function selectRateLimiter(): RateLimiter {
  const logger = childLogger('RateLimiter')
  if (env.REDIS_URL) {
    const tls = env.REDIS_TLS ?? env.REDIS_URL.startsWith('rediss://')
    return new RedisRateLimiter(new RedisClient(env.REDIS_URL, { tls }), logger)
  }
  if (isProd) {
    logger.warn('REDIS_URL is not set; the in-memory limiter does not coordinate across instances')
  }
  return new MemoryRateLimiter()
}
