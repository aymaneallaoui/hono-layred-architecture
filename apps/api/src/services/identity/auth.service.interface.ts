import type { Account, MembershipContext, User } from '@/models/auth'
import type { OrganizationId, UserId } from '@/models/ids'

export interface ResolvedSession {
  sessionId: string
  activeOrganizationId: string | null
  user: { id: string; email: string; name: string; emailVerified: boolean }
}

export interface SessionContext {
  user: User
  organization: MembershipContext
}

export interface IAuthService {
  resolveAccount(session: ResolvedSession): Promise<Account>
  ensureTenant(
    userId: UserId,
    name: string,
    email: string,
    organizationName?: string,
  ): Promise<MembershipContext | null>
  completeRegistration(userId: UserId, organizationName?: string): Promise<SessionContext>
  me(account: Account): Promise<SessionContext>
  listMemberships(userId: UserId): Promise<MembershipContext[]>
  switchOrganization(
    userId: UserId,
    organizationId: OrganizationId,
    sessionId: string,
  ): Promise<SessionContext>
}
