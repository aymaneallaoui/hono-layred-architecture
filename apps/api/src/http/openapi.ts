import type { z } from '@hono/zod-openapi'

export const json = <S extends z.ZodType>(schema: S, description: string) => ({
  description,
  content: { 'application/json': { schema } },
})

export const jsonBody = <S extends z.ZodType>(schema: S) => ({
  required: true,
  content: { 'application/json': { schema } },
})

export const noContent = (description = 'Done') => ({ description })

export const SESSION_SCHEME = 'session'

export const sessionSecurity = [{ [SESSION_SCHEME]: [] }]
