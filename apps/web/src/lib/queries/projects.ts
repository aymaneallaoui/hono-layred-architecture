import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '@/lib/api'
import { request } from '@/lib/request'

export interface ProjectFilters {
  q?: string
  status?: 'all' | 'active' | 'archived'
  page?: number
}

const KEY = ['projects'] as const
const PAGE_SIZE = 20

export const projectsQuery = (filters: ProjectFilters) =>
  queryOptions({
    queryKey: [...KEY, filters],
    queryFn: () =>
      request(() =>
        api.projects.$get({
          query: {
            q: filters.q || undefined,
            status: filters.status ?? 'active',
            page: String(filters.page ?? 0),
            limit: String(PAGE_SIZE),
          },
        }),
      ),
    placeholderData: keepPreviousData,
  })

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; description?: string }) =>
      request(() => api.projects.$post({ json: input })),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; name?: string; archived?: boolean }) =>
      request(() => api.projects[':id'].$patch({ param: { id }, json: input })),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => request(() => api.projects[':id'].$delete({ param: { id } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
