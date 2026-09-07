import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '@/lib/api'
import { request } from '@/lib/request'

export const membersQuery = queryOptions({
  queryKey: ['members'],
  queryFn: () => request(() => api.organizations.current.members.$get()),
})

export const invitationsQuery = queryOptions({
  queryKey: ['invitations'],
  queryFn: () => request(() => api.organizations.current.invitations.$get()),
})

export function useInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { email: string; role: 'admin' | 'member' }) =>
      request(() => api.organizations.current.invitations.$post({ json: input })),
    onSuccess: () => qc.invalidateQueries({ queryKey: invitationsQuery.queryKey }),
  })
}

export function useRevokeInvitation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      request(() => api.organizations.current.invitations[':id'].$delete({ param: { id } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: invitationsQuery.queryKey }),
  })
}

export function useRemoveMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) =>
      request(() => api.organizations.current.members[':userId'].$delete({ param: { userId } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: membersQuery.queryKey }),
  })
}

export function useAcceptInvitation() {
  return useMutation({
    mutationFn: (token: string) =>
      request(() => api.invitations[':token'].accept.$post({ param: { token } })),
  })
}

export const invitationPreviewQuery = (token: string) =>
  queryOptions({
    queryKey: ['invitation-preview', token],
    queryFn: () => request(() => api.invitations[':token'].$get({ param: { token } })),
    retry: false,
  })
