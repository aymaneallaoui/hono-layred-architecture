import { z } from '@hono/zod-openapi'

import { uuid } from '@/models/primitives'

export const pageQuery = z.object({
  page: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
})

export const page = <T extends z.ZodType>(item: T) =>
  z.object({ data: z.array(item), total: z.int() })

export const cursorQuery = z.object({
  cursor: uuid.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

export const cursorPage = <T extends z.ZodType>(item: T) =>
  z.object({ data: z.array(item), nextCursor: z.string().nullable() })

export interface PageParams {
  page: number
  limit: number
}

export interface Page<T> {
  data: T[]
  total: number
}

export interface CursorPage<T> {
  data: T[]
  nextCursor: string | null
}

export const offsetOf = (params: PageParams): number => params.page * params.limit
