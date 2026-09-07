import type { MembershipContext, User } from '@/models/auth'
import type { OrganizationId, UserId } from '@/models/ids'

export interface SeedTenantInput {
  userId: UserId
  organizationName: string
  slug: string
}

export interface IIdentityRepository {
  findUserById(id: UserId): Promise<User | null>
  findUserByEmail(email: string): Promise<User | null>
  updateUser(id: UserId, input: { name: string }): Promise<User | null>
  findMembership(userId: UserId, organizationId: OrganizationId): Promise<MembershipContext | null>
  findPrimaryMembership(userId: UserId): Promise<MembershipContext | null>
  listMemberships(userId: UserId): Promise<MembershipContext[]>
  setActiveOrganization(sessionId: string, organizationId: OrganizationId): Promise<void>
  /** Null when the user already claimed their one-time seed (membership since revoked). */
  seedTenant(input: SeedTenantInput): Promise<MembershipContext | null>
}
