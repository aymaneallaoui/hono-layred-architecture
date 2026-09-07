import { createRoute } from '@hono/zod-openapi'

import { json } from '@/http/openapi'
import { createRouter } from '@/http/router'
import { env } from '@/infra/env'
import { healthReportSchema, serviceInfoSchema } from '@/models/health'
import type { RouteDeps } from '@/routes/deps'

const TAGS = ['System']

export const systemRoutes = ({ container }: RouteDeps) =>
  createRouter()
    .openapi(
      createRoute({
        method: 'get',
        path: '/api',
        tags: TAGS,
        summary: 'Service metadata',
        responses: { 200: json(serviceInfoSchema, 'Service name and status') },
      }),
      (c) => c.json({ status: 'ok' as const, service: env.APP_NAME }, 200),
    )
    .openapi(
      createRoute({
        method: 'get',
        path: '/health',
        tags: TAGS,
        summary: 'Liveness and dependency probes',
        responses: {
          200: json(healthReportSchema, 'Every dependency answers, or only mail is degraded'),
          503: json(healthReportSchema, 'The database is unreachable'),
        },
      }),
      async (c) => {
        const report = await container.healthService.check()
        if (report.status === 'unhealthy') return c.json(report, 503)
        return c.json(report, 200)
      },
    )
