import { existsSync } from 'node:fs'
import path from 'node:path'

import type { MiddlewareHandler } from 'hono'
import { serveStatic } from 'hono/bun'
import { createMiddleware } from 'hono/factory'

const IMMUTABLE = 'public, max-age=31536000, immutable'
const DAILY = 'public, max-age=86400'
const NO_CACHE = 'no-cache'

export function resolveWebDist(dir: string | undefined): string | null {
  if (!dir) return null
  const absolute = path.resolve(dir)
  return existsSync(path.join(absolute, 'index.html')) ? absolute : null
}

function cacheControlFor(filePath: string): string {
  if (filePath.endsWith('index.html')) return NO_CACHE
  return filePath.includes('/assets/') ? IMMUTABLE : DAILY
}

export interface Spa {
  assets: MiddlewareHandler
  fallback: MiddlewareHandler
}

export function createSpa(dist: string): Spa {
  const index = Bun.file(path.join(dist, 'index.html'))
  const files = serveStatic({
    root: dist,
    onFound: (filePath, c) => c.header('cache-control', cacheControlFor(filePath)),
  })

  const assets = createMiddleware((c, next) => (c.req.method === 'GET' ? files(c, next) : next()))

  const fallback = createMiddleware(async (c, next) => {
    const wantsHtml = (c.req.header('accept') ?? '').includes('text/html')
    if (c.req.method !== 'GET' || !wantsHtml) return next()
    return c.html(await index.text(), 200, { 'cache-control': NO_CACHE })
  })

  return { assets, fallback }
}
