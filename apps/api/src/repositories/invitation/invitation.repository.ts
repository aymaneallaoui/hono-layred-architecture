import { InvitationMapper } from '@/mappers/invitation.mapper'
import type { InvitationId, OrganizationId } from '@/models/ids'
import type { Invitation } from '@/models/invitation'
import type {
  CreateInvitationRow,
  IInvitationRepository,
} from '@/repositories/invitation/invitation.repository.interface'
import { BaseRepository } from '@/repositories/shared/base.repository'

export class InvitationRepository extends BaseRepository implements IInvitationRepository {
  async create(input: CreateInvitationRow): Promise<Invitation> {
    const row = await this.db
      .insertInto('invitation')
      .values(InvitationMapper.toInsertRow(input))
      .returningAll()
      .executeTakeFirstOrThrow()
    return InvitationMapper.toDomain(row)
  }

  async findPendingByEmail(
    organizationId: OrganizationId,
    email: string,
  ): Promise<Invitation | null> {
    const row = await this.db
      .selectFrom('invitation')
      .selectAll()
      .where('organization_id', '=', organizationId)
      .where('email', '=', email)
      .where('accepted_at', 'is', null)
      .where('expires_at', '>', new Date())
      .executeTakeFirst()
    return row ? InvitationMapper.toDomain(row) : null
  }

  async findByTokenHash(tokenHash: string): Promise<Invitation | null> {
    const row = await this.db
      .selectFrom('invitation')
      .selectAll()
      .where('token_hash', '=', tokenHash)
      .executeTakeFirst()
    return row ? InvitationMapper.toDomain(row) : null
  }

  async listPending(organizationId: OrganizationId): Promise<Invitation[]> {
    const rows = await this.db
      .selectFrom('invitation')
      .selectAll()
      .where('organization_id', '=', organizationId)
      .where('accepted_at', 'is', null)
      .where('expires_at', '>', new Date())
      .orderBy('created_at', 'desc')
      .execute()
    return InvitationMapper.toDomainList(rows)
  }

  async deleteById(organizationId: OrganizationId, id: InvitationId): Promise<boolean> {
    const result = await this.db
      .deleteFrom('invitation')
      .where('organization_id', '=', organizationId)
      .where('id', '=', id)
      .executeTakeFirst()
    return Number(result.numDeletedRows) > 0
  }

  async markAccepted(id: InvitationId): Promise<void> {
    await this.db
      .updateTable('invitation')
      .set({ accepted_at: new Date() })
      .where('id', '=', id)
      .execute()
  }
}
