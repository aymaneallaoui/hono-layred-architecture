import type { RateLimiter, RateLimitResult } from '@/infra/rate-limit/rate-limiter'

export class MemoryRateLimiter implements RateLimiter {
  private readonly hits = new Map<string, number[]>()

  constructor(private readonly now: () => number = Date.now) {}

  async consume(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const nowMs = this.now()
    const windowMs = windowSeconds * 1000
    const timestamps = (this.hits.get(key) ?? []).filter((t) => t > nowMs - windowMs)

    if (timestamps.length < limit) {
      timestamps.push(nowMs)
      this.hits.set(key, timestamps)
      this.pruneIfLarge(nowMs)
      return { allowed: true, remaining: limit - timestamps.length, retryAfterSeconds: 0 }
    }

    this.hits.set(key, timestamps)
    const oldest = timestamps[0] ?? nowMs
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - nowMs) / 1000)),
    }
  }

  reset(): void {
    this.hits.clear()
  }

  private pruneIfLarge(nowMs: number): void {
    if (this.hits.size < 10_000) return
    const stale = nowMs - 3_600_000
    for (const [key, timestamps] of this.hits) {
      if (timestamps.length === 0 || timestamps[timestamps.length - 1]! < stale) {
        this.hits.delete(key)
      }
    }
  }
}
