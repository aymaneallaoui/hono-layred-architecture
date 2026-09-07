import { z } from '@hono/zod-openapi'

import { uuid } from '@/models/primitives'

export const BATCH_MAX_IDS = 500

export const batchIds = () => z.array(uuid).min(1).max(BATCH_MAX_IDS)

export const batchCountResult = <T extends z.ZodRawShape>(applied: T) =>
  z.object({ requested: z.int(), ...applied })
