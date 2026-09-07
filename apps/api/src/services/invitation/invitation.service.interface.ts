import type { Account, MembershipContext } from '@/models/auth'
import type { InvitationId, OrganizationId } from '@/models/ids'
import type {
  CreateInvitationInput,
  InvitationPreview,
  PendingInvitation,
} from '@/models/invitation'

export interface IInvitationService {
  invite(actor: Account, input: CreateInvitationInput): Promise<PendingInvitation>
  listPending(organizationId: OrganizationId): Promise<PendingInvitation[]>
  revoke(organizationId: OrganizationId, id: InvitationId): Promise<void>
  preview(token: string): Promise<InvitationPreview>
  accept(token: string, account: Account): Promise<MembershipContext>
}
