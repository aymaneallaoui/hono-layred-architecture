import { z } from '@hono/zod-openapi'

export const componentStatus = z.enum(['ok', 'down'])

export const healthReportSchema = z
  .object({
    status: z.enum(['ok', 'degraded', 'unhealthy']),
    checks: z.object({ database: componentStatus, mail: componentStatus }),
  })
  .openapi('HealthReport')

export const serviceInfoSchema = z
  .object({ status: z.literal('ok'), service: z.string() })
  .openapi('ServiceInfo')

export type HealthReport = z.infer<typeof healthReportSchema>
export type ComponentStatus = z.infer<typeof componentStatus>
