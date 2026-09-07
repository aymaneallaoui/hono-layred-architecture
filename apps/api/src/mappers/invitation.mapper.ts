import { uuidv7 } from 'uuidv7'

import type { InvitationRow, NewInvitationRow } from '@/infra/types'
import type { Mapper } from '@/mappers/shared/mapper'
import type { InvitableRole } from '@/models/auth'
import { asId, type InvitationId, type OrganizationId, type UserId } from '@/models/ids'
import type { Invitation, PendingInvitation } from '@/models/invitation'

export class InvitationMapper {
  static toDomain(row: InvitationRow): Invitation {
    return {
      id: asId<InvitationId>(row.id),
      organizationId: asId<OrganizationId>(row.organization_id),
      email: row.email,
      role: row.role as InvitableRole,
      invitedBy: row.invited_by ? asId<UserId>(row.invited_by) : null,
      expiresAt: row.expires_at,
      acceptedAt: row.accepted_at,
      createdAt: row.created_at,
    }
  }

  static toDomainList(rows: readonly InvitationRow[]): Invitation[] {
    return rows.map((row) => InvitationMapper.toDomain(row))
  }

  static toPending(invitation: Invitation): PendingInvitation {
    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
    }
  }

  static toInsertRow(input: {
    organizationId: OrganizationId
    email: string
    role: InvitableRole
    tokenHash: string
    invitedBy: UserId
    expiresAt: Date
  }): NewInvitationRow {
    return {
      id: uuidv7(),
      organization_id: input.organizationId,
      email: input.email,
      role: input.role,
      token_hash: input.tokenHash,
      invited_by: input.invitedBy,
      expires_at: input.expiresAt,
      accepted_at: null,
    }
  }
}

InvitationMapper satisfies Mapper<InvitationRow, Invitation>
