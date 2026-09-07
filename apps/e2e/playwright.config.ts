import { fileURLToPath } from 'node:url'

import { defineConfig, devices } from '@playwright/test'

import { API_URL, WEB_URL } from './config'

const root = fileURLToPath(new URL('../..', import.meta.url))
const port = (url: string) => new URL(url).port

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? 'html' : 'list',
  expect: { timeout: 10_000 },
  use: {
    baseURL: WEB_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      name: 'api',
      command: 'bun run --filter api dev',
      cwd: root,
      url: `${API_URL}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        PORT: port(API_URL),
        API_URL,
        WEB_URL,
        MIGRATE_ON_BOOT: 'true',
        RATE_LIMIT_AUTH_MAX: '1000',
        RATE_LIMIT_INVITE_MAX: '1000',
        ...(process.env.E2E_DATABASE_URL ? { DATABASE_URL: process.env.E2E_DATABASE_URL } : {}),
      },
    },
    {
      name: 'web',
      command: `bun run --filter web dev -- --port ${port(WEB_URL)} --strictPort`,
      cwd: root,
      url: WEB_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { VITE_API_URL: API_URL },
    },
  ],
})
