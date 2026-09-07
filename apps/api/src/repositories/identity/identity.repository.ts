import { uuidv7 } from 'uuidv7'

import { OrganizationMapper } from '@/mappers/organization.mapper'
import { UserMapper } from '@/mappers/user.mapper'
import type { MembershipContext, Role, User } from '@/models/auth'
import { asId, type OrganizationId, type UserId } from '@/models/ids'
import type {
  IIdentityRepository,
  SeedTenantInput,
} from '@/repositories/identity/identity.repository.interface'
import { BaseRepository } from '@/repositories/shared/base.repository'

const membershipSelect = [
  'organization.id',
  'organization.name',
  'organization.slug',
  'membership.role',
] as const

function toContext(row: { id: string; name: string; slug: string; role: string }) {
  return {
    id: asId<OrganizationId>(row.id),
    name: row.name,
    slug: row.slug,
    role: row.role as Role,
  }
}

export class IdentityRepository extends BaseRepository implements IIdentityRepository {
  async findUserById(id: UserId): Promise<User | null> {
    const row = await this.db
      .selectFrom('app_user')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()
    return row ? UserMapper.toDomain(row) : null
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const row = await this.db
      .selectFrom('app_user')
      .selectAll()
      .where('email', '=', email)
      .executeTakeFirst()
    return row ? UserMapper.toDomain(row) : null
  }

  async updateUser(id: UserId, input: { name: string }): Promise<User | null> {
    const row = await this.db
      .updateTable('app_user')
      .set({ name: input.name, updated_at: new Date() })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst()
    return row ? UserMapper.toDomain(row) : null
  }

  async findMembership(
    userId: UserId,
    organizationId: OrganizationId,
  ): Promise<MembershipContext | null> {
    const row = await this.db
      .selectFrom('membership')
      .innerJoin('organization', 'organization.id', 'membership.organization_id')
      .select(membershipSelect)
      .where('membership.user_id', '=', userId)
      .where('membership.organization_id', '=', organizationId)
      .executeTakeFirst()
    return row ? toContext(row) : null
  }

  async findPrimaryMembership(userId: UserId): Promise<MembershipContext | null> {
    const row = await this.db
      .selectFrom('membership')
      .innerJoin('organization', 'organization.id', 'membership.organization_id')
      .select(membershipSelect)
      .where('membership.user_id', '=', userId)
      .orderBy('membership.created_at', 'asc')
      .executeTakeFirst()
    return row ? toContext(row) : null
  }

  async listMemberships(userId: UserId): Promise<MembershipContext[]> {
    const rows = await this.db
      .selectFrom('membership')
      .innerJoin('organization', 'organization.id', 'membership.organization_id')
      .select(membershipSelect)
      .where('membership.user_id', '=', userId)
      .orderBy('membership.created_at', 'asc')
      .execute()
    return rows.map(toContext)
  }

  async setActiveOrganization(sessionId: string, organizationId: OrganizationId): Promise<void> {
    await this.db
      .updateTable('session')
      .set({ active_organization_id: organizationId })
      .where('id', '=', sessionId)
      .execute()
  }

  async seedTenant(input: SeedTenantInput): Promise<MembershipContext | null> {
    return this.db.transaction().execute(async (trx) => {
      const claimed = await trx
        .updateTable('app_user')
        .set({ tenant_seeded_at: new Date() })
        .where('id', '=', input.userId)
        .where('tenant_seeded_at', 'is', null)
        .returning('id')
        .executeTakeFirst()
      if (!claimed) return null

      const organization = await trx
        .insertInto('organization')
        .values(OrganizationMapper.toInsertRow({ name: input.organizationName, slug: input.slug }))
        .returningAll()
        .executeTakeFirstOrThrow()
      await trx
        .insertInto('membership')
        .values({
          id: uuidv7(),
          organization_id: organization.id,
          user_id: input.userId,
          role: 'owner',
        })
        .execute()
      return toContext({ ...organization, role: 'owner' })
    })
  }
}
