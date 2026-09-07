import { z } from '@hono/zod-openapi'

export const updateProfileBody = z
  .object({ name: z.string().min(1).max(200) })
  .openapi('UpdateProfileInput')

export type UpdateProfileInput = z.infer<typeof updateProfileBody>
