import type { AppType } from 'api'
import { hc, type InferResponseType } from 'hono/client'

import { apiUrl } from '@/env'

export const api = hc<AppType>(apiUrl, { init: { credentials: 'include' } })

export type Session = InferResponseType<typeof api.auth.me.$get, 200>
export type Project = InferResponseType<typeof api.projects.$get, 200>['data'][number]
export type Member = InferResponseType<typeof api.organizations.current.members.$get, 200>[number]
export type PendingInvitation = InferResponseType<
  typeof api.organizations.current.invitations.$get,
  200
>[number]
export type Notification = InferResponseType<typeof api.notifications.$get, 200>['data'][number]
