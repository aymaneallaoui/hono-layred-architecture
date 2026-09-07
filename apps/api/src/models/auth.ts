import { z } from '@hono/zod-openapi'

import type { OrganizationId, UserId } from '@/models/ids'
import { timestamp, uuid } from '@/models/primitives'

export const ROLES = ['owner', 'admin', 'member'] as const
export type Role = (typeof ROLES)[number]
export const INVITABLE_ROLES = ['admin', 'member'] as const
export type InvitableRole = (typeof INVITABLE_ROLES)[number]

export interface Account {
  userId: UserId
  email: string
  name: string
  emailVerified: boolean
  organizationId: OrganizationId
  role: Role
  sessionId: string
}

export interface User {
  id: UserId
  email: string
  name: string
  emailVerified: boolean
  createdAt: Date
}

export interface MembershipContext {
  id: OrganizationId
  name: string
  slug: string
  role: Role
}

export const userSchema = z
  .object({
    id: uuid,
    email: z.string(),
    name: z.string(),
    emailVerified: z.boolean(),
    createdAt: timestamp,
  })
  .openapi('User')

export const membershipContextSchema = z
  .object({
    id: uuid,
    name: z.string(),
    slug: z.string(),
    role: z.enum(ROLES),
  })
  .openapi('MembershipContext')

export const registerBody = z
  .object({
    email: z.email().max(254),
    password: z.string().min(8).max(128),
    name: z.string().min(1).max(200),
    organizationName: z.string().min(1).max(200).optional(),
  })
  .openapi('RegisterInput')

export const sessionResponse = z
  .object({
    user: userSchema,
    organization: membershipContextSchema,
  })
  .openapi('Session')

export const membershipsResponse = z.array(membershipContextSchema)

export const switchOrgBody = z.object({ organizationId: uuid }).openapi('SwitchOrganizationInput')

export type RegisterInput = z.infer<typeof registerBody>
export type SessionResponse = z.infer<typeof sessionResponse>
