import pino from 'pino'

import { env } from '@/infra/env'

export interface Logger {
  debug(obj: Record<string, unknown>, msg: string): void
  debug(msg: string): void
  info(obj: Record<string, unknown>, msg: string): void
  info(msg: string): void
  warn(obj: Record<string, unknown>, msg: string): void
  warn(msg: string): void
  error(obj: Record<string, unknown>, msg: string): void
  error(msg: string): void
  child(bindings: Record<string, unknown>): Logger
}

export const logLevel = env.LOG_LEVEL ?? (env.NODE_ENV === 'production' ? 'info' : 'debug')

const root: Logger = pino({
  level: logLevel,
  base: { service: 'api' },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'headers.authorization',
      'headers.cookie',
      '*.password',
      '*.token',
      'body.password',
      'body.token',
    ],
    censor: '[redacted]',
  },
})

export function childLogger(component: string): Logger {
  return root.child({ component })
}

export { root as logger }
