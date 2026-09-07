import { createMiddleware } from 'hono/factory'

import type { AppEnv } from '@/http/env'
import { childLogger } from '@/infra/logger'
import { requestIp } from '@/utils/client-ip'

const SLOW_MS = 500

const log = childLogger('Http')

export const requestLogger = createMiddleware<AppEnv>(async (c, next) => {
  const started = performance.now()
  await next()

  const durationMs = Math.round(performance.now() - started)
  const status = c.res.status
  const entry = {
    requestId: c.get('requestId'),
    method: c.req.method,
    path: c.req.path,
    status,
    durationMs,
    ip: requestIp(c),
  }

  if (status >= 500) log.error(entry, 'request failed')
  else if (status >= 400) log.warn(entry, 'request rejected')
  else if (durationMs >= SLOW_MS) log.warn(entry, 'slow request')
  else log.info(entry, 'request')
})
