import { randomBytes } from 'node:crypto'

import type { Logger } from '@/infra/logger'
import type { Account, MembershipContext } from '@/models/auth'
import { ForbiddenError, UnauthorizedError } from '@/models/errors'
import { asId, type OrganizationId, type UserId } from '@/models/ids'
import type { IIdentityRepository } from '@/repositories/identity/identity.repository.interface'
import type {
  IAuthService,
  ResolvedSession,
  SessionContext,
} from '@/services/identity/auth.service.interface'
import { BaseService } from '@/services/shared/base.service'
import { defaultOrganizationName, slugify } from '@/utils/text'

export class AuthService extends BaseService implements IAuthService {
  constructor(
    private readonly identity: IIdentityRepository,
    logger: Logger,
  ) {
    super(logger)
  }

  async resolveAccount(session: ResolvedSession): Promise<Account> {
    const userId = asId<UserId>(session.user.id)
    let membership = session.activeOrganizationId
      ? await this.identity.findMembership(
          userId,
          asId<OrganizationId>(session.activeOrganizationId),
        )
      : await this.identity.findPrimaryMembership(userId)

    if (!membership && !session.activeOrganizationId) {
      membership = await this.ensureTenant(userId, session.user.name, session.user.email)
    }
    if (!membership) {
      throw new UnauthorizedError('Your membership in this organization is no longer active.')
    }

    return {
      userId,
      email: session.user.email,
      name: session.user.name,
      emailVerified: session.user.emailVerified,
      organizationId: membership.id,
      role: membership.role,
      sessionId: session.sessionId,
    }
  }

  async ensureTenant(
    userId: UserId,
    name: string,
    email: string,
    organizationName?: string,
  ): Promise<MembershipContext | null> {
    const existing = await this.identity.findPrimaryMembership(userId)
    if (existing) return existing

    const orgName = organizationName?.trim() || defaultOrganizationName(name, email)
    try {
      return await this.identity.seedTenant({
        userId,
        organizationName: orgName,
        slug: `${slugify(orgName)}-${randomBytes(4).toString('hex')}`,
      })
    } catch (error) {
      const raced = await this.identity.findPrimaryMembership(userId)
      if (raced) return raced
      this.logger.error({ err: error, userId }, 'tenant seeding failed')
      throw error
    }
  }

  async completeRegistration(userId: UserId, organizationName?: string): Promise<SessionContext> {
    const user = this.assertFound(await this.identity.findUserById(userId), 'User', userId)
    const organization = await this.ensureTenant(userId, user.name, user.email, organizationName)
    if (!organization) throw new UnauthorizedError('Account not found.')
    return { user, organization }
  }

  async me(account: Account): Promise<SessionContext> {
    const [user, organization] = await Promise.all([
      this.identity.findUserById(account.userId),
      this.identity.findMembership(account.userId, account.organizationId),
    ])
    if (!user || !organization) throw new UnauthorizedError('Account not found.')
    return { user, organization }
  }

  listMemberships(userId: UserId): Promise<MembershipContext[]> {
    return this.identity.listMemberships(userId)
  }

  async switchOrganization(
    userId: UserId,
    organizationId: OrganizationId,
    sessionId: string,
  ): Promise<SessionContext> {
    const organization = await this.identity.findMembership(userId, organizationId)
    if (!organization) throw new ForbiddenError('You are not a member of that organization.')
    await this.identity.setActiveOrganization(sessionId, organizationId)
    const user = this.assertFound(await this.identity.findUserById(userId), 'User', userId)
    return { user, organization }
  }
}
