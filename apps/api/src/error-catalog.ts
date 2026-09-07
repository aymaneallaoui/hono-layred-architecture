import type { ContentfulStatusCode } from 'hono/utils/http-status'

export const ERROR_CATALOG = {
  BAD_REQUEST: { status: 400, message: 'The request was malformed.' },
  UNAUTHORIZED: { status: 401, message: 'Authentication is required.' },
  FORBIDDEN: { status: 403, message: 'You do not have access to this resource.' },
  EMAIL_NOT_VERIFIED: { status: 403, message: 'Please verify your email address first.' },
  ENTITY_NOT_FOUND: { status: 404, message: 'The requested resource was not found.' },
  ROUTE_NOT_FOUND: { status: 404, message: 'Route not found.' },
  CONFLICT: { status: 409, message: 'The request conflicts with the current state.' },
  SOLE_OWNER: {
    status: 409,
    message: 'An organization needs at least one owner. Transfer ownership first.',
  },
  INVITATION_EXPIRED: { status: 410, message: 'This invitation has expired.' },
  PAYLOAD_TOO_LARGE: { status: 413, message: 'The request body is too large.' },
  UNSUPPORTED_MEDIA_TYPE: { status: 415, message: 'Send the request body as JSON.' },
  UNPROCESSABLE: { status: 422, message: 'The request failed validation.' },
  TOO_MANY_REQUESTS: { status: 429, message: 'Too many requests.' },
  INTERNAL: { status: 500, message: 'An unexpected error occurred.' },
  MAIL_DELIVERY_FAILED: {
    status: 502,
    message: 'Could not send the email right now. Please try again in a moment.',
  },
} as const satisfies Record<string, { status: ContentfulStatusCode; message: string }>

export type ErrorCode = keyof typeof ERROR_CATALOG

export const HTTP_STATUS_TO_APP_CODE: Partial<Record<number, ErrorCode>> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'ROUTE_NOT_FOUND',
  413: 'PAYLOAD_TOO_LARGE',
  415: 'UNSUPPORTED_MEDIA_TYPE',
  422: 'UNPROCESSABLE',
  429: 'TOO_MANY_REQUESTS',
}
