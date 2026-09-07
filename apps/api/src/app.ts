import { Scalar } from '@scalar/hono-api-reference'
import { bodyLimit } from 'hono/body-limit'
import { cors } from 'hono/cors'
import { requestId } from 'hono/request-id'
import { timing } from 'hono/timing'

import type { Container } from '@/container'
import { SESSION_SCHEME } from '@/http/openapi'
import { createRouter } from '@/http/router'
import { corsOrigins, env, isProd } from '@/infra/env'
import { createAuthMiddleware } from '@/middleware/auth'
import { notFound, onError } from '@/middleware/errors'
import { requestLogger } from '@/middleware/logger'
import { createRateLimitMiddleware } from '@/middleware/rate-limit'
import { securityHeaders } from '@/middleware/security-headers'
import { createSpa, resolveWebDist } from '@/middleware/spa'
import { AppError } from '@/models/errors'
import { accountRoutes } from '@/routes/account'
import { authRoutes } from '@/routes/auth'
import type { RouteDeps } from '@/routes/deps'
import { invitationRoutes } from '@/routes/invitation'
import { notificationRoutes } from '@/routes/notification'
import { organizationRoutes } from '@/routes/organization'
import { projectRoutes } from '@/routes/project'
import { systemRoutes } from '@/routes/system'

const BODY_LIMIT_BYTES = 1024 * 1024
const SESSION_COOKIE = 'better-auth.session_token'

export interface AppOptions {
  webDist?: string
}

export function createApp(container: Container, options: AppOptions = {}) {
  const deps: RouteDeps = {
    container,
    requireAuth: createAuthMiddleware(container),
    rateLimit: createRateLimitMiddleware(container.rateLimiter),
  }
  const webDist = resolveWebDist(options.webDist ?? env.WEB_DIST_DIR)
  const spa = webDist ? createSpa(webDist) : null

  const app = createRouter()
  app.onError(onError)
  app.notFound(notFound)
  app.use(
    requestId(),
    timing(),
    requestLogger,
    securityHeaders,
    cors({
      origin: corsOrigins,
      credentials: true,
      exposeHeaders: ['retry-after', 'x-request-id', 'server-timing'],
    }),
    bodyLimit({
      maxSize: BODY_LIMIT_BYTES,
      onError: () => {
        throw new AppError('PAYLOAD_TOO_LARGE')
      },
    }),
  )
  if (spa) app.use(spa.assets)

  app.on(['GET', 'POST'], ['/api/auth', '/api/auth/*'], (c) => container.auth.handler(c.req.raw))

  const routes = app
    .route('/', systemRoutes(deps))
    .route('/auth', authRoutes(deps))
    .route('/account', accountRoutes(deps))
    .route('/organizations/current', organizationRoutes(deps))
    .route('/invitations', invitationRoutes(deps))
    .route('/projects', projectRoutes(deps))
    .route('/notifications', notificationRoutes(deps))

  if (!isProd) {
    app.openAPIRegistry.registerComponent('securitySchemes', SESSION_SCHEME, {
      type: 'apiKey',
      in: 'cookie',
      name: SESSION_COOKIE,
    })
    app.doc31('/openapi.json', {
      openapi: '3.1.0',
      info: {
        title: `${env.APP_NAME} API`,
        version: '1.0.0',
        description:
          'Session-authenticated API. Sign-in, sign-out, verification and password reset are served by Better Auth under /api/auth.',
      },
      tags: [
        { name: 'System', description: 'Liveness and service metadata.' },
        { name: 'Auth', description: 'Registration, the current session, and org switching.' },
        { name: 'Account', description: 'The signed-in user profile.' },
        { name: 'Organization', description: 'Workspace settings, members, and invitations.' },
        { name: 'Projects', description: 'Sample org-scoped resource with search and paging.' },
        { name: 'Notifications', description: 'In-app notifications with email delivery.' },
      ],
    })
    app.get('/openapi', Scalar({ url: '/openapi.json', pageTitle: `${env.APP_NAME} API` }))
  }

  if (spa) app.use(spa.fallback)

  return routes
}

export type App = ReturnType<typeof createApp>
export type AppType = App
