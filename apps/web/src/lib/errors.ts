export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly value: unknown,
    readonly retryAfterSeconds: number | null = null,
  ) {
    super(messageOf(value) ?? `Request failed (${status})`)
    this.name = 'ApiError'
  }

  get code(): string | null {
    const err = (this.value as { error?: { code?: string } } | null)?.error
    return err?.code ?? null
  }
}

function messageOf(value: unknown): string | null {
  if (value && typeof value === 'object' && 'error' in value) {
    const err = (value as { error?: { message?: string } }).error
    if (err?.message) return err.message
  }
  return null
}

export function describeError(error: unknown, fallback = 'Something went wrong.'): string {
  if (error instanceof ApiError) {
    if (error.status === 429 && error.retryAfterSeconds) {
      return `${error.message} Try again in ${error.retryAfterSeconds}s.`
    }
    return error.message
  }
  return error instanceof Error && error.message ? error.message : fallback
}
