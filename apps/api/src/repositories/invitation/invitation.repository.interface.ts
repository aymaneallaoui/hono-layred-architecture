import type { InvitableRole } from '@/models/auth'
import type { InvitationId, OrganizationId, UserId } from '@/models/ids'
import type { Invitation } from '@/models/invitation'

export interface CreateInvitationRow {
  organizationId: OrganizationId
  email: string
  role: InvitableRole
  tokenHash: string
  invitedBy: UserId
  expiresAt: Date
}

export interface IInvitationRepository {
  create(input: CreateInvitationRow): Promise<Invitation>
  findPendingByEmail(organizationId: OrganizationId, email: string): Promise<Invitation | null>
  findByTokenHash(tokenHash: string): Promise<Invitation | null>
  listPending(organizationId: OrganizationId): Promise<Invitation[]>
  deleteById(organizationId: OrganizationId, id: InvitationId): Promise<boolean>
  markAccepted(id: InvitationId): Promise<void>
}
