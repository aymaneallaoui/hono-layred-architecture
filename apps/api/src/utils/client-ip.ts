import type { Context } from 'hono'
import { getConnInfo } from 'hono/bun'

import { env } from '@/infra/env'

export function clientIp(
  peer: string | null,
  forwardedFor: string | undefined,
  trustedHops: number,
): string {
  if (trustedHops > 0) {
    const parts = forwardedFor
      ?.split(',')
      .map((part) => part.trim())
      .filter(Boolean)
    if (parts && parts.length >= trustedHops) {
      return parts[parts.length - trustedHops] ?? peer ?? 'unknown'
    }
  }
  return peer ?? 'unknown'
}

function peerAddress(c: Context): string | null {
  try {
    return getConnInfo(c).remote.address ?? null
  } catch {
    return null
  }
}

export function requestIp(c: Context): string {
  return clientIp(peerAddress(c), c.req.header('x-forwarded-for'), env.TRUSTED_PROXY_HOPS)
}
