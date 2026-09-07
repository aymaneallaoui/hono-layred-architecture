import { queryOptions, useQuery } from '@tanstack/react-query'

import { api, type Session } from '@/lib/api'
import { authClient } from '@/lib/auth-client'
import { ApiError } from '@/lib/errors'
import { queryClient } from '@/lib/query'
import { request } from '@/lib/request'

export const sessionQuery = queryOptions({
  queryKey: ['session'],
  queryFn: async (): Promise<Session | null> => {
    try {
      return await request(() => api.auth.me.$get())
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return null
      throw error
    }
  },
  staleTime: 60_000,
})

export function ensureSession(): Promise<Session | null> {
  return queryClient.ensureQueryData(sessionQuery)
}

export function useSession() {
  return useQuery(sessionQuery)
}

export function setSession(session: Session | null): void {
  queryClient.setQueryData(sessionQuery.queryKey, session)
}

export async function refreshSession(): Promise<Session | null> {
  return queryClient.fetchQuery({ ...sessionQuery, staleTime: 0 })
}

export async function signOut(): Promise<void> {
  await authClient.signOut()
  queryClient.clear()
  setSession(null)
}
