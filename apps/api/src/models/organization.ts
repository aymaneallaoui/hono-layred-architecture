import { z } from '@hono/zod-openapi'

import { ROLES } from '@/models/auth'
import type { OrganizationId, UserId } from '@/models/ids'
import { timestamp, uuid } from '@/models/primitives'

export const organizationSchema = z
  .object({
    id: uuid,
    name: z.string(),
    slug: z.string(),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  .openapi('Organization')

export const updateOrganizationBody = z
  .object({ name: z.string().min(1).max(200) })
  .openapi('UpdateOrganizationInput')

export const memberSchema = z
  .object({
    userId: uuid,
    email: z.string(),
    name: z.string(),
    role: z.enum(ROLES),
    joinedAt: timestamp,
  })
  .openapi('Member')

export const memberList = z.array(memberSchema)
export const memberParams = z.object({ userId: uuid })
export const updateMemberBody = z.object({ role: z.enum(ROLES) }).openapi('UpdateMemberInput')

export type Organization = Omit<z.infer<typeof organizationSchema>, 'id'> & { id: OrganizationId }
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationBody>
export type Member = Omit<z.infer<typeof memberSchema>, 'userId'> & { userId: UserId }
