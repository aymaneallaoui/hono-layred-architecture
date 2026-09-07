import { OpenAPIHono } from '@hono/zod-openapi'

import type { AppEnv } from '@/http/env'
import { AppError } from '@/models/errors'

export const createRouter = () =>
  new OpenAPIHono<AppEnv>({
    defaultHook: (result) => {
      if (result.success) return
      throw new AppError(
        'UNPROCESSABLE',
        undefined,
        result.error.issues.map((issue) => ({
          path: `/${issue.path.map(String).join('/')}`,
          message: issue.message,
        })),
      )
    },
  })

export type Router = ReturnType<typeof createRouter>
