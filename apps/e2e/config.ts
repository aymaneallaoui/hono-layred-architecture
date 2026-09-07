import { fileURLToPath } from 'node:url'

import type { SeedConfig } from 'api/testing/e2e-seed'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true })

export const WEB_URL = process.env.E2E_WEB_URL ?? 'http://localhost:5199'
export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3199'

export const seedConfig = (): SeedConfig => {
  const databaseUrl = process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL
  const authSecret = process.env.BETTER_AUTH_SECRET
  if (!databaseUrl || !authSecret) {
    throw new Error('DATABASE_URL and BETTER_AUTH_SECRET are required for e2e seeding')
  }
  return { apiUrl: API_URL, webOrigin: WEB_URL, databaseUrl, authSecret }
}
