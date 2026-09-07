import { z } from '@hono/zod-openapi'

import { json } from '@/http/openapi'

export const errorSchema = z
  .object({
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.unknown().optional(),
    }),
  })
  .openapi('Error')

export type ErrorResponse = z.infer<typeof errorSchema>

const error = (description: string) => json(errorSchema, description)

export const errorResponses = {
  server: { 500: error('Unexpected server error') },
  base: { 401: error('Not signed in'), 500: error('Unexpected server error') },
  validation: { 422: error('The request failed validation') },
  notFound: { 404: error('Resource not found') },
  badRequest: { 400: error('Malformed request') },
  forbidden: { 403: error('Not allowed for this role or unverified email') },
  conflict: { 409: error('Conflicts with the current state') },
  gone: { 410: error('No longer available') },
  rateLimited: { 429: error('Too many requests') },
  mail: { 502: error('Email could not be delivered') },
} as const
