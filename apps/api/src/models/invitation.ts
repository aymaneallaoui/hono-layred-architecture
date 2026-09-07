import { z } from '@hono/zod-openapi'

import { INVITABLE_ROLES, type InvitableRole } from '@/models/auth'
import type { InvitationId, OrganizationId, UserId } from '@/models/ids'
import { timestamp, uuid } from '@/models/primitives'

export interface Invitation {
  id: InvitationId
  organizationId: OrganizationId
  email: string
  role: InvitableRole
  invitedBy: UserId | null
  expiresAt: Date
  acceptedAt: Date | null
  createdAt: Date
}

export const pendingInvitationSchema = z
  .object({
    id: uuid,
    email: z.string(),
    role: z.enum(INVITABLE_ROLES),
    expiresAt: timestamp,
    createdAt: timestamp,
  })
  .openapi('PendingInvitation')

export const pendingInvitationList = z.array(pendingInvitationSchema)

export const createInvitationBody = z
  .object({
    email: z.email().max(254),
    role: z.enum(INVITABLE_ROLES),
  })
  .openapi('CreateInvitationInput')

export const invitationParams = z.object({ id: uuid })
export const invitationTokenParams = z.object({ token: z.string().min(16).max(128) })

export const invitationPreviewSchema = z
  .object({
    organizationName: z.string(),
    inviterName: z.string().nullable(),
    email: z.string(),
    role: z.enum(INVITABLE_ROLES),
    expiresAt: timestamp,
  })
  .openapi('InvitationPreview')

export type PendingInvitation = Omit<z.infer<typeof pendingInvitationSchema>, 'id'> & {
  id: InvitationId
}
export type CreateInvitationInput = z.infer<typeof createInvitationBody>
export type InvitationPreview = z.infer<typeof invitationPreviewSchema>
