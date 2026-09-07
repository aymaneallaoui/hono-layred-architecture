import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '@/lib/api'
import { request } from '@/lib/request'

const KEY = ['notifications'] as const

export const notificationsQuery = queryOptions({
  queryKey: [...KEY, 'list'],
  queryFn: () => request(() => api.notifications.$get({ query: { limit: '50' } })),
})

export const unreadCountQuery = queryOptions({
  queryKey: [...KEY, 'unread'],
  queryFn: () => request(() => api.notifications['unread-count'].$get()),
  refetchInterval: 60_000,
})

export function useMarkRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      request(() => api.notifications[':id'].read.$post({ param: { id } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useMarkAllRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => request(() => api.notifications['read-all'].$post()),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
