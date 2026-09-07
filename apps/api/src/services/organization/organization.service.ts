import type { EventBus } from '@/infra/events'
import type { Logger } from '@/infra/logger'
import type { Account, Role } from '@/models/auth'
import { ForbiddenError, NotFoundError, SoleOwnerError } from '@/models/errors'
import type { OrganizationId, UserId } from '@/models/ids'
import type { Member, Organization, UpdateOrganizationInput } from '@/models/organization'
import type { IOrganizationRepository } from '@/repositories/organization/organization.repository.interface'
import type { IOrganizationService } from '@/services/organization/organization.service.interface'
import { BaseService } from '@/services/shared/base.service'

export class OrganizationService extends BaseService implements IOrganizationService {
  constructor(
    private readonly organizations: IOrganizationRepository,
    private readonly events: EventBus,
    logger: Logger,
  ) {
    super(logger)
  }

  async get(organizationId: OrganizationId): Promise<Organization> {
    return this.assertFound(
      await this.organizations.findById(organizationId),
      'Organization',
      organizationId,
    )
  }

  async update(
    organizationId: OrganizationId,
    input: UpdateOrganizationInput,
  ): Promise<Organization> {
    return this.assertFound(
      await this.organizations.update(organizationId, { name: input.name.trim() }),
      'Organization',
      organizationId,
    )
  }

  listMembers(organizationId: OrganizationId): Promise<Member[]> {
    return this.organizations.listMembers(organizationId)
  }

  async updateMemberRole(actor: Account, userId: UserId, role: Role): Promise<Member> {
    const member = await this.requireMember(actor.organizationId, userId)
    if (member.role === 'owner' && role !== 'owner') {
      await this.assertNotSoleOwner(actor.organizationId)
    }
    await this.organizations.updateMemberRole(actor.organizationId, userId, role)
    return { ...member, role }
  }

  async removeMember(actor: Account, userId: UserId): Promise<void> {
    const member = await this.requireMember(actor.organizationId, userId)
    if (member.role === 'owner') {
      if (actor.role !== 'owner') throw new ForbiddenError('Only an owner can remove an owner.')
      await this.assertNotSoleOwner(actor.organizationId)
    }
    const organization = await this.get(actor.organizationId)
    await this.organizations.removeMember(actor.organizationId, userId)
    this.events.emit('member.removed', {
      organizationId: actor.organizationId,
      organizationName: organization.name,
      userId,
    })
  }

  private async requireMember(organizationId: OrganizationId, userId: UserId): Promise<Member> {
    const member = await this.organizations.findMember(organizationId, userId)
    if (!member) throw new NotFoundError('Member', userId)
    return member
  }

  private async assertNotSoleOwner(organizationId: OrganizationId): Promise<void> {
    if ((await this.organizations.countOwners(organizationId)) <= 1) throw new SoleOwnerError()
  }
}
