import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

const bool = z
  .enum(['true', 'false'])
  .transform((v) => v === 'true')
  .optional()

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional(),
    PORT: z.coerce.number().int().positive().default(3001),
    APP_NAME: z.string().default('Hono Starter'),
    API_URL: z.string().url().default('http://localhost:3001'),
    WEB_URL: z.string().url().default('http://localhost:5173'),
    CORS_ORIGINS: z.string().optional(),
    WEB_DIST_DIR: z.string().optional(),
    MIGRATE_ON_BOOT: bool,

    DATABASE_URL: z.string().url(),
    DB_POOL_MAX: z.coerce.number().int().positive().default(20),
    DB_IDLE_TIMEOUT_MS: z.coerce.number().int().nonnegative().default(30_000),
    DB_CONNECTION_TIMEOUT_MS: z.coerce.number().int().nonnegative().default(10_000),
    DB_STATEMENT_TIMEOUT_MS: z.coerce.number().int().nonnegative().default(15_000),

    BETTER_AUTH_SECRET: z.string().min(32),
    EMAIL_VERIFICATION_TTL_HOURS: z.coerce.number().int().positive().default(24),
    PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().default(60),
    INVITATION_TTL_DAYS: z.coerce.number().int().positive().default(7),

    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().default('Hono Starter <onboarding@resend.dev>'),

    REDIS_URL: z.string().url().optional(),
    REDIS_TLS: bool,
    TRUSTED_PROXY_HOPS: z.coerce.number().int().nonnegative().default(1),
    RATE_LIMIT_AUTH_MAX: z.coerce.number().int().positive().default(10),
    RATE_LIMIT_AUTH_WINDOW_SEC: z.coerce.number().int().positive().default(900),
    RATE_LIMIT_INVITE_MAX: z.coerce.number().int().positive().default(20),
    RATE_LIMIT_INVITE_WINDOW_SEC: z.coerce.number().int().positive().default(3600),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
})

export const isProd = env.NODE_ENV === 'production'
export const isTest = env.NODE_ENV === 'test'

export function toOrigin(value: string): string {
  return new URL(value).origin
}

export const corsOrigins = (env.CORS_ORIGINS ?? env.WEB_URL)
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean)
  .map((entry) => {
    try {
      return toOrigin(entry)
    } catch {
      throw new Error(`CORS_ORIGINS entry "${entry}" is not a valid absolute URL.`)
    }
  })
