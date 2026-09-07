import { secureHeaders } from 'hono/secure-headers'

import { env } from '@/infra/env'

const HSTS_VALUE = 'max-age=63072000; includeSubDomains; preload'

export function strictTransportSecurity(nodeEnv: string): string | undefined {
  return nodeEnv === 'production' ? HSTS_VALUE : undefined
}

export const securityHeaders = secureHeaders({
  xFrameOptions: 'DENY',
  referrerPolicy: 'no-referrer',
  strictTransportSecurity: strictTransportSecurity(env.NODE_ENV) ?? false,
})
