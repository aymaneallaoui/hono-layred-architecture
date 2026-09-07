import { uuidv7 } from 'uuidv7'

import { OrganizationMapper } from '@/mappers/organization.mapper'
import type { Role } from '@/models/auth'
import { asId, type OrganizationId, type UserId } from '@/models/ids'
import type { Member, Organization, UpdateOrganizationInput } from '@/models/organization'
import type { IOrganizationRepository } from '@/repositories/organization/organization.repository.interface'
import { BaseRepository } from '@/repositories/shared/base.repository'

const memberSelect = [
  'membership.user_id',
  'membership.role',
  'membership.created_at',
  'app_user.email',
  'app_user.name',
] as const

function toMember(row: {
  user_id: string
  role: string
  created_at: Date
  email: string
  name: string
}): Member {
  return {
    userId: asId<UserId>(row.user_id),
    email: row.email,
    name: row.name,
    role: row.role as Role,
    joinedAt: row.created_at,
  }
}

export class OrganizationRepository extends BaseRepository implements IOrganizationRepository {
  async findById(id: OrganizationId): Promise<Organization | null> {
    const row = await this.db
      .selectFrom('organization')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()
    return row ? OrganizationMapper.toDomain(row) : null
  }

  async update(id: OrganizationId, input: UpdateOrganizationInput): Promise<Organization | null> {
    const row = await this.db
      .updateTable('organization')
      .set({ name: input.name })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst()
    return row ? OrganizationMapper.toDomain(row) : null
  }

  async listMembers(organizationId: OrganizationId): Promise<Member[]> {
    const rows = await this.db
      .selectFrom('membership')
      .innerJoin('app_user', 'app_user.id', 'membership.user_id')
      .select(memberSelect)
      .where('membership.organization_id', '=', organizationId)
      .orderBy('membership.created_at', 'asc')
      .execute()
    return rows.map(toMember)
  }

  async findMember(organizationId: OrganizationId, userId: UserId): Promise<Member | null> {
    const row = await this.db
      .selectFrom('membership')
      .innerJoin('app_user', 'app_user.id', 'membership.user_id')
      .select(memberSelect)
      .where('membership.organization_id', '=', organizationId)
      .where('membership.user_id', '=', userId)
      .executeTakeFirst()
    return row ? toMember(row) : null
  }

  async countOwners(organizationId: OrganizationId): Promise<number> {
    const row = await this.db
      .selectFrom('membership')
      .select((eb) => eb.fn.countAll<number>().as('n'))
      .where('organization_id', '=', organizationId)
      .where('role', '=', 'owner')
      .executeTakeFirstOrThrow()
    return Number(row.n)
  }

  async addMember(organizationId: OrganizationId, userId: UserId, role: Role): Promise<void> {
    await this.db
      .insertInto('membership')
      .values({ id: uuidv7(), organization_id: organizationId, user_id: userId, role })
      .execute()
  }

  async updateMemberRole(
    organizationId: OrganizationId,
    userId: UserId,
    role: Role,
  ): Promise<boolean> {
    const result = await this.db
      .updateTable('membership')
      .set({ role })
      .where('organization_id', '=', organizationId)
      .where('user_id', '=', userId)
      .executeTakeFirst()
    return Number(result.numUpdatedRows) > 0
  }

  async removeMember(organizationId: OrganizationId, userId: UserId): Promise<boolean> {
    const result = await this.db
      .deleteFrom('membership')
      .where('organization_id', '=', organizationId)
      .where('user_id', '=', userId)
      .executeTakeFirst()
    return Number(result.numDeletedRows) > 0
  }
}
