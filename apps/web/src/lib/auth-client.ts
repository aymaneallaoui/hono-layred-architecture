import { createAuthClient } from 'better-auth/react'

import { apiUrl } from '@/env'
import { ApiError } from '@/lib/errors'

export const authClient = createAuthClient({
  baseURL: apiUrl,
  basePath: '/api/auth',
  fetchOptions: { credentials: 'include' },
})

interface AuthClientError {
  message?: string
  code?: string
  status?: number
}

export function authError(error: AuthClientError | null | undefined, fallback: string): ApiError {
  return new ApiError(error?.status ?? 500, {
    error: { code: error?.code ?? 'UNAUTHORIZED', message: error?.message || fallback },
  })
}
