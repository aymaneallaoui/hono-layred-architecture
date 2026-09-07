import type { ErrorHandler, NotFoundHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'

import { ERROR_CATALOG, type ErrorCode, HTTP_STATUS_TO_APP_CODE } from '@/error-catalog'
import type { AppEnv } from '@/http/env'
import { childLogger } from '@/infra/logger'
import type { ErrorResponse } from '@/models/error'
import { AppError } from '@/models/errors'

const log = childLogger('Errors')

export function errorBody(code: ErrorCode, message: string, details?: unknown): ErrorResponse {
  return { error: { code, message, ...(details !== undefined ? { details } : {}) } }
}

export const onError: ErrorHandler<AppEnv> = (error, c) => {
  let code: ErrorCode
  let message: string
  let details: unknown

  if (error instanceof AppError) {
    code = error.code
    message = error.message
    details = error.details
  } else if (error instanceof HTTPException) {
    code =
      HTTP_STATUS_TO_APP_CODE[error.status] ?? (error.status >= 500 ? 'INTERNAL' : 'BAD_REQUEST')
    message = ERROR_CATALOG[code].message
  } else {
    code = 'INTERNAL'
    message = ERROR_CATALOG.INTERNAL.message
  }

  const status = ERROR_CATALOG[code].status
  if (status >= 500) {
    log.error(
      { err: error, requestId: c.get('requestId'), method: c.req.method, url: c.req.url },
      'unhandled error',
    )
  }

  return c.json(errorBody(code, message, details), status)
}

export const notFound: NotFoundHandler<AppEnv> = (c) =>
  c.json(errorBody('ROUTE_NOT_FOUND', ERROR_CATALOG.ROUTE_NOT_FOUND.message), 404)
