import { z } from '@hono/zod-openapi'

export const uuid = z.uuid()

export const timestamp = z.date().openapi({ type: 'string', format: 'date-time' })
