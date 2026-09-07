import { ERROR_CATALOG, type ErrorCode } from '@/error-catalog'

export class AppError extends Error {
  readonly code: ErrorCode
  readonly status: number
  readonly details?: unknown

  constructor(code: ErrorCode, message?: string, details?: unknown) {
    super(message ?? ERROR_CATALOG[code].message)
    this.name = new.target.name
    this.code = code
    this.status = ERROR_CATALOG[code].status
    this.details = details
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, id: string) {
    super('ENTITY_NOT_FOUND', `${entity} "${id}" was not found.`)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message?: string) {
    super('UNAUTHORIZED', message)
  }
}

export class ForbiddenError extends AppError {
  constructor(message?: string) {
    super('FORBIDDEN', message)
  }
}

export class EmailNotVerifiedError extends AppError {
  constructor(message?: string) {
    super('EMAIL_NOT_VERIFIED', message)
  }
}

export class ConflictError extends AppError {
  constructor(message?: string, details?: unknown) {
    super('CONFLICT', message, details)
  }
}

export class SoleOwnerError extends AppError {
  constructor(message?: string) {
    super('SOLE_OWNER', message)
  }
}

export class InvitationExpiredError extends AppError {
  constructor(message?: string) {
    super('INVITATION_EXPIRED', message)
  }
}

export class BadRequestError extends AppError {
  constructor(message?: string, details?: unknown) {
    super('BAD_REQUEST', message, details)
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message?: string, details?: unknown) {
    super('TOO_MANY_REQUESTS', message, details)
  }
}

export class MailDeliveryError extends AppError {
  constructor(message?: string) {
    super('MAIL_DELIVERY_FAILED', message)
  }
}
