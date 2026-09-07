import type { EventBus } from '@/infra/events'
import type { Logger } from '@/infra/logger'
import type { Mailer } from '@/infra/mail'
import { InvitationMapper } from '@/mappers/invitation.mapper'
import type { Account, MembershipContext } from '@/models/auth'
import {
  ConflictError,
  ForbiddenError,
  InvitationExpiredError,
  NotFoundError,
} from '@/models/errors'
import type { InvitationId, OrganizationId } from '@/models/ids'
import type {
  CreateInvitationInput,
  Invitation,
  InvitationPreview,
  PendingInvitation,
} from '@/models/invitation'
import type { UnitOfWork } from '@/repositories'
import type { IIdentityRepository } from '@/repositories/identity/identity.repository.interface'
import type { IInvitationRepository } from '@/repositories/invitation/invitation.repository.interface'
import type { IOrganizationRepository } from '@/repositories/organization/organization.repository.interface'
import type { IInvitationService } from '@/services/invitation/invitation.service.interface'
import { BaseService } from '@/services/shared/base.service'
import { normalizeEmail } from '@/utils/text'
import { generateToken, hashToken } from '@/utils/token'

export interface InvitationConfig {
  webUrl: string
  ttlDays: number
}

export class InvitationService extends BaseService implements IInvitationService {
  constructor(
    private readonly invitations: IInvitationRepository,
    private readonly organizations: IOrganizationRepository,
    private readonly identity: IIdentityRepository,
    private readonly mailer: Mailer,
    private readonly uow: UnitOfWork,
    private readonly events: EventBus,
    private readonly config: InvitationConfig,
    logger: Logger,
  ) {
    super(logger)
  }

  async invite(actor: Account, input: CreateInvitationInput): Promise<PendingInvitation> {
    const email = normalizeEmail(input.email)
    const organization = await this.organizations.findById(actor.organizationId)
    if (!organization) throw new NotFoundError('Organization', actor.organizationId)

    const existingUser = await this.identity.findUserByEmail(email)
    if (
      existingUser &&
      (await this.organizations.findMember(actor.organizationId, existingUser.id))
    ) {
      throw new ConflictError('That person is already a member.')
    }
    if (await this.invitations.findPendingByEmail(actor.organizationId, email)) {
      throw new ConflictError('An invitation for that address is already pending.')
    }

    const token = generateToken()
    const invitation = await this.invitations.create({
      organizationId: actor.organizationId,
      email,
      role: input.role,
      tokenHash: hashToken(token),
      invitedBy: actor.userId,
      expiresAt: new Date(Date.now() + this.config.ttlDays * 86_400_000),
    })

    try {
      await this.mailer.sendOrganizationInvite(email, {
        organizationName: organization.name,
        inviterName: actor.name,
        roleName: input.role,
        acceptUrl: `${this.config.webUrl}/accept-invite?token=${token}`,
        expiresInDays: this.config.ttlDays,
      })
    } catch (error) {
      await this.invitations.deleteById(actor.organizationId, invitation.id)
      throw error
    }

    return InvitationMapper.toPending(invitation)
  }

  async listPending(organizationId: OrganizationId): Promise<PendingInvitation[]> {
    const pending = await this.invitations.listPending(organizationId)
    return pending.map((invitation) => InvitationMapper.toPending(invitation))
  }

  async revoke(organizationId: OrganizationId, id: InvitationId): Promise<void> {
    if (!(await this.invitations.deleteById(organizationId, id))) {
      throw new NotFoundError('Invitation', id)
    }
  }

  async preview(token: string): Promise<InvitationPreview> {
    const invitation = await this.requireOpen(token)
    const [organization, inviter] = await Promise.all([
      this.organizations.findById(invitation.organizationId),
      invitation.invitedBy ? this.identity.findUserById(invitation.invitedBy) : null,
    ])
    if (!organization) throw new NotFoundError('Invitation', 'token')
    return {
      organizationName: organization.name,
      inviterName: inviter?.name ?? null,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
    }
  }

  async accept(token: string, account: Account): Promise<MembershipContext> {
    const invitation = await this.requireOpen(token)
    if (normalizeEmail(account.email) !== invitation.email) {
      throw new ForbiddenError('This invitation was sent to a different email address.')
    }
    if (await this.organizations.findMember(invitation.organizationId, account.userId)) {
      throw new ConflictError('You are already a member of this organization.')
    }

    const membership = await this.uow.run(async (repos) => {
      await repos.organizations.addMember(
        invitation.organizationId,
        account.userId,
        invitation.role,
      )
      await repos.invitations.markAccepted(invitation.id)
      await repos.identity.setActiveOrganization(account.sessionId, invitation.organizationId)
      return repos.identity.findMembership(account.userId, invitation.organizationId)
    })
    if (!membership) throw new NotFoundError('Organization', invitation.organizationId)

    this.events.emit('invitation.accepted', {
      organizationId: invitation.organizationId,
      invitedBy: invitation.invitedBy,
      memberName: account.name,
      memberEmail: account.email,
    })
    return membership
  }

  private async requireOpen(token: string): Promise<Invitation> {
    const invitation = await this.invitations.findByTokenHash(hashToken(token))
    if (!invitation || invitation.acceptedAt) throw new NotFoundError('Invitation', 'token')
    if (invitation.expiresAt.getTime() < Date.now()) throw new InvitationExpiredError()
    return invitation
  }
}
